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

bundle_artifact_roots () {
  local root="$1"
  local candidates=(
    "$root"
    "${root}/${BUNDLE_NAME}/${BUNDLE_VERSION}"
    "${WORKSPACE_ROOT}/${BUNDLE_NAME}/${BUNDLE_VERSION}"
  )
  local dir seen="" total
  for dir in "${candidates[@]}"; do
    [[ -d "$dir" ]] || continue
    total="$(count_files "$dir")"
    [[ "$total" != "0" ]] || continue
    case " ${seen} " in
      *" ${dir} "*) continue ;;
    esac
    seen="${seen} ${dir}"
    echo "$dir"
  done
}

ensure_jfrog_env () {
  if [[ -z "${JF_URL}" ]]; then
    JF_URL=https://aerospike.jfrog.io
  fi
  if [[ -z "${JF_PROJECT}" ]]; then
    JF_PROJECT=database
  fi
  if [[ -z "${JF_REPO}" ]]; then
    JF_REPO=database-npm-dev-local
  fi
}

tar_listing () {
  # GNU tar may exit 2 (warning) after printing a full listing; capture stdout anyway.
  tar -tzf "$1" 2>/dev/null || true
}

validate_main_tgz () {
  local file="$1"
  local listing name
  [[ -f "$file" ]] || return 1
  listing="$(tar_listing "$file")"
  [[ -n "$listing" ]] || return 1
  [[ "$listing" == *"package/package.json"* ]] || return 1
  if [[ "$listing" == *"package/prebuilds/"* ]]; then
    echo "validate_main_tgz: slim main must not contain package/prebuilds/" >&2
    return 1
  fi
  name="$(
    tar -xOf "$file" package/package.json 2>/dev/null \
      | node -e "let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>{try{process.stdout.write(JSON.parse(s).name||'')}catch{process.exit(1)}})"
  )"
  [[ "$name" == "aerospike" ]]
}

validate_prebuild_tgz () {
  local file="$1"
  local listing abi
  [[ -f "$file" ]] || return 1
  listing="$(tar_listing "$file")"
  [[ -n "$listing" ]] || return 1
  [[ "$listing" == *"package/prebuilds/${PREBUILD_TAG}/"* ]] || return 1
  for abi in 115 127 137 141; do
    if [[ "$listing" != *"package/prebuilds/${PREBUILD_TAG}/node.abi${abi}.node"* ]] \
      && [[ "$listing" != *"package/prebuilds/${PREBUILD_TAG}/aerospike.${abi}.node"* ]]; then
      echo "validate_prebuild_tgz: missing ABI ${abi} under prebuilds/${PREBUILD_TAG}/ in ${file}" >&2
      return 1
    fi
  done
}

prebuild_tgz_listing () {
  local nodes dlls
  nodes="$(tar_listing "$1" | grep "package/prebuilds/${PREBUILD_TAG}/" | grep '\.node' || true)"
  if [[ -n "$nodes" ]]; then
    echo "$nodes" | head -10
    return 0
  fi
  dlls="$(tar_listing "$1" | grep "package/prebuilds/${PREBUILD_TAG}/" | head -10 || true)"
  [[ -n "$dlls" ]] && echo "$dlls"
}

reject_invalid_tarballs () {
  if [[ -f "$MAIN" ]] && ! validate_main_tgz "$MAIN"; then
    echo "warning: rejecting invalid main tarball ${MAIN}" >&2
    rm -f "$MAIN"
  fi
  if [[ -f "$PREBUILD" ]] && ! validate_prebuild_tgz "$PREBUILD"; then
    echo "warning: rejecting invalid prebuild tarball ${PREBUILD} (expected prebuilds/${PREBUILD_TAG}/ with ABIs 115,127,137,141)" >&2
    prebuild_tgz_listing "$PREBUILD" >&2 || true
    rm -f "$PREBUILD"
  fi
}

have_valid_tarballs () {
  [[ -f "$MAIN" && -f "$PREBUILD" ]] \
    && validate_main_tgz "$MAIN" \
    && validate_prebuild_tgz "$PREBUILD"
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
  if [[ -n "${BUNDLE_VERSION:-}" ]]; then
    jf rt dl --flat --project "$JF_PROJECT" \
      --bundle "${BUNDLE_NAME}/${BUNDLE_VERSION}" \
      "$spec" "$dest"
  else
    jf rt dl --flat --project "$JF_PROJECT" "$spec" "$dest"
  fi
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

prepare_slim_main_in_dir () {
  local dest="$1"
  rm -rf "$dest"
  mkdir -p "$dest"
  tar xzf "./${MAIN}" -C "$dest"
  SLIM_MAIN_DIR="$dest" node <<'NODE'
const fs = require('fs')
const path = require('path')
const dest = process.env.SLIM_MAIN_DIR
const pkgPath = path.join(process.cwd(), dest, 'package', 'package.json')
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
delete pkg.optionalDependencies
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')
NODE
}

install_slim_from_tarballs () {
  local prebuild_pkg="@aerospike/prebuild-${PREBUILD_TAG}"

  if [[ ! -f "./${MAIN}" ]]; then
    echo "install_slim_from_tarballs: missing main tarball ${WORKSPACE_ROOT}/${MAIN}" >&2
    exit 1
  fi
  if ! resolve_prebuild_path >/dev/null; then
    echo "install_slim_from_tarballs: missing prebuild tarball ${WORKSPACE_ROOT}/${PREBUILD}" >&2
    exit 1
  fi

  rm -rf .slim-install
  mkdir -p .slim-install
  # Keep extracted main under .slim-install so resolve-prebuild-root.js can walk
  # up from the file:-linked aerospike package to .slim-install/node_modules/.
  prepare_slim_main_in_dir ".slim-install/.slim-main-pkg"

  cat > .slim-install/package.json <<EOF
{
  "name": "slim-jfrog-smoke",
  "private": true,
  "dependencies": {
    "aerospike": "file:./.slim-main-pkg/package",
    "${prebuild_pkg}": "file:../${PREBUILD}"
  }
}
EOF

  (
    cd .slim-install
    # Relative file: paths avoid Git Bash -> npm path mangling on Windows (D:\\d\\a\\...).
    npm install --ignore-scripts
  )
  verify_slim_install
}

copy_bundle_artifacts () {
  local root="$1"
  local main_src pre_src

  main_src="$(find_artifact "$root" "$MAIN")"
  pre_src="$(find_prebuild_artifact "$root")"
  if [[ -n "$pre_src" ]]; then
    PREBUILD="$(basename "$pre_src")"
  fi
  copy_if_found "$main_src" "./${MAIN}" || true
  copy_if_found "$pre_src" "./${PREBUILD}" || true
  reject_invalid_tarballs
  have_valid_tarballs
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

  local total=0 dir
  while IFS= read -r dir; do
    [[ -n "$dir" ]] || continue
    total=$(( total + $(count_files "$dir") ))
    echo "release bundle artifacts under ${dir}" >&2
  done < <(bundle_artifact_roots "$root")

  if [[ "$total" == "0" ]]; then
    echo "warning: release bundle download returned 0 files under expected paths" >&2
    return 1
  fi
  echo "release bundle download fetched ${total} file(s)" >&2
}

copy_bundle_artifacts_from_download () {
  local bundle_root="$1"
  local search
  while IFS= read -r search; do
    [[ -n "$search" ]] || continue
    if copy_bundle_artifacts "$search"; then
      return 0
    fi
  done < <(bundle_artifact_roots "$bundle_root")
  return 1
}

normalize_downloaded_prebuild () {
  if [[ -f "$PREBUILD" ]] && validate_prebuild_tgz "$PREBUILD"; then
    return 0
  fi

  local resolved
  resolved="$(resolve_prebuild_path)" || return 1
  PREBUILD="$(basename "$resolved")"
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
  validate_main_tgz "$MAIN" || rm -f "./${MAIN}"

  for spec in "${prebuild_specs[@]}"; do
    [[ -f "$PREBUILD" ]] && validate_prebuild_tgz "$PREBUILD" && break
    echo "try npm path: ${spec}" >&2
    try_rt_dl_flat "$spec" "./${PREBUILD}" || rm -f "./${PREBUILD}"
    validate_prebuild_tgz "$PREBUILD" || rm -f "./${PREBUILD}"
  done

  reject_invalid_tarballs
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

bundle_workspace_dir () {
  [[ -n "${BUNDLE_VERSION:-}" ]] \
    && [[ -d "${WORKSPACE_ROOT}/${BUNDLE_NAME}/${BUNDLE_VERSION}" ]]
}

report_bundle_copy_failure () {
  echo "error: release bundle tree present but no valid slim tarballs for ${PREBUILD_TAG}" >&2
  echo "  expected main=${MAIN} prebuild=${PREBUILD}" >&2
  find "${WORKSPACE_ROOT}/${BUNDLE_NAME}/${BUNDLE_VERSION}" -type f -name '*.tgz' 2>/dev/null \
    | head -20 >&2 || true
}

main () {
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
ensure_jfrog_env

MAIN="aerospike-${PKG_VERSION}.tgz"
PREBUILD="aerospike-prebuild-${PREBUILD_TAG}-${PKG_VERSION}.tgz"

echo "jfrog-fetch-slim-packages: main=${MAIN} prebuild=${PREBUILD} mode=${MODE} bundle=${BUNDLE_VERSION:-none} project=${JF_PROJECT}" >&2

if [[ "$MODE" != "install" && "$MODE" != "extract" ]]; then
  rm -f "./${MAIN}" "./${PREBUILD}"
fi

reject_invalid_tarballs

if [[ -n "$BUNDLE_VERSION" ]]; then
  bundle_root="$(mktemp -d)"
  if fetch_from_release_bundle "$bundle_root"; then
    copy_bundle_artifacts_from_download "$bundle_root" || true
  fi
  rm -rf "$bundle_root"
  # JFrog CLI may leave bundle tree in the workspace; search it even if temp dir is empty.
  if ! have_valid_tarballs && [[ -d "${WORKSPACE_ROOT}/${BUNDLE_NAME}/${BUNDLE_VERSION}" ]]; then
    copy_bundle_artifacts "${WORKSPACE_ROOT}/${BUNDLE_NAME}/${BUNDLE_VERSION}" || true
  fi
fi

if ! have_valid_tarballs; then
  if bundle_workspace_dir; then
    report_bundle_copy_failure
    exit 1
  fi
  fetch_from_npm_paths "$JF_REPO" || true
fi

normalize_downloaded_prebuild || true

if ! have_valid_tarballs; then
  fetch_from_npm_registry || true
fi

normalize_downloaded_prebuild || true
reject_invalid_tarballs

if [[ "$MODE" == "install" && -d .slim-install/node_modules/aerospike ]]; then
  echo "installed via npm registry into .slim-install" >&2
  exit 0
fi

if [[ "$MODE" == "extract" && -d prebuilds/${PREBUILD_TAG} ]]; then
  echo "extracted prebuilds/${PREBUILD_TAG} via npm registry" >&2
  exit 0
fi

if [[ ! -f "$MAIN" ]] || ! validate_main_tgz "$MAIN"; then
  echo "missing or invalid main package: ${MAIN}" >&2
  echo "hint: confirm release bundle ${BUNDLE_NAME}/${BUNDLE_VERSION:-?} exists in JFrog DEV" >&2
  exit 1
fi

if [[ ! -f "$PREBUILD" ]] || ! validate_prebuild_tgz "$PREBUILD"; then
  echo "missing or invalid prebuild package for ${PREBUILD_TAG} (expected ${PREBUILD})" >&2
  ls -la ./*prebuild* 2>/dev/null || true
  echo "hint: confirm @aerospike/prebuild-${PREBUILD_TAG}@${PKG_VERSION} is in bundle ${BUNDLE_VERSION:-?}" >&2
  exit 1
fi

case "$MODE" in
  download)
    echo "downloaded ${MAIN} and ${PREBUILD}" >&2
    ;;
  extract)
    rm -rf "prebuilds/${PREBUILD_TAG}"
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
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  main "$@"
fi
