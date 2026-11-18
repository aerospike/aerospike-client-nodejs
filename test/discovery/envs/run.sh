#!/usr/bin/env bash
#
# The command of aerospike-client-conformance's test-envs workflow for the
# Node.js client: builds the client from the caller's checkout (which has no
# submodules) unless it is already built, then runs test/discovery/envs/envs.ts
# against the environment that is up, whose values file is in the environment.

set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/../../.."
: "${ENV_NAME:?ENV_NAME is required: run this with the values of an environment loaded}"

if [ ! -f aerospike-client-c/Makefile ]; then
  git submodule update --init --recursive
fi
if ! ls build/Release/aerospike.node >/dev/null 2>&1; then
  # The runner image is not ours: install what the C client and libuv build
  # need, as the C client's own environment runs do.
  if [ "$(uname -s)" = Linux ] && command -v apt-get >/dev/null; then
    sudo apt-get update -q
    sudo apt-get install -y -q --no-install-recommends build-essential autoconf automake libtool \
      make pkg-config libssl-dev libyaml-dev zlib1g-dev
  fi
  npm ci --ignore-scripts
  ./scripts/build-c-client.sh
  npm run build
fi

run_tests() {
  GLOBAL_CLIENT=false npx mocha --no-config --require choma --require mocha-clean \
    --node-option import=tsx --timeout 300000 --exit test/discovery/envs/envs.ts
}

if [ "$ENV_NAME" != tls-matching ]; then
  run_tests
  exit
fi

# tls-matching: the proxy cluster once, then each certificate case in its own
# process, as the Java and C clients run them: the client logs the legacy name
# check's warning once per name in a process.
status=0
run_tests || status=1
IFS=, read -r -a cases <<< "${TLS_CASES:?TLS_CASES is required}"
for c in "${cases[@]}"; do
  echo "== TLS case $c"
  TLS_CASE="$c" run_tests || status=1
done
exit "$status"

