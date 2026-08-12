#!/usr/bin/env bash
set -euo pipefail

# Local smoke for slim fetch/install without JFrog.
# Builds tarballs from the current checkout (requires prebuilds/<platform>/) and
# exercises extract + install modes of jfrog-fetch-slim-packages.sh.
#
# Usage:
#   scripts/ci/test-slim-fetch-local.sh [platform-tag]
#
# Examples:
#   scripts/ci/test-slim-fetch-local.sh darwin_arm64
#   PLATFORM_TAG=linux_x86_64 scripts/ci/test-slim-fetch-local.sh

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

map_local_prebuild_tag () {
  case "$1" in
    linux_x86_64) echo linux-x64 ;;
    linux_aarch64) echo linux-arm64 ;;
    win32_x64) echo win32-x64 ;;
    darwin_x86_64|darwin_x86_64_2) echo darwin-x64 ;;
    darwin_arm64|darwin_arm64_2) echo darwin-arm64 ;;
    *) echo "unknown PLATFORM_TAG: $1" >&2; exit 1 ;;
  esac
}

PLATFORM_TAG="${1:-${PLATFORM_TAG:-darwin_arm64}}"
PKG_VERSION="$(node -p "require('./package.json').version")"
TAG="$(map_local_prebuild_tag "$PLATFORM_TAG")"

if [[ ! -d "prebuilds/${TAG}" ]]; then
  echo "test-slim-fetch-local: missing prebuilds/${TAG}; run a native build first" >&2
  exit 1
fi

WORK="$(mktemp -d)"
cleanup () { rm -rf "$WORK" "$ROOT/aerospike-${PKG_VERSION}.tgz" "$ROOT/packages/prebuild-${TAG}/"*.tgz 2>/dev/null || true; }
trap cleanup EXIT

echo "== pack slim tarballs for ${TAG} ==" >&2
PREBUILD_SPLIT_PLATFORMS="$TAG" node scripts/ci/split-prebuild-packages.js
MAIN_TGZ="$(npm pack --silent)"
mv "$ROOT/$MAIN_TGZ" "$WORK/$MAIN_TGZ"
pushd "$ROOT/packages/prebuild-${TAG}" >/dev/null
PRE_TGZ="$(npm pack --silent)"
popd >/dev/null
mv "$ROOT/packages/prebuild-${TAG}/$PRE_TGZ" "$WORK/$PRE_TGZ"

echo "== extract mode ==" >&2
mkdir -p "$WORK/extract"
(
  cd "$WORK/extract"
  cp "$WORK/$MAIN_TGZ" "$WORK/$PRE_TGZ" .
  PKG_VERSION="$PKG_VERSION" PLATFORM_TAG="$PLATFORM_TAG" \
    BUNDLE_VERSION= \
    bash "$ROOT/scripts/ci/jfrog-fetch-slim-packages.sh" extract
  test -d "prebuilds/${TAG}"
  test -n "$(find "prebuilds/${TAG}" -name '*.node' | head -n 1)"
  echo "extract layout ok"
)

echo "== install mode ==" >&2
mkdir -p "$WORK/install"
(
  cd "$WORK/install"
  cp "$WORK/$MAIN_TGZ" "$WORK/$PRE_TGZ" .
  PKG_VERSION="$PKG_VERSION" PLATFORM_TAG="$PLATFORM_TAG" \
    BUNDLE_VERSION= \
    bash "$ROOT/scripts/ci/jfrog-fetch-slim-packages.sh" install
)

echo "== pm-style file install ==" >&2
mkdir -p "$WORK/pm"
(
  cd "$WORK/pm"
  cp "$WORK/$MAIN_TGZ" "$WORK/$PRE_TGZ" .
  echo '{}' > package.json
  # shellcheck disable=SC1091
  source "$ROOT/scripts/ci/select-slim-tarballs.sh"
  select_slim_tarballs
  npm install --no-save --ignore-scripts "file:./${MAIN_TGZ}" "file:./${PREBUILD_TGZ}"
  (
    cd node_modules/aerospike
    node scripts/verify-prebuild-smoke.js
  )
)

echo "test-slim-fetch-local: ok (${PLATFORM_TAG} / ${TAG})" >&2
