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

// The seed host name below doesn't resolve; ipMap replaces it with the
// server's real address. The same map applies to the addresses the server
// reports for its other nodes, so a client outside a private network can
// reach nodes that advertise internal addresses. Only the host is replaced;
// the port stays the same.
async function runExample ({ args, console }) {
  const config = {
    hosts: [{ addr: 'aerospike-node-1.internal.example', port: args.port }],
    ipMap: { 'aerospike-node-1.internal.example': args.host },
    log: { level: Aerospike.log.ERROR }
  }
  if (args.user) {
    config.user = args.user
    config.password = args.password
  }

  const client = await Aerospike.connect(config)
  try {
    console.info(`Connected through ipMap to ${client.getNodes().map(node => node.address).join(', ')}`)
  } finally {
    client.close()
  }
}

module.exports = { name: 'AddressTranslationIpMap', runExample }
