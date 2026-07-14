#!/usr/bin/env bash
set -euo pipefail

PLATFORM_TAG="${PLATFORM_TAG:?PLATFORM_TAG is required}"
NODE_VERSION="${NODE_VERSION:?NODE_VERSION is required}"

setup_node() {
  if [[ "${RUNNER_OS:-}" == "Windows" ]]; then
    choco install nodejs --version="${NODE_VERSION}.18.0" -y --no-progress || true
    export PATH="/c/Program Files/nodejs:$PATH"
    return
  fi

  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  if [[ ! -s "$NVM_DIR/nvm.sh" ]]; then
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
  fi
  # shellcheck disable=SC1091
  source "$NVM_DIR/nvm.sh"
  nvm install "${NODE_VERSION}"
  nvm use "${NODE_VERSION}"
}

patch_windows_props() {
  pwsh -NoProfile -Command '''
    $path = "props\nodejs.props"
    $content = Get-Content $path -Raw
    $pattern = "<AdditionalLibraryDirectories>.*?</AdditionalLibraryDirectories>"
    $basePath = (Resolve-Path .).Path
    $replacement = "<AdditionalLibraryDirectories>`$(NodejsPath);$basePath\packages\openssl-native.3.0.16\lib\win-x64\native;%(AdditionalIncludeDirectories)</AdditionalLibraryDirectories>"
    $updated = [System.Text.RegularExpressions.Regex]::Replace($content, $pattern, $replacement, "Singleline")
    Set-Content $path $updated
    Get-Content $path
  ''' --working-directory aerospike-client-c/vs
}

cleanup_windows_artifacts() {
  pwsh -NoProfile -Command '''
    Copy-Item -Path "aerospike-client-c\vs\packages\openssl-native.3.0.16\lib\win-x64\native\libssl.lib" -Destination "build\Release\libssl.lib" -Force
    Copy-Item -Path "aerospike-client-c\vs\packages\openssl-native.3.0.16\lib\win-x64\native\libcrypto.lib" -Destination "build\Release\libcrypto.lib" -Force
    Remove-Item -Recurse -Force .\build\release\obj -ErrorAction SilentlyContinue
    Remove-Item -Force .\build\release\aerospike.pdb -ErrorAction SilentlyContinue
    Remove-Item -Force .\build\release\aerospike.ipdb -ErrorAction SilentlyContinue
    Remove-Item -Force .\build\release\aerospike.iobj -ErrorAction SilentlyContinue
  '''
}

setup_node
node --version
npm --version

case "${PLATFORM_TAG}" in
  win32_x64)
    nuget restore aerospike-client-c/vs
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

./scripts/build-c-client.sh
npm ci --ignore-scripts
npm run build
ls -R prebuilds

if [[ "${PLATFORM_TAG}" == "win32_x64" ]]; then
  cleanup_windows_artifacts
fi
