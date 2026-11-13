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

// port-map maps each address a node advertises (host:port, or the node name)
// to the host:port the client should connect to, for example a load balancer
// that gives each node its own port. Keys use the addresses the client reads:
// the alternate ones when useAlternateAccessAddress is on. With onMiss
// 'strict', a node with no entry is skipped and logged instead of reached at
// its advertised address. Configured seed hosts are used as they are.
async function runExample ({ args, console }) {
  const config = {
    hosts: [{ addr: args.host, port: args.port }],
    translation: {
      provider: 'port-map',
      portMap: {
        '10.0.0.1:3000': `${args.host}:${args.port}`,
        '10.0.0.2:3000': `${args.host}:${args.port + 1}`
      },
      onMiss: 'passThrough'
    },
    log: { level: Aerospike.log.ERROR }
  }
  if (args.user) {
    config.user = args.user
    config.password = args.password
  }

  const client = await Aerospike.connect(config)
  try {
    console.info(`Connected with port-map, nodes: ${client.getNodes().length}`)
  } finally {
    client.close()
  }
}

module.exports = { name: 'AddressTranslationPortMap', runExample }
