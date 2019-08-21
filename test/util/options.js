// *****************************************************************************
// Copyright 2013-2019 Aerospike, Inc.
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

'use strict'

const Aerospike = require('../../lib/aerospike')
const yargs = require('yargs')
const fs = require('fs')
const path = require('path')

// *****************************************************************************
//  Options parsing
// *****************************************************************************

const parser = yargs
  .usage('$0 [options]')
  .options({
    help: {
      boolean: true,
      describe: 'Display this message.'
    },
    host: {
      alias: 'h',
      default: null,
      describe: 'Aerospike database address.'
    },
    port: {
      alias: 'p',
      default: null,
      describe: 'Aerospike database port.'
    },
    timeout: {
      alias: 't',
      default: 1000,
      describe: 'Timeout in milliseconds.'
    },
    log: {
      alias: 'l',
      default: Aerospike.log.WARN,
      describe: 'Log level [0-5]'
    },
    log_file: {
      alias: 'f',
      default: fs.openSync('test.log', 'a'),
      describe: 'Log file to redirect the log messages'
    },
    namespace: {
      alias: 'n',
      default: 'test',
      describe: 'Namespace for the keys.'
    },
    set: {
      alias: 's',
      default: 'demo',
      describe: 'Set for the keys.'
    },
    user: {
      alias: 'U',
      default: null,
      describe: 'Username to connect to a secure cluster'
    },
    password: {
      alias: 'P',
      default: null,
      describe: 'Password to connect to a secure cluster'
    },
    clusterName: {
      describe: 'Name of the cluster to join'
    },
    cafile: {
      describe: 'Path to a trusted CA certificate file'
    },
    keyfile: {
      describe: 'Path to the client\'s key for mutual auth'
    },
    keyfilePassword: {
      describe: 'Decryption password for the client\'s key file'
    },
    certfile: {
      describe: 'Path to the client\'s certificate chain file for mutual auth'
    }
  })

let options
if (process.env.OPTIONS) {
  options = process.env.OPTIONS.trim().split(' ')
  options = parser.parse(options)
} else {
  options = parser.argv
}

if (options.help === true) {
  parser.showHelp()
  process.exit(0)
}

// enable debug stacktraces
process.env.AEROSPIKE_DEBUG_STACKTRACES = process.env.AEROSPIKE_DEBUG_STACKTRACES || true

function testDir () {
  return path.resolve(__dirname, '..')
}

options.getConfig = function () {
  const defaultPolicy = {
    totalTimeout: options.timeout
  }
  const config = {
    log: {
      level: options.log,
      file: options.log_file
    },
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
      userPath: testDir()
    }
  }

  if (options.host !== null) {
    const host = {
      addr: options.host,
      port: options.port || 3000
    }
    config.hosts = [host]
  } else if (process.env.AEROSPIKE_HOSTS) {
    config.hosts = process.env.AEROSPIKE_HOSTS
  }

  if (options.user !== null) {
    config.user = options.user
  }
  if (options.password !== null) {
    config.password = options.password
  }

  if (options.clusterName) {
    config.clusterName = options.clusterName
  }

  if (options.cafile) {
    config.tls = {
      enable: true,
      cafile: options.cafile,
      certfile: options.certfile,
      keyfile: options.keyfile,
      keyfilePassword: options.keyfilePassword
    }
  }

  return config
}

module.exports = options
