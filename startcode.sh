#!/usr/bin/env bash

set -e

cd "$(dirname "$0")"

# Clear the log file before starting
> 1.log

env -i HOME="$HOME" USER="$USER" SHELL="$SHELL" TMPDIR="$TMPDIR" \
PATH="/usr/local/opt/node@22/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin" \
LANG="${LANG:-en_US.UTF-8}" \
./scripts/code.sh --log info --user-data-dir /tmp/vscode-dev-user-data --extensions-dir /tmp/vscode-dev-extensions 2>&1 | tee 1.log | grep --line-buffered -E "\[Controller\]|\[Worker\]|\[TestAiInterop\]|ERR |ERROR|FATAL|Test completed"
