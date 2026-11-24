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

// A seed provider written in JavaScript. Here it stands in for a service
// registry (Consul, an internal API, ...) and returns the example's host; a
// real one would look the seeds up, asynchronously. The client calls it at
// connect and, because needsPeriodicRefresh() returns true, every
// refreshIntervalMs after that.
class RegistrySeedProvider {
  constructor (host, port) {
    this.host = host
    this.port = port
  }

  async refreshSeedCandidates (ctx) {
    // ctx: { clusterName, configuredSeeds, tendIteration }
    return [{ addr: this.host, port: this.port }]
  }

  needsPeriodicRefresh () {
    return true
  }

  close () {
    // Release the registry client here.
  }
}

async function runExample ({ args, console }) {
  const config = {
    // No hosts: the provider supplies the seeds.
    hosts: [],
    discovery: {
      provider: new RegistrySeedProvider(args.host, args.port),
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
    console.info(`Connected through a JavaScript seed provider, nodes: ${client.getNodes().length}`)
  } finally {
    client.close()
  }
}

module.exports = { name: 'SeedDiscoveryCustom', runExample }
