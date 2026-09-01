#!/usr/bin/env sh
# Regenerate install.sh.sha256 next to install.sh (committed artifact).
# Usage: ./bin/write-install-checksum.sh
set -eu
ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
cd "$ROOT"
need_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "error: $1 is required" >&2
    exit 1
  fi
}
need_cmd sha256sum
sha256sum install.sh | awk '{print $1}' > install.sh.sha256
echo "Wrote install.sh.sha256 ($(cat install.sh.sha256))"
