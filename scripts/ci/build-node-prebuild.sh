#!/usr/bin/env bash
set -euo pipefail

PLATFORM_TAG="${PLATFORM_TAG:?PLATFORM_TAG is required}"
NODE_VERSION="${NODE_VERSION:?NODE_VERSION is required}"

setup_node() {
  if [[ "${RUNNER_OS:-}" == "Windows" ]]; then
    if ! command -v node >/dev/null 2>&1 \
      || [[ "$(node -p "process.version.split('.')[0].slice(1)")" != "${NODE_VERSION}" ]]; then
      choco install nodejs --version="${NODE_VERSION}.18.0" -y --no-progress
      export PATH="/c/Program Files/nodejs:$PATH"
    fi
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

setup_node
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
ls -R prebuilds

if [[ "${PLATFORM_TAG}" == "win32_x64" ]]; then
  cleanup_windows_artifacts
fi
