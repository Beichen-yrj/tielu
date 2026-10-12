#!/usr/bin/env bash
set -eu
name=$(basename "$0")
case "$name" in
    sudo)
        [[ ${1:-} != -H ]] || shift
        [[ ${1:-} != -u ]] || shift 2
        exec "$@"
        ;;
    mysql) printf '5\n' ;;
    mysqldump)
        printf 'CREATE DATABASE rail_safety;\n'
        [[ ! -f "$RAIL_TEST_ROOT/fail-dump" ]] || exit 7
        printf 'INSERT INTO users VALUES (1);\n'
        ;;
    npm)
        printf 'npm %s\n' "$*" >> "$RAIL_TEST_ROOT/commands.log"
        [[ $1 != run ]] || {
            [[ ! -f "$RAIL_TEST_ROOT/fail-build" ]] || exit 8
            mkdir -p dist
            cp version.txt dist/index.html
        }
        ;;
    python)
        printf 'venv %s\n' "$*" >> "$RAIL_TEST_ROOT/commands.log"
        [[ ! -f "$RAIL_TEST_ROOT/fail-pip" ]] || exit 9
        ;;
    node|chown|sleep) exit 0 ;;
    systemctl|nginx)
        printf '%s %s\n' "$name" "$*" >> "$RAIL_TEST_ROOT/commands.log"
        ;;
    curl)
        [[ ! -f "$RAIL_TEST_ROOT/fail-health" ]] || exit 22
        printf '{"status":"ok","database":"connected"}\n'
        ;;
    rsync)
        # Use real file synchronization; ownership is irrelevant in the fixture.
        exec /usr/bin/rsync -a --delete "${@: -2}"
        ;;
    *) printf 'Unexpected mock: %s\n' "$name" >&2; exit 1 ;;
esac
