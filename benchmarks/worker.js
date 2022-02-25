// *****************************************************************************
// Copyright 2013-2022 Aerospike, Inc.
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

const aerospike = require('aerospike')
const cluster = require('cluster')
const util = require('util')
const { logger } = require('./logging')
const stats = require('./stats')
const alerts = require('./alerts.js')
const argv = require('./config.json')

const status = aerospike.status

// *****************************************************************************
//  MACROS
// *****************************************************************************

const OP_TYPES = 4 // READ, WRITE, QUERY and SCAN
const READ = 0
const WRITE = 1
const QUERY = 2
const SCAN = 3
const TPS = 0
const TIMEOUT = 1
const ERROR = 2

if (!cluster.isWorker) {
  console.error('worker.js must only be run as a child process of main.js.')
  process.exit()
}

argv.ttl = stats.parseTimeToSecs(argv.ttl)

// variables to track memory growth(RSS) of worker process.
let heapMemory = 0
let initialFlux = true
let memGrowth = 0
const FLUX_PERIOD = 5

// *****************************************************************************
// Aerospike Client
// *****************************************************************************

const defaultPolicy = {
  totalTimeout: argv.totalTimeout
}
const config = {
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
  config.hosts = [{ addr: argv.host, port: argv.port || 3000 }]
}

if (argv.user !== null) {
  config.user = argv.user
}

if (argv.password !== null) {
  config.password = argv.password
}

const client = aerospike.client(config)

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
  const rand = Math.floor(Math.random() * 0x100000000) % (max - min + 1) + min
  return rand < 1 ? 1 : rand
}

const STRING_DATA = 'This the test data to be written to the server'
/**
* Generate a record with string and blob in it if run for longevity.
* Size of strings and blob is argv.datasize ( default 1K).
*
*
*/
function recordgen (key, binSpec) {
  const data = {}
  let i = 0
  do {
    const bin = binSpec[i]
    switch (bin.type) {
      case 'INTEGER': {
        data[bin.name] = key
        break
      }
      case 'STRING': {
        data[bin.name] = STRING_DATA
        while (data[bin.name].length < bin.size) {
          data[bin.name] += STRING_DATA
        }
        data[bin.name] += key
        break
      }
      case 'BYTES': {
        let bufData = STRING_DATA
        while (bufData.length < bin.size) {
          bufData += STRING_DATA
        }
        data[bin.name] = Buffer.from(bufData)
        break
      }
      default: {
        data.num = key
        break
      }
    }
    i++
  } while (i < binSpec.length)
  return data
}

function get (key, done) {
  const timeStart = process.hrtime()
  client.get(key, function (error) {
    const status = (error && error.code) || 0
    done(status, process.hrtime(timeStart), READ)
  })
}

function getPromise (key, done) {
  const timeStart = process.hrtime()
  client.get(key)
    .then(() => done(0, process.hrtime(timeStart), READ))
    .catch((err) => done(err.code, process.hrtime(timeStart), READ))
}

// set the ttl for the write
const metadata = {
  ttl: argv.ttl
}

function put (options, done) {
  const timeStart = process.hrtime()
  client.put(options.key, options.record, metadata, function (error) {
    const status = (error && error.code) || 0
    done(status, process.hrtime(timeStart), WRITE)
  })
}

function putPromise (options, done) {
  const timeStart = process.hrtime()
  client.put(options.key, options.record, metadata)
    .then(() => done(0, process.hrtime(timeStart), WRITE))
    .catch((err) => done(err.code, process.hrtime(timeStart), WRITE))
}

// Structure to store per second statistics.
const intervalData = new Array(OP_TYPES)
resetIntervalData()

function run (options) {
  const expected = options.rops + options.wops
  let completed = 0

  // @ TO-DO optimization.
  // Currently stats of all the operations is collected and sent to
  // master at the end of an iteration.
  // Master puts the stats in appropriate histogram.
  // Consider having histogram for each worker Vs sending the
  // results in an array - Which one is more memory efficient.
  const operations = Array(expected)
  let readOps = options.rops
  let writeOps = options.wops

  function done (opStatus, elapsed, opType) {
    operations[completed] = [opStatus, elapsed]
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

  const usePromises = options.promises

  while (writeOps > 0 || readOps > 0) {
    const k = keygen(options.keyRange.min, options.keyRange.max)
    const key = { ns: options.namespace, set: options.set, key: k }
    const record = recordgen(k, options.binSpec)
    const ops = { key, record }
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
  const job = client.query(options.namespace, options.set, options.statement)
  const stream = job.execute()
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

const runLongRunningJob = function (options) {
  if (options.statement.filters === undefined) {
    executeJob(options, SCAN, runLongRunningJob)
  } else {
    executeJob(options, QUERY, runLongRunningJob)
  }
}

const monitorMemory = function () {
  const currentMemory = process.memoryUsage()
  currentMemory.pid = process.pid
  if (heapMemory < currentMemory.heapUsed) {
    memGrowth++
    if (!initialFlux && memGrowth >= FLUX_PERIOD) {
      const alertData = {
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
  const stats = client.stats()
  console.log(util.inspect(stats, true, 10, true))
})

process.on('SIGINT', function () {
  logger.debug('Received SIGINT.')
  const stats = client.stats()
  console.log(util.inspect(stats, true, 10, true))
  process.exit(0)
})

process.on('SIGTERM', function () {
  logger.debug('Received SIGTERM.')
  const stats = client.stats()
  console.log(util.inspect(stats, true, 10, true))
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
