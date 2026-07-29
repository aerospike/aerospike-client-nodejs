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

const path = require('path')
const Aerospike = require('../harness/aerospikeClient')

async function runExample ({ args, console }) {
  const configPath = path.join(__dirname, '..', 'harness', 'fixtures', 'dynamic_config.yml')
  const defaultPolicy = {
    timeout: args.totalTimeout,
    totalTimeout: args.totalTimeout
  }
  const config = {
    hosts: [{ addr: args.host, port: args.port }],
    configProvider: {
      path: configPath,
      interval: 1
    },
    policies: {
      read: defaultPolicy,
      write: defaultPolicy,
      info: defaultPolicy
    },
    log: {
      level: Aerospike.log.WARN
    }
  }
  if (args.user) {
    config.user = args.user
    config.password = args.password
  }

  Aerospike.setDefaultLogging(config.log)
  const client = await Aerospike.connect(config)
  try {
    const build = await client.infoAny('build')
    console.info(`Dynamic config connect: ${build.split('\n')[0]}`)
  } finally {
    client.close()
  }
}

module.exports = { name: 'DynamicConfig', runExample }
