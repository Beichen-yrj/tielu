#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
export TZ=Asia/Shanghai

APP_DIR=/opt/rail-safety/daima
WEB_DIR=/var/www/rail-safety
BACKUP_ROOT=/opt/backups/rail-safety
DB_NAME=rail_safety

fail() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }
[[ $# -eq 0 ]] || fail 'Usage: sudo bash backup.sh'
[[ $EUID -eq 0 ]] || fail 'Run with sudo or as root.'
for cmd in mysqldump mysql tar gzip sha256sum flock mktemp realpath git sudo; do
    command -v "$cmd" >/dev/null || fail "Missing command: $cmd"
done
[[ -d "$APP_DIR/.git" && -f "$APP_DIR/backend/.env" ]] || fail 'Project or production .env not found.'
[[ $(realpath "$APP_DIR") == "$APP_DIR" ]] || fail 'Project path must not be a symlink.'
mkdir -p "$BACKUP_ROOT"
[[ $(realpath "$BACKUP_ROOT") == "$BACKUP_ROOT" ]] || fail 'Backup path must not be a symlink.'
chmod 700 "$BACKUP_ROOT"
exec 9>/run/lock/rail-safety-backup.lock
flock -n 9 || fail 'Another backup is running.'

BACKUP_DIR=$(mktemp -d "$BACKUP_ROOT/rail-safety_$(date +%Y%m%d_%H%M%S)_XXXXXX")
trap 'printf "Backup FAILED; incomplete files kept at: %s\n" "$BACKUP_DIR" >&2' ERR
printf 'Backing up rail_safety to %s\n' "$BACKUP_DIR"

# Ubuntu MySQL root socket authentication avoids passwords in arguments or scripts.
mysql --user=root --protocol=socket --batch --skip-column-names \
    --execute="SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$DB_NAME';" \
    > "$BACKUP_DIR/table-count.txt"
[[ $(<"$BACKUP_DIR/table-count.txt") -gt 0 ]] || fail 'Database has no tables; refusing an empty backup.'
mysqldump --user=root --protocol=socket --single-transaction --quick \
    --routines --events --triggers --hex-blob --no-tablespaces \
    --set-gtid-purged=OFF --default-character-set=utf8mb4 --databases "$DB_NAME" \
    | gzip -c > "$BACKUP_DIR/database.sql.gz.partial"
gzip -t "$BACKUP_DIR/database.sql.gz.partial"
mv "$BACKUP_DIR/database.sql.gz.partial" "$BACKUP_DIR/database.sql.gz"

tar --exclude='./.git' --exclude='./node_modules' --exclude='./dist' \
    --exclude='./backend/.venv' --exclude='./backend/.env' \
    --exclude='__pycache__' --exclude='.pytest_cache' --exclude='./logs' \
    -czf "$BACKUP_DIR/source.tar.gz" -C "$APP_DIR" .
cp "$APP_DIR/backend/.env" "$BACKUP_DIR/backend.env"
if [[ -d "$WEB_DIR" ]]; then
    tar -czf "$BACKUP_DIR/web.tar.gz" -C "$WEB_DIR" .
fi
configs=()
for path in etc/systemd/system/rail-safety-api.service etc/nginx/sites-available/rail-safety; do
    [[ ! -f "/$path" ]] || configs+=("$path")
done
if (( ${#configs[@]} > 0 )); then
    tar -czf "$BACKUP_DIR/deployment.tar.gz" -C / "${configs[@]}"
fi
{
    printf 'created_at=%s\ndatabase=%s\n' "$(date --iso-8601=seconds)" "$DB_NAME"
    printf 'commit=%s\n' "$(sudo -H -u railapp git -C "$APP_DIR" rev-parse HEAD)"
    printf 'branch=%s\n' "$(sudo -H -u railapp git -C "$APP_DIR" branch --show-current)"
} > "$BACKUP_DIR/metadata.txt"
for archive in "$BACKUP_DIR"/*.tar.gz; do tar -tzf "$archive" >/dev/null; done
(
    cd "$BACKUP_DIR"
    sha256sum -- * > SHA256SUMS
    sha256sum --check SHA256SUMS >/dev/null
)
touch "$BACKUP_DIR/COMPLETE"
trap - ERR
printf 'Backup complete: %s\nContains credentials; keep private. No old backups were deleted.\n' "$BACKUP_DIR"
