#!/usr/bin/env bash

# Resolve main and platform prebuild .tgz filenames in the current directory.
# Sets MAIN_TGZ and PREBUILD_TGZ (single basename each). Exits 1 if either is missing.
#
# Optional env:
#   PREBUILD_TAG    platform tag (e.g. linux-x64) to disambiguate multiple prebuilds

select_slim_tarballs () {
  set -euo pipefail
  shopt -s nullglob

  local main=()
  local prebuild=()

  for f in aerospike-*.tgz; do
    case "$f" in
      aerospike-[0-9]*.[0-9]*.[0-9]*.tgz)
        main+=("$f")
        ;;
      aerospike-prebuild-*)
        prebuild+=("$f")
        ;;
    esac
  done

  for f in @aerospike-prebuild-*.tgz prebuild-*.tgz; do
    prebuild+=("$f")
  done

  if [[ ${#main[@]} -eq 0 ]]; then
    echo "select-slim-tarballs: missing main aerospike-*.tgz in $(pwd)" >&2
    ls -la *.tgz 2>/dev/null || ls -la >&2
    return 1
  fi

  if [[ ${#prebuild[@]} -eq 0 ]]; then
    echo "select-slim-tarballs: missing platform prebuild .tgz in $(pwd)" >&2
    ls -la *.tgz 2>/dev/null || ls -la >&2
    return 1
  fi

  if [[ -n "${PREBUILD_TAG:-}" ]]; then
    local filtered=()
    local f
    for f in "${prebuild[@]}"; do
      if [[ "$f" == *"${PREBUILD_TAG}"* ]]; then
        filtered+=("$f")
      fi
    done
    if [[ ${#filtered[@]} -gt 0 ]]; then
      prebuild=("${filtered[@]}")
    fi
  fi

  MAIN_TGZ="${main[0]}"
  PREBUILD_TGZ="${prebuild[0]}"
  export MAIN_TGZ PREBUILD_TGZ
  echo "select-slim-tarballs: main=${MAIN_TGZ} prebuild=${PREBUILD_TGZ}" >&2
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  select_slim_tarballs
fi
