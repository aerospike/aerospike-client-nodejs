#!/usr/bin/env bash
#
# Node.js's own L2 tests for the l2-proxy harness in aerospike-client-conformance
# (l2-proxy/README.md there, "A client's own tests"), run by
# test/discovery/l5-aws.manifest as L2_RUN once per profile, in a container on
# the client network with the topology's values file as its environment and
# L2_PROFILE naming the profile. Uses only what L5_BUILD installed: the
# container has no network access beyond the topology.

set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/../.."
: "${L2_PROFILE:?L2_PROFILE is required}"
GLOBAL_CLIENT=false exec npx mocha --no-config --require choma --require mocha-clean \
  --node-option import=tsx --timeout 300000 --exit test/discovery/l2/l2_run.ts
