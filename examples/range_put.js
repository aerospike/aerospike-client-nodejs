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
//  node range_put --start <start> --end <end> --skip <skip>
//
//  Write records with given key range.
//
//  Examples:
//
//    Write records with keys in range 1-100
//
//      node range_put --start 1 --end 100
//
//    Read records with keys in range 1-100, skipping every 5th key (in sequence)
//
//      node range_get --start 1 --end 100 --skip 5
//
//    Write records with keys in range 900-1000
//
//      node range_put --start 900
// *****************************************************************************

const fs = require('fs')
const Aerospike = require('aerospike')
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
    },
    skip: {
      default: 0,
      describe: 'Skip every n keys.'
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

  function putDone (client, start, end, skip) {
    var total = end - start + 1
    var done = 0
    var success = 0
    var failure = 0
    var skipped = 0
    var timeLabel = 'range_put @ ' + total

    console.time(timeLabel)

    return function (err, key, skippy) {
      inFlight--
      if (skippy === true) {
        console.log('SKIP - ', key)
        skipped++
      } else if (err) {
        console.log('ERR - ', err, key)
        failure++
      } else {
        console.log('OK - ', key)
        success++
      }

      done++
      if (done >= total) {
        console.timeEnd(timeLabel)
        console.log()
        console.log('RANGE: start=%d end=%d skip=%d', start, end, skip)
        console.log('RESULTS: (%d completed, %d success, %d failed, %d skipped)', done, success, failure, skipped)
        console.log()
        client.close()
      }
    }
  }

  function putStart (client, start, end, skip) {
    var done = putDone(client, start, end, skip)
    var i = start
    var s = 0

    for (; i <= end; i++) {
      var key = new Aerospike.Key(argv.namespace, argv.set, i)

      if (skip !== 0 && ++s >= skip) {
        s = 0
        done(null, key, true)
        continue
      }

      var record = {
        k: i,
        s: 'abc',
        i: i * 1000 + 123,
        b: Buffer.from([0xa, 0xb, 0xc])
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

  putStart(client, argv.start, argv.end, argv.skip)
})
