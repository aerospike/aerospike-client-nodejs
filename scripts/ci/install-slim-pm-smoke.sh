#!/usr/bin/env bash
set -euo pipefail

# Install slim-layout tarballs for yarn/pnpm/bun smoke tests.
#
# Usage (from directory containing .tgz files):
#   PREBUILD_TAG=linux-x64 scripts/ci/install-slim-pm-smoke.sh yarn|pnpm|bun
#
# The main aerospike tarball declares optionalDependencies for every platform
# prebuild. Yarn 1 --ignore-optional only skips root optional deps, so yarn
# still tries to fetch @aerospike/prebuild-* from the registry when installing
# file:./aerospike-*.tgz. Strip optionalDependencies from an extracted copy of
# the main package and install that directory plus the platform prebuild file.

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
SLIM_MAIN_DIR=".slim-main-pkg"

prepare_slim_main_package () {
  rm -rf "$SLIM_MAIN_DIR"
  mkdir -p "$SLIM_MAIN_DIR"
  tar xzf "$MAIN_TGZ" -C "$SLIM_MAIN_DIR"
  node <<NODE
const fs = require('fs')
const path = require('path')
const pkgPath = path.join(process.cwd(), '${SLIM_MAIN_DIR}', 'package', 'package.json')
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
delete pkg.optionalDependencies
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\\n')
NODE
}

prepare_slim_main_package

cat > package.json <<EOF
{
  "private": true,
  "dependencies": {
    "aerospike": "file:./${SLIM_MAIN_DIR}/package",
    "${PREBUILD_PKG}": "file:./${PREBUILD_TGZ}"
  }
}
EOF

echo "install-slim-pm-smoke: pm=${PM} main=${SLIM_MAIN_DIR}/package ${PREBUILD_PKG}=${PREBUILD_TGZ}" >&2

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
