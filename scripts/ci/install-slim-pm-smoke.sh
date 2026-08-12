#!/usr/bin/env bash
set -euo pipefail

# Install slim-layout tarballs for yarn/pnpm/bun smoke tests.
#
# Usage (from directory containing .tgz files):
#   PREBUILD_TAG=linux-x64 scripts/ci/install-slim-pm-smoke.sh yarn|pnpm|bun
#
# yarn/pnpm/bun must not use bare "add file:..." on the main tarball — aerospike
# optionalDependencies confuse them into pulling wrong @aerospike/prebuild-* packages.

usage () {
  echo "usage: PREBUILD_TAG=<platform> $0 yarn|pnpm|bun" >&2
  exit 1
}

[[ $# -eq 1 ]] || usage
PM=$1

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/select-slim-tarballs.sh"
select_slim_tarballs

if [[ -z "${PREBUILD_TAG:-}" ]]; then
  PREBUILD_TAG="$(
    basename "$PREBUILD_TGZ" \
      | sed -E 's/^@?aerospike-prebuild-(.+)-[0-9]+\.[0-9]+\.[0-9]+\.tgz$/\1/'
  )"
fi

PREBUILD_PKG="@aerospike/prebuild-${PREBUILD_TAG}"

cat > package.json <<EOF
{
  "private": true,
  "dependencies": {
    "aerospike": "file:./${MAIN_TGZ}",
    "${PREBUILD_PKG}": "file:./${PREBUILD_TGZ}"
  }
}
EOF

echo "install-slim-pm-smoke: pm=${PM} main=${MAIN_TGZ} ${PREBUILD_PKG}=${PREBUILD_TGZ}" >&2

case "$PM" in
  yarn)
    yarn install --ignore-optional --ignore-scripts
    ;;
  pnpm)
    pnpm install --ignore-scripts --config.optional=false
    ;;
  bun)
    bun install --ignore-scripts
    ;;
  *)
    usage
    ;;
esac

(
  cd node_modules/aerospike
  node scripts/verify-prebuild-smoke.js
)
