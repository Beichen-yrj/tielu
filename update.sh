#!/usr/bin/env bash
set -Eeuo pipefail
umask 022
export TZ=Asia/Shanghai

APP_DIR=/opt/rail-safety/daima
WEB_DIR=/var/www/rail-safety
BRANCH=main
SERVICE=rail-safety-api
SSH_KEY=/opt/rail-safety/.ssh/id_ed25519
API_URL=http://127.0.0.1:8000/api/health
STAGE_DIR=
ACTIVATING=0

fail() { printf 'ERROR: %s\n' "$*" >&2; return 1; }
as_app() { sudo -H -u railapp "$@"; }
git_app() { as_app env GIT_SSH_COMMAND="ssh -i $SSH_KEY -o BatchMode=yes" git -C "$APP_DIR" "$@"; }
on_error() {
    local code=$?
    trap - ERR
    printf 'Update FAILED (exit %s). Backup and build files have been kept.\n' "$code" >&2
    if [[ $ACTIVATING == 1 ]]; then
        printf 'Failure occurred during deployment; check API status and use the backup for recovery.\n' >&2
    else
        printf 'Deployment did not start; the running service and published frontend were not replaced.\n' >&2
    fi
    [[ -z "$STAGE_DIR" ]] || printf 'Build directory: %s\n' "$STAGE_DIR" >&2
    exit "$code"
}
trap on_error ERR

[[ $# -eq 0 ]] || fail 'Usage: sudo bash update.sh'
[[ $EUID -eq 0 ]] || fail 'Run with sudo or as root.'
for cmd in git sudo npm node python3 rsync systemctl nginx curl flock realpath sha256sum mktemp tar grep; do
    command -v "$cmd" >/dev/null || fail "Missing command: $cmd"
done
[[ -d "$APP_DIR/.git" && -f "$APP_DIR/backup.sh" ]] || fail 'Project or backup.sh not found.'
[[ -f "$APP_DIR/backend/.env" && -x "$APP_DIR/backend/.venv/bin/python" ]] || fail 'Production .env or Python venv not found.'
[[ $(realpath "$APP_DIR") == "$APP_DIR" && $(realpath "$WEB_DIR") == "$WEB_DIR" ]] || fail 'Deployment paths must not be symlinks.'
[[ -f "$WEB_DIR/index.html" ]] || fail 'Existing frontend index.html not found.'
[[ -r "$SSH_KEY" ]] || fail 'GitHub SSH key not found.'
node -e 'const [a,b]=process.versions.node.split(".").map(Number);process.exit((a===20&&b>=19)||(a===22&&b>=12)||a>22?0:1)' \
    || fail 'Node 20.19+ or 22.12+ is required.'
exec 8>/run/lock/rail-safety-update.lock
flock -n 8 || fail 'Another update is running.'
[[ $(git_app branch --show-current) == "$BRANCH" ]] || fail 'The deployment checkout must be on main.'
[[ -z $(git_app status --porcelain) ]] || fail 'Checkout has local changes. Commit or resolve them before updating.'
if git_app ls-files --error-unmatch backend/.env >/dev/null 2>&1; then
    fail 'Production .env must not be tracked by Git.'
fi
nginx -t
OLD_COMMIT=$(git_app rev-parse HEAD)
ENV_HASH=$(sha256sum "$APP_DIR/backend/.env")

printf '[1/6] Back up database, credentials, source and frontend\n'
bash "$APP_DIR/backup.sh"
# Keep standalone backups out of the code/dependency publication window.
exec 9>/run/lock/rail-safety-backup.lock
flock -n 9 || fail 'Another backup started; retry the update after it finishes.'
printf '[2/6] Fetch the latest GitHub main\n'
git_app fetch origin "$BRANCH"
NEW_COMMIT=$(git_app rev-parse FETCH_HEAD)
git_app merge-base --is-ancestor "$OLD_COMMIT" "$NEW_COMMIT" \
    || fail 'GitHub main diverged from this checkout; no forced reset will be performed.'
if git_app ls-tree -r --name-only "$NEW_COMMIT" -- backend/.env | grep -q .; then
    fail 'GitHub commit tracks backend/.env; refusing to overwrite production configuration.'
fi

# Build the fetched commit away from the live checkout before deployment.
printf '[3/6] Install frontend dependencies and build fetched code\n'
STAGE_DIR=$(mktemp -d /opt/rail-safety/build-XXXXXXXX)
chown railapp:railapp "$STAGE_DIR"
git_app archive "$NEW_COMMIT" | as_app tar -x -C "$STAGE_DIR"
(
    cd "$STAGE_DIR"
    as_app npm ci --include=dev
    as_app env VITE_API_BASE_URL=/api npm run build
)
[[ -s "$STAGE_DIR/dist/index.html" ]] || fail 'Build did not produce index.html.'
[[ -f "$STAGE_DIR/backend/requirements.txt" ]] || fail 'Fetched code has no backend requirements.'

printf '[4/6] Stop API, fast-forward code and install backend dependencies\n'
ACTIVATING=1
systemctl stop "$SERVICE"
git_app merge --ff-only "$NEW_COMMIT"
[[ $(sha256sum "$APP_DIR/backend/.env") == "$ENV_HASH" ]] || fail 'Production .env changed during update.'
as_app "$APP_DIR/backend/.venv/bin/python" -m pip install -r "$APP_DIR/backend/requirements.txt"
as_app "$APP_DIR/backend/.venv/bin/python" -m pip check

printf '[5/6] Start API and check database connectivity\n'
systemctl start "$SERVICE"
healthy=0
for ((attempt=1; attempt<=30; attempt++)); do
    if curl --fail --silent --max-time 3 "$API_URL" | python3 -c \
        'import json,sys; d=json.load(sys.stdin); sys.exit(0 if d.get("status")=="ok" and d.get("database")=="connected" else 1)' \
        >/dev/null 2>&1; then
        healthy=1
        break
    fi
    sleep 2
done
[[ $healthy == 1 ]] || fail 'API health check failed. Inspect: journalctl -u rail-safety-api -n 60 --no-pager'

printf '[6/6] Publish the built frontend\n'
rsync -a --delete --chown=www-data:www-data --chmod=D755,F644 "$STAGE_DIR/dist/" "$WEB_DIR/"
systemctl is-active --quiet "$SERVICE"
trap - ERR
printf 'Update complete: %s -> %s\nBuild files kept at: %s\n' "$OLD_COMMIT" "$NEW_COMMIT" "$STAGE_DIR"
printf 'Production .env, administrator accounts and business data were preserved.\n'
