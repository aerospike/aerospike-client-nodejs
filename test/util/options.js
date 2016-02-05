// *****************************************************************************
// Copyright 2013-2016 Aerospike, Inc.
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
const aerospike = require('../../lib/aerospike')
const yargs = require('yargs')
const fs = require('fs')

// *****************************************************************************
//  Options parsing
// *****************************************************************************

var parser = yargs
  .usage('$0 [options]')
  .options({
    help: {
      boolean: true,
      describe: 'Display this message.'
    },
    host: {
      alias: 'h',
      default: '127.0.0.1',
      describe: 'Aerospike database address.'
    },
    port: {
      alias: 'p',
      default: 3000,
      describe: 'Aerospike database port.'
    },
    timeout: {
      alias: 't',
      default: 1000,
      describe: 'Timeout in milliseconds.'
    },
    log: {
      alias: 'l',
      default: aerospike.log.INFO,
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
    run_aggregation: {
      default: false,
      describe: 'Set this to true to run aggregation tests'
    }
  })

var options = process.env['OPTIONS'] ? parser.parse(process.env['OPTIONS'].trim().split(' ')) : parser.argv

options.getConfig = function () {
  var test_dir = __dirname.split('/').slice(0, -1).join('/')
  var config = {
    hosts: [{addr: options.host, port: options.port}],
    log: {level: options.log, file: options.log_file},
    policies: {timeout: options.timeout},
    modlua: {userPath: test_dir}
  }
  if (options.user !== null) {
    config.user = options.user
  }
  if (options.password !== null) {
    config.password = options.password
  }
  return config
}
if (options.help === true) {
  parser.showHelp()
  process.exit(0)
}

module.exports = options
