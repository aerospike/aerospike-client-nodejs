# L5 driver

`driver.js` is the Node.js driver for the pluggable discovery harnesses in
[aerospike-client-conformance](https://github.com/aerospike/aerospike-client-conformance):
`l5-aws` (EKS behind a real PrivateLink endpoint), `l2-proxy` (a local proxy
topology) and `l3-kind` (kind with the Aerospike Kubernetes Operator). It follows
`l5-aws/DRIVER.md` there, contract version 5: it builds a client, applies a fixed
load and reports what the client sees as JSON lines on stdout. The harness causes
the faults and decides every pass or fail.

`../l5-aws.manifest` tells a harness how to set up (Node.js and build tools on
Amazon Linux 2023), build (the C client and the add-on) and run the driver.

The driver reads each node's address, port and active flag, and the client's
partition map, through `_routing()` on the native client. That method is
internal, for this driver only, and not part of the public API.

## Check it against one server

With a server on `127.0.0.1:3000` and its node name from `asinfo -v node`:

```text
printf 'serve smoke\nwatch 127.0.0.1:3000 <node>\nquit\n' | (sleep 5; cat) | \
  node test/discovery/l5/driver.js --seed 127.0.0.1:3000 --shape port-map \
  --port-map <node>=127.0.0.1:3000 --tend-interval 250 --timeout 1000 \
  --namespace test --set smoke
```

Expect `ready`, snapshots about every 100 ms with one node, active and
reachable, `served` with 4096 written and read, a `watch` with a small
`usableMs`, and exit status 0.

## Run the L2 harness locally

`l2-proxy/run.sh` needs docker or podman, bash 4 or later, git, jq, curl and
Python 3.9 or later. On macOS, put a newer bash first on `PATH`
(`brew install bash`), since the harness's helper scripts run `bash` from `PATH`.

A local repository is read with `git archive`, which leaves out submodules, so
the build would have no C client. Run it against a flattened copy that holds the
submodule contents:

```text
flat=/tmp/flat-l5 && rm -rf $flat && mkdir -p $flat
git archive HEAD | tar -x -C $flat
c=$(git ls-tree HEAD aerospike-client-c | awk '{print $3}')
git -C aerospike-client-c archive $c | tar -x -C $flat/aerospike-client-c
git -C aerospike-client-c ls-tree $c modules/ | while read -r _ _ sha path; do
  mkdir -p $flat/aerospike-client-c/$path
  git -C aerospike-client-c/$path archive $sha | tar -x -C $flat/aerospike-client-c/$path
done
(cd $flat && git init -q && git add -A && git commit -qm flat)

l2-proxy/run.sh --client-repo $flat --commit HEAD \
  --manifest test/discovery/l5-aws.manifest --profile all
```

On a Podman machine, the flattened copy and the results must be under a
directory the machine shares, such as `/Users`. Against an https URL the harness
clones the repository, and the manifest initializes the submodules itself.
