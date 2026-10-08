#!/usr/bin/env bash
# Lists TypeScript source files longer than the limit (default 250 lines). Exits 1 if any are found.
set -euo pipefail
limit="${1:-250}"
cd "$(dirname "$0")/.."
over=$(find mobile/src mobile/App.tsx web/src functions/src shared -name '*.ts' -o -name '*.tsx' | grep -v '\.d\.ts$' | xargs wc -l | awk -v max="$limit" '$2 != "total" && $1 > max')
if [ -n "$over" ]; then
  echo "Files over $limit lines:"
  echo "$over"
  exit 1
fi
echo "All files are at most $limit lines."
