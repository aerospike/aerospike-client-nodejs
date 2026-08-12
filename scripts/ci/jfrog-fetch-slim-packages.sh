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

find_prebuild_artifact () {
  local root="$1"
  local candidate found=""
  for candidate in \
    "aerospike-prebuild-${PREBUILD_TAG}-${PKG_VERSION}.tgz" \
    "@aerospike-prebuild-${PREBUILD_TAG}-${PKG_VERSION}.tgz" \
    "prebuild-${PREBUILD_TAG}-${PKG_VERSION}.tgz"
  do
    found="$(find_artifact "$root" "$candidate")"
    if [[ -n "$found" ]]; then
      echo "$found"
      return 0
    fi
  done
  find "$root" -type f -name "*prebuild-${PREBUILD_TAG}*${PKG_VERSION}.tgz" 2>/dev/null | head -n 1
}

count_files () {
  find "$1" -type f 2>/dev/null | wc -l | tr -d ' '
}

configure_jfrog_npm () {
  if ! command -v jf >/dev/null 2>&1; then
    echo "warning: jf CLI not available for npm registry fallback" >&2
    return 1
  fi
  echo "configuring npm client for ${JF_REPO} (project=${JF_PROJECT})" >&2
  jf npm config --repo-resolve="${JF_REPO}" --project="${JF_PROJECT}"
}

try_rt_dl_flat () {
  local spec="$1" dest="$2"
  local extra=()
  if [[ -n "${BUNDLE_VERSION:-}" ]]; then
    extra=(--bundle "${BUNDLE_NAME}/${BUNDLE_VERSION}")
  fi
  jf rt dl --flat --project "$JF_PROJECT" "${extra[@]}" "$spec" "$dest"
}

resolve_prebuild_path () {
  if [[ -f "${WORKSPACE_ROOT}/${PREBUILD}" ]]; then
    echo "${WORKSPACE_ROOT}/${PREBUILD}"
    return 0
  fi

  shopt -s nullglob
  local matches=(
    "${WORKSPACE_ROOT}"/aerospike-prebuild-"${PREBUILD_TAG}"-"${PKG_VERSION}".tgz
    "${WORKSPACE_ROOT}"/@aerospike-prebuild-"${PREBUILD_TAG}"-"${PKG_VERSION}".tgz
    "${WORKSPACE_ROOT}"/prebuild-"${PREBUILD_TAG}"-"${PKG_VERSION}".tgz
    "${WORKSPACE_ROOT}"/*prebuild-"${PREBUILD_TAG}"*"${PKG_VERSION}".tgz
  )
  shopt -u nullglob

  if [[ ${#matches[@]} -gt 0 && -f "${matches[0]}" ]]; then
    PREBUILD="$(basename "${matches[0]}")"
    echo "${WORKSPACE_ROOT}/${PREBUILD}"
    return 0
  fi

  echo "resolve_prebuild_path: no prebuild tarball for ${PREBUILD_TAG} in ${WORKSPACE_ROOT}" >&2
  return 1
}

verify_slim_install () {
  if [[ ! -d .slim-install/node_modules/aerospike ]]; then
    echo "slim install verification failed: missing .slim-install/node_modules/aerospike" >&2
    find .slim-install -maxdepth 3 -type d 2>/dev/null || true
    exit 1
  fi

  local optional=".slim-install/node_modules/@aerospike/prebuild-${PREBUILD_TAG}"
  if [[ ! -d "$optional" ]]; then
    echo "slim install verification failed: missing ${optional}" >&2
    exit 1
  fi

  (
    cd .slim-install/node_modules/aerospike
    node scripts/verify-prebuild-smoke.js
  )
  echo "slim install verified for ${PREBUILD_TAG}" >&2
}

install_slim_from_tarballs () {
  local main_path="${WORKSPACE_ROOT}/${MAIN}"
  local prebuild_path
  prebuild_path="$(resolve_prebuild_path)"

  if [[ ! -f "$main_path" ]]; then
    echo "install_slim_from_tarballs: missing main tarball ${main_path}" >&2
    exit 1
  fi

  rm -rf .slim-install
  mkdir .slim-install
  (
    cd .slim-install
    echo '{"name":"slim-jfrog-smoke","private":true}' > package.json
    npm install --no-save --ignore-scripts \
      "file:${main_path}" \
      "file:${prebuild_path}"
  )
  verify_slim_install
}

fetch_from_bundle_paths () {
  local repo="$1"
  [[ -n "$BUNDLE_VERSION" ]] || return 1

  echo "try bundle-scoped npm paths for ${BUNDLE_NAME}/${BUNDLE_VERSION}" >&2

  if [[ ! -f "$MAIN" ]]; then
    try_rt_dl_flat "${repo}/aerospike/-/${MAIN}" "./${MAIN}" \
      || rm -f "./${MAIN}"
  fi

  if [[ ! -f "$PREBUILD" ]]; then
    local spec dest="./${PREBUILD}"
    for spec in \
      "${repo}/@aerospike/prebuild-${PREBUILD_TAG}/-/${PREBUILD}" \
      "${repo}/@aerospike/prebuild-${PREBUILD_TAG}/-/aerospike-prebuild-${PREBUILD_TAG}-${PKG_VERSION}.tgz" \
      "${repo}/@aerospike/prebuild-${PREBUILD_TAG}/-/prebuild-${PREBUILD_TAG}-${PKG_VERSION}.tgz" \
      "${repo}/@aerospike/prebuild-${PREBUILD_TAG}/*/*.tgz"
    do
      rm -f "./${PREBUILD}" || true
      shopt -s nullglob
      rm -f ./*prebuild-"${PREBUILD_TAG}"*.tgz || true
      shopt -u nullglob
      if try_rt_dl_flat "$spec" "$dest"; then
        break
      fi
      local got
      got="$(find . -maxdepth 1 -type f -name "*prebuild-${PREBUILD_TAG}*${PKG_VERSION}.tgz" | head -n 1)"
      if [[ -n "$got" ]]; then
        if [[ "$got" != "./${PREBUILD}" ]]; then
          mv "$got" "./${PREBUILD}"
        fi
        break
      fi
    done
  fi

  normalize_downloaded_prebuild || true
  [[ -f "$MAIN" && -f "$PREBUILD" ]]
}

normalize_downloaded_prebuild () {
  if [[ -f "$PREBUILD" ]]; then
    return 0
  fi

  local resolved
  resolved="$(resolve_prebuild_path)" || return 1
  PREBUILD="$(basename "$resolved")"
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

  local n
  n="$(count_files "$root")"
  if [[ "$n" == "0" ]]; then
    echo "warning: release bundle download returned 0 files" >&2
    return 1
  fi
  echo "release bundle download fetched ${n} file(s)" >&2
}

fetch_from_npm_paths () {
  local repo="$1"
  BUNDLE_VERSION=""

  local main_path="${repo}/aerospike/-/${MAIN}"
  local prebuild_specs=(
    "${repo}/@aerospike/prebuild-${PREBUILD_TAG}/-/aerospike-prebuild-${PREBUILD_TAG}-${PKG_VERSION}.tgz"
    "${repo}/@aerospike/prebuild-${PREBUILD_TAG}/-/${PREBUILD}"
    "${repo}/@aerospike/prebuild-${PREBUILD_TAG}/-/prebuild-${PREBUILD_TAG}-${PKG_VERSION}.tgz"
  )

  echo "try npm path: ${main_path}" >&2
  try_rt_dl_flat "$main_path" "./${MAIN}" || rm -f "./${MAIN}"

  for spec in "${prebuild_specs[@]}"; do
    [[ -f "$PREBUILD" ]] && break
    echo "try npm path: ${spec}" >&2
    try_rt_dl_flat "$spec" "./${PREBUILD}" || rm -f "./${PREBUILD}"
  done

  normalize_downloaded_prebuild || true
}

fetch_from_npm_registry () {
  local optional="@aerospike/prebuild-${PREBUILD_TAG}@${PKG_VERSION}"

  configure_jfrog_npm || return 1

  echo "try npm registry install for aerospike@${PKG_VERSION} and ${optional}" >&2
  rm -rf .npm-jfrog-fetch
  mkdir .npm-jfrog-fetch
  (
    cd .npm-jfrog-fetch
    echo '{"name":"jfrog-fetch","private":true}' > package.json
    npm install --no-save --ignore-scripts \
      "aerospike@${PKG_VERSION}" \
      "${optional}"
  )

  if [[ "$MODE" == "download" ]]; then
    (
      cd .npm-jfrog-fetch
      npm pack "aerospike@${PKG_VERSION}"
      npm pack "${optional}"
    )
    copy_if_found ".npm-jfrog-fetch/aerospike-${PKG_VERSION}.tgz" "./${MAIN}" || true
    shopt -s nullglob
    for f in .npm-jfrog-fetch/aerospike-prebuild-"${PREBUILD_TAG}"-"${PKG_VERSION}".tgz \
      .npm-jfrog-fetch/@aerospike-prebuild-"${PREBUILD_TAG}"-"${PKG_VERSION}".tgz \
      .npm-jfrog-fetch/prebuild-"${PREBUILD_TAG}"-"${PKG_VERSION}".tgz; do
      copy_if_found "$f" "./${PREBUILD}" && break
    done
    shopt -u nullglob
    normalize_downloaded_prebuild || true
  fi

  if [[ "$MODE" == "install" ]]; then
    rm -rf .slim-install
    mv .npm-jfrog-fetch .slim-install
    verify_slim_install
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
WORKSPACE_ROOT="$(pwd)"

MAIN="aerospike-${PKG_VERSION}.tgz"
PREBUILD="aerospike-prebuild-${PREBUILD_TAG}-${PKG_VERSION}.tgz"

echo "jfrog-fetch-slim-packages: main=${MAIN} prebuild=${PREBUILD} mode=${MODE} bundle=${BUNDLE_VERSION:-none}" >&2

if [[ "$MODE" != "install" && "$MODE" != "extract" ]]; then
  rm -f "./${MAIN}" "./${PREBUILD}"
fi

if [[ -n "$BUNDLE_VERSION" ]]; then
  fetch_from_bundle_paths "$JF_REPO" || true

  if [[ ! -f "$MAIN" || ! -f "$PREBUILD" ]]; then
    bundle_root="$(mktemp -d)"
    if fetch_from_release_bundle "$bundle_root"; then
      main_src="$(find_artifact "$bundle_root" "$MAIN")"
      pre_src="$(find_prebuild_artifact "$bundle_root")"
      if [[ -n "$pre_src" ]]; then
        PREBUILD="$(basename "$pre_src")"
      fi
      copy_if_found "$main_src" "./${MAIN}" || true
      copy_if_found "$pre_src" "./${PREBUILD}" || true
    fi
    rm -rf "$bundle_root"
  fi
fi

if [[ ! -f "$MAIN" || ! -f "$PREBUILD" ]]; then
  fetch_from_npm_paths "$JF_REPO" || true
fi

normalize_downloaded_prebuild || true

if [[ ! -f "$MAIN" || ! -f "$PREBUILD" ]]; then
  fetch_from_npm_registry || true
fi

normalize_downloaded_prebuild || true

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
  echo "hint: confirm release bundle ${BUNDLE_NAME}/${BUNDLE_VERSION:-?} exists in JFrog DEV" >&2
  exit 1
fi

if [[ ! -f "$PREBUILD" ]]; then
  echo "missing prebuild package for ${PREBUILD_TAG} (expected ${PREBUILD})" >&2
  ls -la ./*prebuild* 2>/dev/null || true
  echo "hint: confirm @aerospike/prebuild-${PREBUILD_TAG}@${PKG_VERSION} is in bundle ${BUNDLE_VERSION:-?}" >&2
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
    install_slim_from_tarballs
    ;;
  *)
    usage
    ;;
esac
