// *****************************************************************************
// Copyright 2026 Aerospike, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License")
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
// *****************************************************************************

const Aerospike = require('../harness/aerospikeClient')

// The dns provider finds seed hosts from DNS: A and AAAA records with a fixed
// port, or SRV records, which carry each host's port. It runs at connect and
// refreshes the seeds every refreshIntervalMs. With mergePolicy 'merge', the
// configured hosts are tried first and the discovered seeds after them, so
// the client still connects if the name doesn't resolve. Set
// AEROSPIKE_SEED_DNS_NAME to a name that resolves to your cluster to try it.
async function runExample ({ args, console }) {
  const name = process.env.AEROSPIKE_SEED_DNS_NAME || 'aerospike.example.com'
  const config = {
    hosts: [{ addr: args.host, port: args.port }],
    discovery: {
      provider: 'dns',
      dns: { names: [name], recordType: 'A', port: args.port },
      mergePolicy: 'merge',
      refreshIntervalMs: 30000
    },
    log: { level: Aerospike.log.ERROR }
  }
  if (args.user) {
    config.user = args.user
    config.password = args.password
  }

  const client = await Aerospike.connect(config)
  try {
    console.info(`Connected with dns seed discovery for ${name}, nodes: ${client.getNodes().length}`)
  } finally {
    client.close()
  }
}

module.exports = { name: 'SeedDiscoveryDns', runExample }
