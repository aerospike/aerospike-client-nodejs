// *****************************************************************************
// Copyright 2013-2017 Aerospike, Inc.
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

// *****************************************************************************
// Get state information from the cluster or a single host.
// *****************************************************************************

const Aerospike = require('aerospike')
const fs = require('fs')
const yargs = require('yargs')

// *****************************************************************************
// Options parsing
// *****************************************************************************

var argp = yargs
  .usage('$0 [options] filepath')
  .options({
    help: {
      boolean: true,
      describe: 'Display this message.'
    },
    quiet: {
      alias: 'q',
      boolean: true,
      describe: 'Do not display content.'
    },
    host: {
      alias: 'h',
      default: process.env.AEROSPIKE_HOSTS || 'localhost:3000',
      describe: 'Aerospike database address.'
    },
    timeout: {
      alias: 't',
      default: 1000,
      describe: 'Timeout in milliseconds.'
    },
    'log-level': {
      alias: 'l',
      default: Aerospike.log.INFO,
      describe: 'Log level [0-5]'
    },
    'log-file': {
      default: undefined,
      describe: 'Path to a file send log messages to.'
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
      describe: 'Username to connect to secured cluster'
    },
    password: {
      alias: 'P',
      default: null,
      describe: 'Password to connect to secured cluster'
    }
  })

var argv = argp.argv
var file = argv._.shift()

if (argv.help === true) {
  argp.showHelp()
  process.exit(0)
}

if (!file) {
  console.error('Error: Please provide a file to register.')
  console.error()
  argp.showHelp()
  process.exit(1)
}

// *****************************************************************************
// Configure the client.
// *****************************************************************************

var config = {
  hosts: argv.host,
  log: {
    level: argv['log-level'],
    file: argv['log-file'] ? fs.openSync(argv['log-file'], 'a') : 2
  },
  policies: {
    timeout: argv.timeout
  },
  modlua: {
    userPath: __dirname
  },
  user: argv.user,
  password: argv.password
}

// *****************************************************************************
// Perform the operation
// *****************************************************************************

function run (client, done) {
  client.udfRegister(file, function (err, job) {
    if (err) throw err
    job.waitUntilDone(function (err) {
      if (err) throw err
      !argv.quiet && console.log('UDF module registered successfully: %s', file)
      done()
    })
  })
}

Aerospike.connect(config, function (err, client) {
  if (err) throw err
  run(client, function () {
    client.close()
  })
})
