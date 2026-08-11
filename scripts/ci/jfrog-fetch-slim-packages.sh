#!/usr/bin/env bash
set -euo pipefail

# Fetch slim-layout npm artifacts from JFrog and either:
#   download - fetch main + platform prebuild .tgz files only
#   extract  - unpack platform prebuilds into ./prebuilds/ (repo checkout jobs)
#   install  - npm install main + platform prebuild tarballs (smoke / pm tests)
#
# Required env:
#   PKG_VERSION     npm package version (e.g. 7.0.0) used in .tgz filenames
#   PLATFORM_TAG    CI platform tag (e.g. linux_x86_64)
# Optional env:
#   JF_REPO         default database-npm-dev-local

usage () {
  echo "usage: $0 download|extract|install" >&2
  exit 1
}

map_prebuild_tag () {
  case "$1" in
    linux_x86_64) echo linux-x64 ;;
    linux_aarch64) echo linux-arm64 ;;
    win32_x64) echo win32-x64 ;;
    darwin_x86_64|darwin_x86_64_2) echo darwin-x64 ;;
    darwin_arm64|darwin_arm64_2) echo darwin-arm64 ;;
    *)
      echo "unknown PLATFORM_TAG: $1" >&2
      exit 1
      ;;
  esac
}

[[ $# -eq 1 ]] || usage
MODE=$1

PKG_VERSION="${PKG_VERSION:?PKG_VERSION is required}"
PLATFORM_TAG="${PLATFORM_TAG:?PLATFORM_TAG is required}"
JF_REPO="${JF_REPO:-database-npm-dev-local}"
PREBUILD_TAG="$(map_prebuild_tag "$PLATFORM_TAG")"

MAIN="aerospike-${PKG_VERSION}.tgz"
PREBUILD="@aerospike-prebuild-${PREBUILD_TAG}-${PKG_VERSION}.tgz"

echo "jfrog-fetch-slim-packages: main=${MAIN} prebuild=${PREBUILD} mode=${MODE}"

jf rt dl --flat --fail-no-op "${JF_REPO}/aerospike/-/${MAIN}" .
jf rt dl --flat --fail-no-op \
  "${JF_REPO}/@aerospike/prebuild-${PREBUILD_TAG}/-/${PREBUILD}" .

if [[ ! -f "$MAIN" ]]; then
  echo "missing main package: ${MAIN}" >&2
  exit 1
fi
if [[ ! -f "$PREBUILD" ]]; then
  echo "missing prebuild package: ${PREBUILD}" >&2
  exit 1
fi

case "$MODE" in
  download)
    echo "downloaded ${MAIN} and ${PREBUILD}"
    ;;
  extract)
    mkdir -p prebuilds
    tmp="$(mktemp -d)"
    tar xzf "$PREBUILD" -C "$tmp"
    cp -R "${tmp}/package/prebuilds/." prebuilds/
    rm -rf "$tmp"
    echo "extracted prebuilds/${PREBUILD_TAG}"
    ;;
  install)
    rm -rf .slim-install
    mkdir .slim-install
    (
      cd .slim-install
      echo '{"name":"slim-jfrog-smoke","private":true}' > package.json
      npm install --no-save --ignore-scripts \
        "file:${PWD}/../${MAIN}" \
        "file:${PWD}/../${PREBUILD}"
    )
    ;;
  *)
    usage
    ;;
esac
