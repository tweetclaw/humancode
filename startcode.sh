#!/usr/bin/env bash

set -e

cd "$(dirname "$0")"

env -i HOME="$HOME" USER="$USER" SHELL="$SHELL" TMPDIR="$TMPDIR" \
PATH="/usr/local/opt/node@22/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin" \
LANG="${LANG:-en_US.UTF-8}" \
./scripts/code.sh --log error --user-data-dir /tmp/vscode-dev-user-data --extensions-dir /tmp/vscode-dev-extensions 2>&1 | grep --line-buffered -vE "ResizeObserver|geminicodeassist|client not ready|DEBUGGING:|LoadCodeAssistResponse|service/healthcheck"
