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
#   BUNDLE_VERSION  release bundle version (e.g. 7.0.0-dev.9); preferred source
#   BUNDLE_NAME     default aerospike-nodejs-client
#   JF_REPO         default database-npm-dev-local
#   JF_URL          default https://aerospike.jfrog.io
#   JF_PROJECT      default database

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

copy_if_found () {
  local src="$1" dest="$2"
  if [[ -n "$src" && -f "$src" ]]; then
    cp -f "$src" "$dest"
    return 0
  fi
  return 1
}

find_artifact () {
  local root="$1" pattern="$2"
  find "$root" -type f -name "$pattern" 2>/dev/null | head -n 1
}

fetch_from_release_bundle () {
  local root="$1"
  rm -rf "$root"
  mkdir -p "$root"

  echo "fetching release bundle ${BUNDLE_NAME}/${BUNDLE_VERSION} (project=${JF_PROJECT})" >&2
  if ! jf rt dl \
    --bundle "${BUNDLE_NAME}/${BUNDLE_VERSION}" \
    --project "$JF_PROJECT" \
    "$root"; then
    echo "warning: release bundle download failed" >&2
    return 1
  fi
}

fetch_from_npm_paths () {
  local repo="$1"
  local main_path="${repo}/aerospike/-/${MAIN}"
  local prebuild_path="${repo}/@aerospike/prebuild-${PREBUILD_TAG}/-/${PREBUILD}"

  echo "try npm path: ${main_path}" >&2
  if jf rt dl --flat --project "$JF_PROJECT" "$main_path" "./${MAIN}"; then
    :
  else
    rm -f "./${MAIN}"
  fi

  echo "try npm path: ${prebuild_path}" >&2
  if jf rt dl --flat --project "$JF_PROJECT" "$prebuild_path" "./${PREBUILD}"; then
    :
  else
    rm -f "./${PREBUILD}"
  fi

  # JFrog CLI has historically uploaded scoped tarballs without the @scope prefix.
  local alt_prebuild="prebuild-${PREBUILD_TAG}-${PKG_VERSION}.tgz"
  if [[ ! -f "$PREBUILD" ]]; then
    local alt_path="${repo}/@aerospike/prebuild-${PREBUILD_TAG}/-/${alt_prebuild}"
    echo "try alternate npm path: ${alt_path}" >&2
    if jf rt dl --flat --project "$JF_PROJECT" "$alt_path" "./${PREBUILD}"; then
      :
    else
      rm -f "./${PREBUILD}"
    fi
  fi
}

fetch_from_npm_registry () {
  local registry="${JF_URL%/}/artifactory/api/npm/${JF_REPO}/"
  local optional="@aerospike/prebuild-${PREBUILD_TAG}@${PKG_VERSION}"

  echo "try npm registry: ${registry}" >&2
  rm -rf .npm-jfrog-fetch
  mkdir .npm-jfrog-fetch
  (
    cd .npm-jfrog-fetch
    echo '{"name":"jfrog-fetch","private":true}' > package.json
    npm install --no-save --ignore-scripts \
      "aerospike@${PKG_VERSION}" \
      "${optional}" \
      --registry "$registry"
  )

  if [[ "$MODE" == "download" ]]; then
    (
      cd .npm-jfrog-fetch
      npm pack "aerospike@${PKG_VERSION}" --registry "$registry"
      npm pack "${optional}" --registry "$registry"
    )
    copy_if_found ".npm-jfrog-fetch/aerospike-${PKG_VERSION}.tgz" "./${MAIN}" || true
    copy_if_found ".npm-jfrog-fetch/${PREBUILD}" "./${PREBUILD}" || true
  fi

  if [[ "$MODE" == "install" ]]; then
    rm -rf .slim-install
    mv .npm-jfrog-fetch .slim-install
    return 0
  fi

  if [[ "$MODE" == "extract" ]]; then
    mkdir -p prebuilds
    cp -R ".npm-jfrog-fetch/node_modules/@aerospike/prebuild-${PREBUILD_TAG}/prebuilds/." prebuilds/
    rm -rf .npm-jfrog-fetch
    return 0
  fi

  rm -rf .npm-jfrog-fetch
}

[[ $# -eq 1 ]] || usage
MODE=$1

PKG_VERSION="${PKG_VERSION:?PKG_VERSION is required}"
PLATFORM_TAG="${PLATFORM_TAG:?PLATFORM_TAG is required}"
JF_REPO="${JF_REPO:-database-npm-dev-local}"
JF_URL="${JF_URL:-https://aerospike.jfrog.io}"
JF_PROJECT="${JF_PROJECT:-database}"
BUNDLE_NAME="${BUNDLE_NAME:-aerospike-nodejs-client}"
BUNDLE_VERSION="${BUNDLE_VERSION:-}"
PREBUILD_TAG="$(map_prebuild_tag "$PLATFORM_TAG")"

MAIN="aerospike-${PKG_VERSION}.tgz"
PREBUILD="@aerospike-prebuild-${PREBUILD_TAG}-${PKG_VERSION}.tgz"

echo "jfrog-fetch-slim-packages: main=${MAIN} prebuild=${PREBUILD} mode=${MODE} bundle=${BUNDLE_VERSION:-none}" >&2

if [[ "$MODE" != "install" && "$MODE" != "extract" ]]; then
  rm -f "./${MAIN}" "./${PREBUILD}"
fi

if [[ -n "$BUNDLE_VERSION" ]]; then
  bundle_root="$(mktemp -d)"
  fetch_from_release_bundle "$bundle_root" || true
  main_src="$(find_artifact "$bundle_root" "$MAIN")"
  pre_src="$(find_artifact "$bundle_root" "$PREBUILD")"
  if [[ -z "$pre_src" ]]; then
    pre_src="$(find_artifact "$bundle_root" "prebuild-${PREBUILD_TAG}-${PKG_VERSION}.tgz")"
    if [[ -n "$pre_src" ]]; then
      PREBUILD="$(basename "$pre_src")"
    fi
  fi
  copy_if_found "$main_src" "./${MAIN}" || true
  copy_if_found "$pre_src" "./${PREBUILD}" || true
  rm -rf "$bundle_root"
fi

if [[ ! -f "$MAIN" || ! -f "$PREBUILD" ]]; then
  fetch_from_npm_paths "$JF_REPO"
fi

if [[ ! -f "$MAIN" || ! -f "$PREBUILD" ]]; then
  fetch_from_npm_registry
fi

if [[ "$MODE" == "install" && -d .slim-install/node_modules/aerospike ]]; then
  echo "installed via npm registry into .slim-install" >&2
  exit 0
fi

if [[ "$MODE" == "extract" && -d prebuilds/${PREBUILD_TAG} ]]; then
  echo "extracted prebuilds/${PREBUILD_TAG} via npm registry" >&2
  exit 0
fi

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
    echo "downloaded ${MAIN} and ${PREBUILD}" >&2
    ;;
  extract)
    mkdir -p prebuilds
    tmp="$(mktemp -d)"
    tar xzf "$PREBUILD" -C "$tmp"
    cp -R "${tmp}/package/prebuilds/." prebuilds/
    rm -rf "$tmp"
    echo "extracted prebuilds/${PREBUILD_TAG}" >&2
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
