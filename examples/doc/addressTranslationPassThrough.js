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

// pass-through uses the addresses the nodes advertise exactly as they are,
// and ignores ipMap. It fits when every node advertises an address the client
// can reach, for example its own public or load balancer address set as its
// access address.
async function runExample ({ args, console }) {
  const config = {
    hosts: [{ addr: args.host, port: args.port }],
    translation: { provider: 'pass-through' },
    log: { level: Aerospike.log.ERROR }
  }
  if (args.user) {
    config.user = args.user
    config.password = args.password
  }

  const client = await Aerospike.connect(config)
  try {
    console.info(`Connected with pass-through, nodes: ${client.getNodes().length}`)
  } finally {
    client.close()
  }
}

module.exports = { name: 'AddressTranslationPassThrough', runExample }
