#!/usr/bin/env bash
set -euo pipefail

PLATFORM_TAG="${PLATFORM_TAG:?PLATFORM_TAG is required}"
NODE_VERSION="${NODE_VERSION:?NODE_VERSION is required}"

expected_abi_for_node_version() {
  case "${NODE_VERSION}" in
    20) echo 115 ;;
    22) echo 127 ;;
    24) echo 137 ;;
    25) echo 141 ;;
    *)
      echo "ERROR: unsupported NODE_VERSION ${NODE_VERSION}" >&2
      exit 1
      ;;
  esac
}

assert_active_node() {
  local expected_major="${NODE_VERSION}" expected_abi actual_major actual_abi
  expected_abi="$(expected_abi_for_node_version)"
  actual_major="$(node -p "process.version.split('.')[0].slice(1)")"
  actual_abi="$(node -p "process.versions.modules")"
  if [[ "${actual_major}" != "${expected_major}" || "${actual_abi}" != "${expected_abi}" ]]; then
    echo "ERROR: expected Node ${expected_major} (ABI ${expected_abi}), got $(node --version) (ABI ${actual_abi})" >&2
    echo "PATH=${PATH}" >&2
    command -v node >&2 || true
    command -v npm >&2 || true
    exit 1
  fi
}

assert_prebuild_output() {
  node -e "
    const fs = require('fs');
    const path = require('path');
    const abi = process.versions.modules;
    const dir = path.join('prebuilds', process.platform + '-' + process.arch);
    const file = path.join(dir, 'node.abi' + abi + '.node');
    if (!fs.existsSync(file)) {
      console.error('missing expected prebuild:', file);
      if (fs.existsSync(dir)) {
        console.error('available:', fs.readdirSync(dir).join(', '));
      } else {
        console.error('missing directory:', dir);
      }
      process.exit(1);
    }
    console.log('prebuild ok:', file);
  "
}

patch_windows_props() {
  pwsh -NoProfile -WorkingDirectory aerospike-client-c/vs -Command '
    $path = "props\nodejs.props"
    $content = Get-Content $path -Raw
    $pattern = "<AdditionalLibraryDirectories>.*?</AdditionalLibraryDirectories>"
    $basePath = (Resolve-Path .).Path
    $replacement = "<AdditionalLibraryDirectories>`$(NodejsPath);$basePath\packages\openssl-native.3.0.16\lib\win-x64\native;`%(AdditionalIncludeDirectories)</AdditionalLibraryDirectories>"
    $updated = [System.Text.RegularExpressions.Regex]::Replace($content, $pattern, $replacement, "Singleline")
    Set-Content $path $updated
    Get-Content $path
  '
}

# Strip MSVC debug/intermediate files from build/Release (legacy from build-package.ps1).
# Option B publishes only prebuilds/*.node. Windows linking uses openssl-native from NuGet
# (nuget restore + patch_windows_props); no .lib files are copied or shipped.
cleanup_windows_artifacts() {
  pwsh -NoProfile -Command '
    Remove-Item -Recurse -Force .\build\Release\obj -ErrorAction SilentlyContinue
    Remove-Item -Force .\build\Release\aerospike.pdb -ErrorAction SilentlyContinue
    Remove-Item -Force .\build\Release\aerospike.ipdb -ErrorAction SilentlyContinue
    Remove-Item -Force .\build\Release\aerospike.iobj -ErrorAction SilentlyContinue
  '
}

# Node is provisioned by actions/setup-node in reusable_execute-build (setup-node-version input).
assert_active_node
node --version
npm --version

case "${PLATFORM_TAG}" in
  win32_x64)
    (cd aerospike-client-c/vs && nuget restore)
    patch_windows_props
    ;;
  darwin_*)
    brew install libyaml
    if [[ "${PLATFORM_TAG}" == darwin_arm64* ]]; then
      libraries=(libyaml openssl)
      for library in "${libraries[@]}"; do
        LIBRARY_PATH="${LIBRARY_PATH:-}:$(brew --prefix "$library")/lib"
      done
      export LIBRARY_PATH
    fi
    ;;
esac

# Linux/macOS: build C client via make. Windows: node-gyp runs build-c-client.ps1 during npm run build.
if [[ "${PLATFORM_TAG}" != "win32_x64" ]]; then
  ./scripts/build-c-client.sh
fi

npm ci --ignore-scripts
npm run build
assert_prebuild_output
ls -R prebuilds

if [[ "${PLATFORM_TAG}" == "win32_x64" ]]; then
  cleanup_windows_artifacts
fi
