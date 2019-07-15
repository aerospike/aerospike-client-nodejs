// *****************************************************************************
// Copyright 2018 Aerospike, Inc.
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

const Aerospike = require('aerospike')
const path = require('path')

const UDF_USERDIR = path.normalize(path.join(__dirname, '..', 'lua'))

module.exports = exports = function (argv) {
  const config = defaultConfig(argv)
  Aerospike.setDefaultLogging(config.log)
  const client = Aerospike.client(config)
  client.captureStackTraces = argv.debugStacktraces
  return client
}

function defaultConfig (argv) {
  const defaultPolicy = {
    totalTimeout: argv.timeout
  }
  return {
    hosts: argv.hosts,
    port: argv.port,
    policies: {
      apply: defaultPolicy,
      batch: defaultPolicy,
      info: defaultPolicy,
      operate: defaultPolicy,
      query: defaultPolicy,
      read: defaultPolicy,
      remove: defaultPolicy,
      scan: defaultPolicy,
      write: defaultPolicy
    },
    modlua: {
      userPath: UDF_USERDIR
    },
    log: {
      level: Aerospike.log.WARN + argv.verbose
    }
  }
}
