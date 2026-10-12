#!/usr/bin/env bash
set -Eeuo pipefail
# Run as root in an isolated Linux environment. All deployment paths are rewritten
# in temporary fixture copies; Git, tar, gzip and checksums are real.
[[ $EUID -eq 0 ]] || { printf 'Run this fixture as root in Linux.\n' >&2; exit 1; }
SOURCE=$(cd "$(dirname "$0")/.." && pwd)
export RAIL_TEST_ROOT
RAIL_TEST_ROOT=$(mktemp -d /tmp/rail-operations-test-XXXXXXXX)
printf 'Fixture directory: %s\n' "$RAIL_TEST_ROOT"
APP="$RAIL_TEST_ROOT/app"
WEB="$RAIL_TEST_ROOT/web"
BACKUPS="$RAIL_TEST_ROOT/backups"
mkdir -p "$APP/backend/.venv/bin" "$WEB" "$RAIL_TEST_ROOT/bin"
for cmd in sudo mysql mysqldump npm node python systemctl nginx curl rsync chown sleep; do
    ln -s "$SOURCE/tests/fixtures/operations-command.sh" "$RAIL_TEST_ROOT/bin/$cmd"
done
chmod +x "$SOURCE/tests/fixtures/operations-command.sh"
export PATH="$RAIL_TEST_ROOT/bin:$PATH"
ln -s "$SOURCE/tests/fixtures/operations-command.sh" "$APP/backend/.venv/bin/python"
cp "$SOURCE/.gitignore" "$APP/.gitignore"
touch "$APP/backend/requirements.txt" "$RAIL_TEST_ROOT/key"
printf 'production-secret\n' > "$APP/backend/.env"
printf 'old\n' > "$APP/version.txt"
printf 'old\n' > "$WEB/index.html"
printf 'old stale asset\n' > "$WEB/stale.js"
for script in backup.sh update.sh; do
    sed -e "s|/opt/rail-safety/daima|$APP|g" \
        -e "s|/var/www/rail-safety|$WEB|g" \
        -e "s|/opt/backups/rail-safety|$BACKUPS|g" \
        -e "s|/opt/rail-safety/.ssh/id_ed25519|$RAIL_TEST_ROOT/key|g" \
        -e "s|/opt/rail-safety/build-|$RAIL_TEST_ROOT/build-|g" \
        -e "s|/run/lock/rail-safety-|$RAIL_TEST_ROOT/lock-|g" \
        "$SOURCE/$script" > "$APP/$script"
done
git init -q -b main "$APP"
git -C "$APP" config user.email fixture@example.invalid
git -C "$APP" config user.name Fixture
git -C "$APP" add .
git -C "$APP" commit -qm initial
git clone -q --bare "$APP" "$RAIL_TEST_ROOT/remote.git"
git -C "$APP" remote add origin "$RAIL_TEST_ROOT/remote.git"
git clone -q "$RAIL_TEST_ROOT/remote.git" "$RAIL_TEST_ROOT/author"
git -C "$RAIL_TEST_ROOT/author" config user.email fixture@example.invalid
git -C "$RAIL_TEST_ROOT/author" config user.name Fixture
printf 'new\n' > "$RAIL_TEST_ROOT/author/version.txt"
git -C "$RAIL_TEST_ROOT/author" add version.txt
git -C "$RAIL_TEST_ROOT/author" commit -qm update
git -C "$RAIL_TEST_ROOT/author" push -q origin main

bash "$APP/backup.sh" > "$RAIL_TEST_ROOT/backup.log" 2>&1
snapshot=$(find "$BACKUPS" -name COMPLETE -printf '%h\n' | head -n 1)
[[ -n "$snapshot" ]]
(cd "$snapshot" && sha256sum -c SHA256SUMS >/dev/null)
[[ $(gzip -dc "$snapshot/database.sql.gz") == *'INSERT INTO users'* ]]
[[ $(cat "$snapshot/backend.env") == production-secret ]]
printf 'PASS: complete backup, account dump, credentials and checksums\n'

touch "$RAIL_TEST_ROOT/fail-dump"
if bash "$APP/backup.sh" > "$RAIL_TEST_ROOT/dump-failure.log" 2>&1; then exit 1; fi
[[ $(find "$BACKUPS" -name COMPLETE | wc -l) -eq 1 ]]
rm "$RAIL_TEST_ROOT/fail-dump"
printf 'PASS: failed dump cannot be reported as a complete backup\n'

touch "$RAIL_TEST_ROOT/fail-build"
if bash "$APP/update.sh" > "$RAIL_TEST_ROOT/build-failure.log" 2>&1; then exit 1; fi
[[ $(cat "$WEB/index.html") == old ]]
[[ $(cat "$APP/version.txt") == old ]]
! grep -q 'systemctl stop' "$RAIL_TEST_ROOT/commands.log"
rm "$RAIL_TEST_ROOT/fail-build"
printf 'PASS: failed build preserves running checkout and published frontend\n'

bash "$APP/update.sh" > "$RAIL_TEST_ROOT/update.log" 2>&1
[[ $(cat "$WEB/index.html") == new && $(cat "$APP/version.txt") == new ]]
[[ ! -e "$WEB/stale.js" ]]
[[ $(cat "$APP/backend/.env") == production-secret ]]
[[ $(git -C "$APP" rev-parse HEAD) == $(git -C "$RAIL_TEST_ROOT/author" rev-parse HEAD) ]]
grep -q 'systemctl start rail-safety-api' "$RAIL_TEST_ROOT/commands.log"
printf 'PASS: GitHub update, dependency workflow, health check and frontend publication\n'

printf 'local edit\n' >> "$APP/version.txt"
if bash "$APP/update.sh" > "$RAIL_TEST_ROOT/dirty-failure.log" 2>&1; then exit 1; fi
[[ $(cat "$WEB/index.html") == new ]]
printf 'PASS: dirty checkout is rejected without replacing published files\n'

# Only restore the test-owned synthetic file after the dirty-check scenario.
git -C "$APP" restore version.txt
printf 'next\n' > "$RAIL_TEST_ROOT/author/version.txt"
git -C "$RAIL_TEST_ROOT/author" add version.txt
git -C "$RAIL_TEST_ROOT/author" commit -qm next
git -C "$RAIL_TEST_ROOT/author" push -q origin main
touch "$RAIL_TEST_ROOT/fail-pip"
if bash "$APP/update.sh" > "$RAIL_TEST_ROOT/pip-failure.log" 2>&1; then exit 1; fi
[[ $(cat "$WEB/index.html") == new ]]
grep -q 'Failure occurred during deployment' "$RAIL_TEST_ROOT/pip-failure.log"
rm "$RAIL_TEST_ROOT/fail-pip"
printf 'PASS: failed backend install preserves frontend and reports deployment failure\n'

touch "$RAIL_TEST_ROOT/fail-health"
if bash "$APP/update.sh" > "$RAIL_TEST_ROOT/health-failure.log" 2>&1; then exit 1; fi
[[ $(cat "$WEB/index.html") == new ]]
grep -q 'API health check failed' "$RAIL_TEST_ROOT/health-failure.log"
rm "$RAIL_TEST_ROOT/fail-health"
printf 'PASS: failed API health check blocks new frontend publication\n'
printf 'All operations fixtures passed. Logs retained at %s\n' "$RAIL_TEST_ROOT"
