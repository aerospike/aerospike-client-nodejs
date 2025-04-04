 #!/bin/sh

set -e
set -x

# Setup a cluster with RF=3 and 3 nodes in individual racks
aerolab cluster create --count=3 --start=n -i=22.04 -f features.conf 

# Configure rack ids for each node
aerolab conf rackid --nodes=1 --id=1 --no-restart
aerolab conf rackid --nodes=2 --id=2 --no-restart
aerolab conf rackid --nodes=3 --id=3 --no-restart

# Set RF = 3 for all nodes
aerolab attach shell -l all -- sed -i "s/replication-factor 2/replication-factor 3/" /etc/aerospike/aerospike.conf

# restart
aerolab aerospike restart

# Get ip address of seed node
echo SEED_IP=$(aerolab cluster list -j | jq ".[0].IpAddress" | tr -d \")
