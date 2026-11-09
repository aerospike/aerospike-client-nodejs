#!/usr/bin/env bash
# Build the patched client from source (macOS arm64, Node 22) and run the expression-conversion
# checks: equivalence (legacy vs fast, byte for byte), leak, performance, and the repo's own
# expression test files against a server, once per mode.
#
#   cd aerospike-client-nodejs && benchmarks/exp_compile/build-and-run.sh
#   SKIP_BUILD=1 ...     reuse an existing build/Release/aerospike.node
#
# Server: AEROSPIKE_HOSTS (default 127.0.0.1:3100), namespace AEROSPIKE_NS (default poc).
set -euo pipefail

cd "$(dirname "$0")/../.."
export AEROSPIKE_HOSTS=${AEROSPIKE_HOSTS:-127.0.0.1:3100}
export AEROSPIKE_NS=${AEROSPIKE_NS:-poc}
HOST=${AEROSPIKE_HOSTS%:*}
PORT=${AEROSPIKE_HOSTS#*:}

if [ "${SKIP_BUILD:-0}" != "1" ]; then
  echo "== build: C client (libuv), then the addon"
  ./scripts/build-c-client.sh > build-c-client.log 2>&1 || { tail -40 build-c-client.log; exit 1; }
  npm install --ignore-scripts --no-audit --no-fund > npm-install.log 2>&1
  npx node-gyp rebuild --addon_version="$(node -p "require('./package.json').version")" > node-gyp.log 2>&1 || { tail -40 node-gyp.log; exit 1; }
fi
# the loader prefers an npm prebuild over build/Release: move it aside (common.js also refuses to run otherwise)
for d in node_modules/@aerospike/prebuild-*; do [ -d "$d" ] && mv "$d" "node_modules/@aerospike/.$(basename "$d").disabled"; done
ls -la build/Release/aerospike.node

echo; echo "== equivalence (legacy vs fast)"
node benchmarks/exp_compile/equivalence.js

echo; echo "== leak"
node benchmarks/exp_compile/leak.js

echo; echo "== repo expression tests, per mode"
for legacy in 1 0; do
  echo "-- AEROSPIKE_EXP_LEGACY=$legacy"
  # test/util/options.ts parses the same argv as mocha: use --opt=value so mocha sees no positionals
  # --no-config: .mocharc's spec (test/*.ts) would otherwise add the whole suite
  AEROSPIKE_EXP_LEGACY=$legacy npx mocha --no-config --require choma --require mocha-clean --node-option import=tsx test/exp.ts test/exp_list.ts test/exp_map.ts test/exp_bit.ts test/exp_hll.ts \
    --reporter dot --host="$HOST" --port="$PORT" --namespace="$AEROSPIKE_NS" 2>&1 | tail -15 || true
done

echo; echo "== performance"
node benchmarks/exp_compile/perf.js
