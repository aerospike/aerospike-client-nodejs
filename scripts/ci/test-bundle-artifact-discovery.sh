#!/usr/bin/env bash
set -euo pipefail

# Regression test: JFrog writes bundle downloads under
#   ./aerospike-nodejs-client/<bundle-version>/...
# in the job workspace, not necessarily under the temp dir passed to jf rt dl.

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
WORK="$(mktemp -d)"
cleanup () { rm -rf "$WORK"; }
trap cleanup EXIT

PKG_VERSION="$(node -p "require('${ROOT}/package.json').version")"
PLATFORM_TAG="${1:-linux_aarch64}"
BUNDLE_VERSION="7.0.0-dev.test"
BUNDLE_NAME="aerospike-nodejs-client"
PREBUILD_TAG="linux-arm64"
MAIN="aerospike-${PKG_VERSION}.tgz"
PREBUILD="aerospike-prebuild-${PREBUILD_TAG}-${PKG_VERSION}.tgz"

if [[ ! -d "${ROOT}/prebuilds/${PREBUILD_TAG}" ]]; then
  echo "test-bundle-artifact-discovery: skip (no prebuilds/${PREBUILD_TAG})" >&2
  exit 0
fi

echo "== pack tarballs ==" >&2
PREBUILD_SPLIT_PLATFORMS="$PREBUILD_TAG" node "${ROOT}/scripts/ci/split-prebuild-packages.js"
MAIN_TGZ="$(cd "$ROOT" && npm pack --silent)"
PRE_DIR="${ROOT}/packages/prebuild-${PREBUILD_TAG}"
PRE_TGZ="$(cd "$PRE_DIR" && npm pack --silent)"

cd "$WORK"
mkdir -p "${BUNDLE_NAME}/${BUNDLE_VERSION}/artifacts/npm/aerospike/-"
mkdir -p "${BUNDLE_NAME}/${BUNDLE_VERSION}/artifacts/npm/@aerospike/prebuild-${PREBUILD_TAG}/-"
cp "${ROOT}/${MAIN_TGZ}" "${BUNDLE_NAME}/${BUNDLE_VERSION}/artifacts/npm/aerospike/-/${MAIN}"
cp "${PRE_DIR}/${PRE_TGZ}" \
  "${BUNDLE_NAME}/${BUNDLE_VERSION}/artifacts/npm/@aerospike/prebuild-${PREBUILD_TAG}/-/${PREBUILD}"

echo "== copy from workspace bundle tree (no jf) ==" >&2
# shellcheck disable=SC1091
source "${ROOT}/scripts/ci/jfrog-fetch-slim-packages.sh"
WORKSPACE_ROOT="$WORK"
JF_PROJECT=database
MAIN="aerospike-${PKG_VERSION}.tgz"
PREBUILD="aerospike-prebuild-${PREBUILD_TAG}-${PKG_VERSION}.tgz"
root="${WORK}/${BUNDLE_NAME}/${BUNDLE_VERSION}"
main_src="$(find_artifact "$root" "$MAIN")"
pre_src="$(find_prebuild_artifact "$root")"
if [[ -z "$main_src" || -z "$pre_src" ]]; then
  echo "test-bundle-artifact-discovery: find failed main=${main_src:-empty} pre=${pre_src:-empty}" >&2
  exit 1
fi
copy_if_found "$main_src" "./${MAIN}"
copy_if_found "$pre_src" "./${PREBUILD}"

if [[ ! -f "$MAIN" || ! -f "$PREBUILD" ]]; then
  echo "test-bundle-artifact-discovery: expected ${MAIN} and ${PREBUILD} in ${WORK}" >&2
  ls -la >&2
  exit 1
fi

if ! validate_main_tgz "$MAIN"; then
  echo "test-bundle-artifact-discovery: main tarball validation failed" >&2
  exit 1
fi

if ! tar -tzf "$PREBUILD" 2>/dev/null | grep -q "package/prebuilds/${PREBUILD_TAG}/"; then
  echo "test-bundle-artifact-discovery: prebuild layout missing prebuilds/${PREBUILD_TAG}/" >&2
  exit 1
fi

echo "test-bundle-artifact-discovery: ok (${PREBUILD_TAG})" >&2
