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

run_npm() {
  if [[ "${RUNNER_OS:-}" == "Windows" && -n "${NODE_DIR:-}" ]]; then
    # Use npm.cmd from the selected Node install; do not cd away from the repo.
    "${NODE_DIR}/npm.cmd" "$@"
  else
    npm "$@"
  fi
}

export_windows_node_dir() {
  local node_bin node_dir
  node_bin="$(command -v node)"
  node_dir="$(dirname "${node_bin}")"
  if [[ ! -x "${node_dir}/node.exe" || ! -f "${node_dir}/npm.cmd" ]]; then
    echo "ERROR: node/npm not paired under ${node_dir}" >&2
    exit 1
  fi
  export NODE_DIR="${node_dir}"
  export PATH="${NODE_DIR}:${PATH}"
}

setup_node_windows() {
  local node_dir="" candidate major toolcache

  toolcache="${RUNNER_TOOL_CACHE:-/c/hostedtoolcache/windows}"
  shopt -s nullglob
  for candidate in "${toolcache}/Node/${NODE_VERSION}."*/x64; do
    if [[ -x "${candidate}/node.exe" && -f "${candidate}/npm.cmd" ]]; then
      node_dir="${candidate}"
      break
    fi
  done
  shopt -u nullglob

  if [[ -n "${node_dir}" ]]; then
    export NODE_DIR="${node_dir}"
    export PATH="${node_dir}:${PATH}"
    assert_active_node
    return
  fi

  if command -v node >/dev/null 2>&1; then
    major="$(node -p "process.version.split('.')[0].slice(1)")"
    if [[ "${major}" == "${NODE_VERSION}" ]]; then
      export_windows_node_dir
      assert_active_node
      return
    fi
  fi

  # Fallback: download latest patch for the requested major from nodejs.org.
  node_dir="$(pwsh -NoProfile -Command "
    \$major = '${NODE_VERSION}'
    \$dest = Join-Path \$env:RUNNER_TEMP \"node-\$major\"
    if (Test-Path (Join-Path \$dest 'node.exe')) {
      \$unix = '/' + \$dest.Substring(0,1).ToLower() + \$dest.Substring(2).Replace('\\', '/')
      Write-Output \$unix
      exit 0
    }
    \$index = Invoke-RestMethod 'https://nodejs.org/dist/index.json'
    \$match = \$index | Where-Object { \$_.version -match \"^v\$major\\.\" } | Select-Object -First 1
    if (-not \$match) { exit 1 }
    \$ver = \$match.version.TrimStart('v')
    \$zip = Join-Path \$env:RUNNER_TEMP \"node-v\$ver-win-x64.zip\"
    Invoke-WebRequest -Uri \"https://nodejs.org/dist/v\$ver/node-v\$ver-win-x64.zip\" -OutFile \$zip
    Expand-Archive -Path \$zip -DestinationPath \$dest -Force
    Move-Item -Path (Join-Path \$dest \"node-v\$ver-win-x64\\*\") -Destination \$dest -Force
    \$unix = '/' + \$dest.Substring(0,1).ToLower() + \$dest.Substring(2).Replace('\\', '/')
    Write-Output \$unix
  ")" || {
    echo "ERROR: could not provision Node.js ${NODE_VERSION} on Windows" >&2
    exit 1
  }

  export NODE_DIR="${node_dir}"
  export PATH="${node_dir}:${PATH}"
  assert_active_node
}

setup_node() {
  if [[ "${RUNNER_OS:-}" == "Windows" ]]; then
    setup_node_windows
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
  assert_active_node
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

setup_node
node --version
run_npm --version

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

run_npm ci --ignore-scripts
run_npm run build
assert_prebuild_output
ls -R prebuilds

if [[ "${PLATFORM_TAG}" == "win32_x64" ]]; then
  cleanup_windows_artifacts
fi
