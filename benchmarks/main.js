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
// node -O 10000 -P 4 -R 0.5
// *****************************************************************************

var aerospike = require('aerospike')
var cluster = require('cluster')
var winston = require('winston')
var stats = require('./stats')
var alerts = require('./alerts')
var argv = require('./config.json')

// *****************************************************************************
// Globals
// *****************************************************************************

var OP_TYPES = 4 // READ, WRITE, SCAN and QUERY
var STATS = 3 // OPERATIONS, TIMEOUTS and ERRORS

var queryWorkers = 0
var scanWorkers = 0
var online = 0
var exited = 0
var rwOnline = 0
var queryOnline = 0
var scanOnline = 0

//
// Number of completed operations(READ & WRITE), timed out operations and operations that ran into error per second
//
var intervalStats = new Array(OP_TYPES)
resetIntervalStats()

if (argv.querySpec !== undefined) {
  queryWorkers = argv.querySpec.length
}

if (argv.scanSpec !== undefined) {
  scanWorkers = argv.scanSpec.length
}

var rwWorkers = argv.processes - queryWorkers - scanWorkers

if (!cluster.isMaster) {
  console.error('main.js must not run as a child process.')
  process.exit()
}

var FOPS = (argv.operations / (argv.reads + argv.writes))
var ROPS = FOPS * argv.reads
var WOPS = FOPS * argv.writes
var ROPSPCT = ROPS / argv.operations * 100
var WOPSPCT = WOPS / argv.operations * 100

if ((ROPS + WOPS) < argv.operations) {
  var DOPS = argv.operations - (ROPS + WOPS)
  ROPS += DOPS
}

if (argv.time !== undefined) {
  argv.time = stats.parseTimeToSecs(argv.time)
  argv.iterations = undefined
}

var alert = {mode: argv.alert, filename: argv.filename}
alerts.setupAlertSystem(alert)

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
// Functions
// *****************************************************************************

function finalize () {
  stats.stop()
  if (argv.summary === true && rwWorkers > 0) {
    return stats.reportFinal(argv, console.log)
  }
}

function workerSpawn () {
  var worker = cluster.fork()
  worker.iteration = 0
  worker.on('message', workerResults(worker))
}

function workerExit (worker) {
  worker.send(['end'])
}

function workerShutdown () {
  Object.keys(cluster.workers).forEach(function (id) {
    workerExit(cluster.workers[id])
  })
}

/**
 * Signal all workers asking for data on transactions
 */
function workerProbe () {
  Object.keys(cluster.workers).forEach(function (id) {
    cluster.workers[id].send(['trans'])
  })
}

function rwWorkerJob (worker) {
  var option = {
    namespace: argv.namespace,
    set: argv.set,
    keyRange: argv.keyRange,
    rops: ROPS,
    wops: WOPS,
    binSpec: argv.binSpec
  }
  worker.iteration++
  worker.send(['run', option])
}

// @to-do this worker has to create index and then issue a query request
// once the index is created. After implementing the task completed API
// this can be enhanced for that.
function queryWorkerJob (worker, id) {
  var stmt = {}
  var queryConfig = argv.querySpec[id]
  if (queryConfig.qtype === 'Range') {
    stmt.filters = [aerospike.filter.range(queryConfig.bin, queryConfig.min, queryConfig.max)]
  } else if (queryConfig.qtype === 'Equal') {
    stmt.filters = [aerospike.filter.equal(queryConfig.bin, queryConfig.value)]
  }

  var options = {
    namespace: argv.namespace,
    set: argv.set,
    statement: stmt
  }
  worker.send(['query', options])
}

function scanWorkerJob (worker) {
  var options = {
    namespace: argv.namespace,
    set: argv.set,
    statement: argv.scanSpec
  }
  worker.send(['query', options])
}

/**
 * Collects the data related to transactions and prints it once the data is recieved from all workers.
 * (called per second)
 */
var counter = 0 // Number of times workerResultsInterval is called
function workerResultsInterval (worker, intervalWorkerStats) {
  for (var i = 0; i < OP_TYPES; i++) {
    for (var j = 0; j < STATS; j++) {
      intervalStats[i][j] = intervalStats[i][j] + intervalWorkerStats[i][j]
    }
  }
  if (++counter % argv.processes === 0) {
    stats.interval({
      'read': intervalStats[0],
      'write': intervalStats[1],
      'query': intervalStats[2],
      'scan': intervalStats[3]
    })
    if (!argv.silent) {
      printIntervalStats()
    }
  }
}

function printIntervalStats () {
  if (rwWorkers > 0) {
    logger.info('%s read(tps=%d timeouts=%d errors=%d) write(tps=%d timeouts=%d errors=%d) ',
      new Date().toString(), intervalStats[0][0], intervalStats[0][1], intervalStats[0][2],
      intervalStats[1][0], intervalStats[1][1], intervalStats[1][2])
  }
  if (queryWorkers) {
    logger.info('%s query(records = %d timeouts = %d errors = %d)',
      new Date().toString(), intervalStats[2][0], intervalStats[2][1], intervalStats[2][2])
  }
  if (scanWorkers) {
    logger.info('%s scan(records = %d timeouts = %d errors = %d)',
      new Date().toString(), intervalStats[3][0], intervalStats[3][1], intervalStats[3][2])
  }
}

function workerResultsIteration (worker, opStats) {
  stats.iteration(opStats)
  if (argv.iterations === undefined || worker.iteration < argv.iterations || argv.time !== undefined) {
    rwWorkerJob(worker)
  } else {
    workerExit(worker)
  }
}

function workerResults (worker) {
  return function (message) {
    if (message[0] === 'stats') {
      workerResultsIteration(worker, message[1])
    } else if (message[0] === 'alert') {
      alerts.handleAlert(message[1].alert, message[1].severity)
    } else {
      workerResultsInterval(worker, message[1])
    }
  }
}

/**
*  * Print config information
*   */
var keyrange = argv.keyRange.max - argv.keyRange.min

if (!argv.silent) {
  logger.info('namespace: ' + argv.namespace + ', set: ' + argv.set + ', worker processes: ' + argv.processes +
    ', keys: ' + keyrange + ', read: ' + ROPSPCT + '%, write: ' + WOPSPCT + '%')
}

/**
 * Flush out the current intervalStats and probe the worker every second.
 */
setInterval(function () {
  resetIntervalStats()
  workerProbe(cluster)
}, 1000)

/**
 * Reset the value of internal_stats.
 */
function resetIntervalStats () {
  intervalStats = [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]]
}

// *****************************************************************************
// Event Listeners
// *****************************************************************************

process.on('exit', function () {
  logger.debug('Exiting.')
  if (exited === online) {
    return finalize()
  }
})

process.on('SIGINT', function () {
  logger.debug('Recevied SIGINT.')
})

process.on('SIGTERM', function () {
  logger.debug('Received SIGTERM.')
})

cluster.on('online', function (worker) {
  online++
  if (rwOnline < rwWorkers) {
    rwOnline++
    rwWorkerJob(worker)
  } else if (queryOnline < queryWorkers) {
    queryWorkerJob(worker, queryOnline)
    queryOnline++
  } else if (scanOnline < scanWorkers) {
    scanOnline++
    scanWorkerJob(worker)
  }
})

cluster.on('disconnect', function (worker, code, signal) {
  logger.debug('[worker: %d] Disconnected.', worker.process.pid, code)
})

cluster.on('exit', function (worker, code, signal) {
  if (code !== 0) {
    // non-ok status code
    logger.error('[worker: %d] Exited: %d', worker.process.pid, code)
    process.exit(1)
  } else {
    logger.debug('[worker: %d] Exited: %d', worker.process.pid, code)
    exited++
  }
  if (exited === online) {
    process.exit(0)
  }
})

// *****************************************************************************
// Setup Workers
// *****************************************************************************

if (argv.time !== undefined) {
  setTimeout(function () {
    resetIntervalStats()
    workerProbe(cluster)
    workerShutdown(cluster)
  }, argv.time * 1000)
}

cluster.setupMaster({
  exec: 'worker.js',
  silent: false
})

stats.start()
for (var p = 0; p < argv.processes; p++) {
  workerSpawn()
}
