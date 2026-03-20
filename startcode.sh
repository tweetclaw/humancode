#!/usr/bin/env bash

set -e

cd "$(dirname "$0")"

env -i HOME="$HOME" USER="$USER" SHELL="$SHELL" TMPDIR="$TMPDIR" \
PATH="/usr/local/opt/node@22/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin" \
LANG="${LANG:-en_US.UTF-8}" \
./scripts/code.sh --user-data-dir /tmp/vscode-dev-user-data --extensions-dir /tmp/vscode-dev-extensions
