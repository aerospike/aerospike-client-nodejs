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
//
// node logging --log-file <path/to/log-file> --log-level <0-4>
//
// Demonstrates logging from the API, for PUT and GET functions.
//
// Examples:
//
//  Enable Debug logging to stderr.
//
//      node logging --log-level 3.
//
//  Enable Detail logging to stderr.
//
//     node logging --log-level 4.
//
//  Redirect the log messages to a file `example.log`
//
//     node logging --log-level <0-4> --log-file example.log
//
// *****************************************************************************

const Aerospike = require('aerospike')
const fs = require('fs')
const yargs = require('yargs')

// *****************************************************************************
// Options parsing
// *****************************************************************************

var argp = yargs
  .usage('$0 [options] logfile')
  .options({
    help: {
      boolean: true,
      describe: 'Display this message.'
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
      describe: 'Password to connectt to secured cluster'
    }
  })

var argv = argp.argv
var logfile = argv._.length === 1 ? argv._[0] : null

if (argv.help === true) {
  argp.showHelp()
  process.exit(0)
}

if (logfile === null) {
  console.error('Error: Please provide a logfile for the operation')
  console.error()
  argp.showHelp()
  process.exit(1)
}

// *****************************************************************************
// Perform the operation
// *****************************************************************************

function header (message) {
  return function (client, callback) {
    console.log('')
    console.log('********************************************************************************')
    console.log('* ', message)
    console.log('********************************************************************************')
    console.log('')
    callback()
  }
}

function get (key) {
  return function (client, callback) {
    console.log('*** get')
    client.get(key, function (err, record, metadata, key) {
      callback(err)
    })
  }
}

function put (key, rec) {
  return function (client, callback) {
    console.log('*** put')
    client.put(key, rec, function (err, key) {
      callback(err)
    })
  }
}

function log (level, file) {
  return function (client, callback) {
    var fd
    if (file) {
      if (!isNaN(parseInt(file, 10)) && isFinite(file)) {
        fd = parseInt(file, 10)
      } else {
        fd = fs.openSync(file, 'a')
      }
    }

    console.log('*** log level=%d file=%s', level, file)
    client.updateLogging({
      level: level,
      file: fd
    })
    callback()
  }
}

var key = new Aerospike.Key(argv.namespace, argv.set, 'abc')

var operations = [
  header('Log: default settings'),
  put(key, { a: 1 }),
  get(key),

  header('Log: level=4(TRACE)'),
  log(5, null),
  put(key, { a: 2 }),
  get(key),

  header('Log: file=' + logfile),
  log(null, logfile),
  put(key, { a: 3 }),
  get(key),

  header('Log: level=3(DEBUG) file=STDERR'),
  log(3, 2),
  put(key, { a: 4 }),
  get(key)
]

function run (client, done) {
  operations.reduceRight(function (r, l) {
    return function (err) {
      if (err) {
        return err
      } else {
        l(client, r)
      }
    }
  }, done)()
}

// *****************************************************************************
// Establish a connection to the cluster.
// *****************************************************************************

var config = {
  hosts: argv.host,
  policies: {
    timeout: argv.timeout
  },
  user: argv.user,
  password: argv.password
}

Aerospike.connect(config, function (err, client) {
  if (err) throw err
  run(client, function () {
    client.close()
  })
})
