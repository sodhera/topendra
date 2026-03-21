#!/usr/bin/env bash
set -euo pipefail

LOCAL_NODE_DIR="$HOME/.local/node-v24.14.0-darwin-arm64/bin"

if [ -d "$LOCAL_NODE_DIR" ]; then
  export PATH="$LOCAL_NODE_DIR:$PATH"
fi

exec "$@"
