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
// Benchmark Worker, run operations and report results.
// *****************************************************************************

var aerospike = require('aerospike')
var cluster = require('cluster')
var util = require('util')
var winston = require('winston')
var stats = require('./stats')
var status = aerospike.status
var alerts = require('./alerts.js')
var argv = require('./config.json')

// *****************************************************************************
//  MACROS
// *****************************************************************************

var OP_TYPES = 4 // READ, WRITE, QUERY and SCAN
var READ = 0
var WRITE = 1
var QUERY = 2
var SCAN = 3
var TPS = 0
var TIMEOUT = 1
var ERROR = 2

if (!cluster.isWorker) {
  console.error('worker.js must only be run as a child process of main.js.')
  process.exit()
}

argv.ttl = stats.parseTimeToSecs(argv.ttl)

// variables to track memory growth(RSS) of worker process.
var heapMemory = 0
var initialFlux = true
var memGrowth = 0
var FLUX_PERIOD = 5

// *****************************************************************************
// Logging
// *****************************************************************************

var logger = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)({
      level: 'info',
      silent: false,
      colorize: true
    })
  ]
})

// *****************************************************************************
// Aerospike Client
// *****************************************************************************

let defaultPolicy = {
  totalTimeout: argv.timeout
}
let config = {
  policies: {
    read: defaultPolicy,
    write: defaultPolicy
  },
  sharedMemory: {
    key: 0xA5000000,
    maxNodes: 16,
    maxNamespaces: 8,
    takeoverThresholdSeconds: 30
  }
}

if (argv.host) {
  config.hosts = [{addr: argv.host, port: argv.port || 3000}]
}

if (argv.user !== null) {
  config.user = argv.user
}

if (argv.password !== null) {
  config.password = argv.password
}

var client = aerospike.client(config)

client.connect(function (err) {
  if (err) {
    logger.error('Aerospike server connection error: ', err)
    process.exit(1)
  } else {
    logger.info('worker connected: ' + client.config.hosts)
  }
})

// *****************************************************************************
// Operations
// *****************************************************************************
/**
* key are in range [min ... max]
*/
function keygen (min, max) {
  var rand = Math.floor(Math.random() * 0x100000000) % (max - min + 1) + min
  return rand < 1 ? 1 : rand
}

var STRING_DATA = 'This the test data to be written to the server'
/**
* Generate a record with string and blob in it if run for longevity.
* Size of strings and blob is argv.datasize ( default 1K).
*
*
*/
function recordgen (key, binSpec) {
  var data = {}
  var i = 0
  do {
    var bin = binSpec[i]
    switch (bin.type) {
      case 'INTEGER':
        data[bin.name] = key
        break
      case 'STRING':
        data[bin.name] = STRING_DATA
        while (data[bin.name].length < bin.size) {
          data[bin.name] += STRING_DATA
        }
        data[bin.name] += key
        break
      case 'BYTES':
        var bufData = STRING_DATA
        while (bufData.length < bin.size) {
          bufData += STRING_DATA
        }
        data[bin.name] = Buffer.from(bufData)
        break
      default:
        data.num = key
        break
    }
    i++
  } while (i < binSpec.length)
  return data
}

function get (key, done) {
  var timeStart = process.hrtime()
  client.get(key, function (_error, _record, _metadata, _key) {
    var timeEnd = process.hrtime()
    var status = (_error && _error.code) || 0
    done(status, timeStart, timeEnd, READ)
  })
}

function getPromise (key, done) {
  var timeStart = process.hrtime()
  client.get(key)
    .then(() => done(0, timeStart, process.hrtime(), READ))
    .catch((err) => done(err.code, timeStart, process.hrtime(), READ))
}

// set the ttl for the write
var metadata = {
  ttl: argv.ttl
}

function put (options, done) {
  var timeStart = process.hrtime()
  client.put(options.key, options.record, metadata, function (_error, _record, _metadata, _key) {
    var timeEnd = process.hrtime()
    var status = (_error && _error.code) || 0
    done(status, timeStart, timeEnd, WRITE)
  })
}

function putPromise (options, done) {
  var timeStart = process.hrtime()
  client.put(options.key, options.record, metadata)
    .then(() => done(0, timeStart, process.hrtime(), WRITE))
    .catch((err) => done(err.code, timeStart, process.hrtime(), WRITE))
}

// Structure to store per second statistics.
var intervalData = new Array(OP_TYPES)
resetIntervalData()

function run (options) {
  var expected = options.rops + options.wops
  var completed = 0

  // @ TO-DO optimization.
  // Currently stats of all the operations is collected and sent to
  // master at the end of an iteration.
  // Master puts the stats in appropriate histogram.
  // Consider having histogram for each worker Vs sending the
  // results in an array - Which one is more memory efficient.
  var operations = Array(expected)
  var readOps = options.rops
  var writeOps = options.wops

  function done (opStatus, opTimeStart, opTimeEnd, opType) {
    operations[completed] = [opStatus, opTimeStart, opTimeEnd]
    intervalData[opType][TPS]++
    if (opStatus === status.ERR_TIMEOUT) {
      intervalData[opType][TIMEOUT]++
    } else if (opStatus !== status.OK && opStatus !== status.ERR_TIMEOUT) {
      intervalData[opType][ERROR]++
    }

    completed++

    if (completed >= expected) {
      process.send(['stats', operations])
    }
  }

  var usePromises = options.promises

  while (writeOps > 0 || readOps > 0) {
    var k = keygen(options.keyRange.min, options.keyRange.max)
    var key = {ns: options.namespace, set: options.set, key: k}
    var record = recordgen(k, options.binSpec)
    var ops = {key: key, record: record}
    if (writeOps > 0) {
      writeOps--
      if (usePromises) {
        putPromise(ops, done)
      } else {
        put(ops, done)
      }
    }
    if (readOps > 0) {
      readOps--
      if (usePromises) {
        getPromise(key, done)
      } else {
        get(key, done)
      }
    }
  }
}

/*
 * Sends the populated intervalData to the parent and resets it for the next second
 */
function respond () {
  process.send(['trans', intervalData])
  resetIntervalData()
}

/*
 * Reset intervalData
 */
function resetIntervalData () {
  intervalData[READ] = [0, 0, 0] // [reads_performed, reads_timeout, reads_error]
  intervalData[WRITE] = [0, 0, 0] // [writes_performed, writes_timeout, writes_error]
  intervalData[QUERY] = [0, 0, 0] // [QueryRecords, query_timeout, query_error]
  intervalData[SCAN] = [0, 0, 0]
}

/*
 * Execute the long running job.
 */

function executeJob (options, opType, callback) {
  var job = client.query(options.namespace, options.set, options.statement)
  var stream = job.execute()
  stream.on('data', function (record) {
    // count the records returned
    intervalData[opType][TPS]++
  })
  stream.on('error', function (error) {
    intervalData[opType][ERROR]++
    if (error.code === status.ERR_TIMEOUT) {
      intervalData[opType][TIMEOUT]++
    }
  })
  stream.on('end', function () {
    // update a stat for number of jobs completed.
    callback(options)
  })
}

var runLongRunningJob = function (options) {
  if (options.statement.filters === undefined) {
    executeJob(options, SCAN, runLongRunningJob)
  } else {
    executeJob(options, QUERY, runLongRunningJob)
  }
}

var monitorMemory = function () {
  var currentMemory = process.memoryUsage()
  currentMemory.pid = process.pid
  if (heapMemory < currentMemory.heapUsed) {
    memGrowth++
    if (!initialFlux && memGrowth >= FLUX_PERIOD) {
      var alertData = {
        alert: currentMemory,
        severity: alerts.severity.HIGH
      }
      memGrowth = 0
      process.send(['alert', alertData])
    } else if (initialFlux && memGrowth >= FLUX_PERIOD) {
      initialFlux = false
      memGrowth = 0
    }
  }
  heapMemory = currentMemory.heapUsed
}
// log the memory footprint of the process every 10 minutes.
// when it is run in longevity mode.
if (argv.longevity) {
  setInterval(monitorMemory, 6000)
}
// *****************************************************************************
// Event Listeners
// *****************************************************************************

//
// Listen for exit signal from parent. Hopefully we can do a clean
// shutdown and emit results.
//
process.on('exit', function () {
  logger.debug('Exiting.')
})

process.on('SIGINT', function () {
  logger.debug('Received SIGINT.')
  process.exit(0)
})

process.on('SIGTERM', function () {
  logger.debug('Received SIGTERM.')
  process.exit(0)
})

/**
 * Listen for messages from the parent. This is useful, if the parent
 * wants to run the child for a duration of time, rather than a
 * number of operations.
 *
 *  KEY         := STRING | INTEGER
 *  PUT         := '[' "put" ',' KEY ',' RECORD ']'
 *  GET         := '[' "get" ',' KEY ']'
 *  OPERATION   := GET | PUT
 *  OPERATIONS  := '[' OPERATION+ ']'
 *  COMMAND     := "run" ',' OPERATIONS
 *
 *  MESSAGE     := '[' COMMAND ']'
 */
process.on('message', function (msg) {
  logger.debug('command: ', util.inspect(msg[0]))
  switch (msg[0]) {
    case 'run':
      return run(msg[1])
    case 'query':
      return runLongRunningJob(msg[1])
    case 'trans':
      return respond()
    default:
      return process.exit(0)
  }
})
