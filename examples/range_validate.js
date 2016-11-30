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

// *****************************************************************************
//  node range_validate --start <start> --end <end>
//
//  Write and validate records with keys in given numeric range.
//
//  Examples:
//
//    Write and Validate records with keys in range 1-99:
//
//      node range_validate --start 1 --end 99
//
//    Write and Validate records with keys in range 900-1000
//
//      node range_put --start 900
//
//    Write and Validate a single record with key 99
//
//      node range_validate --start 99 --end 99
// *****************************************************************************

const Aerospike = require('aerospike')
const fs = require('fs')
const yargs = require('yargs')
const deasync = require('deasync')

// *****************************************************************************
// Options parsing
// *****************************************************************************

var argp = yargs
  .usage('$0 [options]')
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
    },
    start: {
      default: 1,
      describe: 'Start value for the key range.'
    },
    end: {
      default: 1000,
      describe: 'End value for the key range.'
    }
  })

var argv = argp.argv

if (argv.help === true) {
  argp.showHelp()
  process.exit(0)
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
  user: argv.user,
  password: argv.password
}

// *****************************************************************************
// Perform the operation
// *****************************************************************************

Aerospike.connect(config, function (err, client) {
  if (err) {
    console.error('Error: Aerospike server connection error. ', err.message)
    process.exit(1)
  }

  //
  // Perform the operation
  //

  const maxConcurrent = 200
  var inFlight = 0

  function putDone (client, start, end) {
    var total = end - start + 1
    var done = 0
    var timeLabel = 'range_put @ ' + total

    console.time(timeLabel)

    return function (err, key) {
      inFlight--
      if (err) {
        console.log('ERR - ', err, key)
      } else {
        console.log('OK - ', key)
      }

      done++
      if (done >= total) {
        console.timeEnd(timeLabel)
        console.log()
        getStart(client, start, end)
      }
    }
  }

  function putStart (client, start, end) {
    var done = putDone(client, start, end)
    var i = 0

    for (i = start; i <= end; i++) {
      var key = new Aerospike.Key(argv.namespace, argv.set, i)
      var record = {
        k: i,
        s: 'abc',
        i: i * 1000 + 123,
        b: new Buffer([0xa, 0xb, 0xc])
      }
      var metadata = {
        ttl: 10000,
        gen: 0
      }

      inFlight++
      deasync.loopWhile(function () { return inFlight > maxConcurrent })
      client.put(key, record, metadata, done)
    }
  }

  function getDone (client, start, end) {
    var total = end - start + 1
    var done = 0
    var timeLabel = 'range_get @ ' + total

    console.time(timeLabel)

    return function (err, record, metadata, key) {
      inFlight--
      done++
      if (err) {
        console.log('ERR - ', err, key)
      } else {
        if (record.k !== key.key) {
          console.log('INVALID - ', key, metadata, record)
          console.log('        - record.k != key.key')
        } else if (record.i !== record.k * 1000 + 123) {
          console.log('INVALID - ', key, metadata, record)
          console.log('        - record.i != record.k * 1000 + 123')
        } else if (record.b[0] === 0xa && record.b[0] === 0xb && record.b[0] === 0xc) {
          console.log('INVALID - ', key, metadata, record)
          console.log('        - record.b != [0xa,0xb,0xc]')
        } else {
          console.log('VALID - ', key, metadata, record)
        }
      }

      if (done >= total) {
        console.timeEnd(timeLabel)
        console.log()
        client.close()
      }
    }
  }

  function getStart (client, start, end) {
    var done = getDone(client, start, end)
    var i = 0

    for (i = start; i <= end; i++) {
      var key = new Aerospike.Key(argv.namespace, argv.set, i)
      inFlight++
      deasync.loopWhile(function () { return inFlight > maxConcurrent })
      client.get(key, done)
    }
  }

  putStart(client, argv.start, argv.end)
})
