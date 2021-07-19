// *****************************************************************************
// Copyright 2013-2021 Aerospike, Inc.
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

const { format } = require('util')

const aerospike = require('aerospike')
const cluster = require('cluster')
const { logger } = require('./logging')
const stats = require('./stats')
const alerts = require('./alerts')
const argv = require('./config.json')

// *****************************************************************************
// Globals
// *****************************************************************************

const OP_TYPES = 4 // READ, WRITE, SCAN and QUERY
const STATS = 3 // OPERATIONS, TIMEOUTS and ERRORS

let queryWorkers = 0
let scanWorkers = 0
let online = 0
let exited = 0
let rwOnline = 0
let queryOnline = 0
let scanOnline = 0

//
// Number of completed operations(READ & WRITE), timed out operations and operations that ran into error per second
//
let intervalStats = new Array(OP_TYPES)
resetIntervalStats()

if (argv.querySpec !== undefined) {
  queryWorkers = argv.querySpec.length
}

if (argv.scanSpec !== undefined) {
  scanWorkers = argv.scanSpec.length
}

const rwWorkers = argv.processes - queryWorkers - scanWorkers

if (!cluster.isMaster) {
  console.error('main.js must not run as a child process.')
  process.exit()
}

const FOPS = (argv.operations / (argv.reads + argv.writes))
let ROPS = FOPS * argv.reads
const WOPS = FOPS * argv.writes
const ROPSPCT = ROPS / argv.operations * 100
const WOPSPCT = WOPS / argv.operations * 100

if ((ROPS + WOPS) < argv.operations) {
  const DOPS = argv.operations - (ROPS + WOPS)
  ROPS += DOPS
}

if (argv.time !== undefined) {
  argv.time = stats.parseTimeToSecs(argv.time)
  argv.iterations = undefined
}

const alert = { mode: argv.alert, filename: argv.filename }
alerts.setupAlertSystem(alert)

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
  const worker = cluster.fork()
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
  const option = {
    namespace: argv.namespace,
    set: argv.set,
    keyRange: argv.keyRange,
    rops: ROPS,
    wops: WOPS,
    binSpec: argv.binSpec,
    promises: argv.promises
  }
  worker.iteration++
  worker.send(['run', option])
}

// @to-do this worker has to create index and then issue a query request
// once the index is created. After implementing the task completed API
// this can be enhanced for that.
function queryWorkerJob (worker, id) {
  const stmt = {}
  const queryConfig = argv.querySpec[id]
  if (queryConfig.qtype === 'Range') {
    stmt.filters = [aerospike.filter.range(queryConfig.bin, queryConfig.min, queryConfig.max)]
  } else if (queryConfig.qtype === 'Equal') {
    stmt.filters = [aerospike.filter.equal(queryConfig.bin, queryConfig.value)]
  }

  const options = {
    namespace: argv.namespace,
    set: argv.set,
    statement: stmt
  }
  worker.send(['query', options])
}

function scanWorkerJob (worker) {
  const options = {
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
let counter = 0 // Number of times workerResultsInterval is called
function workerResultsInterval (worker, intervalWorkerStats) {
  for (let i = 0; i < OP_TYPES; i++) {
    for (let j = 0; j < STATS; j++) {
      intervalStats[i][j] = intervalStats[i][j] + intervalWorkerStats[i][j]
    }
  }
  if (++counter % argv.processes === 0) {
    stats.interval({
      read: intervalStats[0],
      write: intervalStats[1],
      query: intervalStats[2],
      scan: intervalStats[3]
    })
    if (!argv.silent) {
      printIntervalStats()
    }
  }
}

function printIntervalStats () {
  const time = new Date().toISOString()
  if (rwWorkers > 0) {
    logger.info('%s read(tps=%d timeouts=%d errors=%d) write(tps=%d timeouts=%d errors=%d) mem(%s)',
      time, intervalStats[0][0], intervalStats[0][1], intervalStats[0][2],
      intervalStats[1][0], intervalStats[1][1], intervalStats[1][2],
      memUsage())
  }
  if (queryWorkers) {
    logger.info('%s query(records = %d timeouts = %d errors = %d) mem(%s)',
      time, intervalStats[2][0], intervalStats[2][1], intervalStats[2][2],
      memUsage())
  }
  if (scanWorkers) {
    logger.info('%s scan(records = %d timeouts = %d errors = %d) mem(%s)',
      time, intervalStats[3][0], intervalStats[3][1], intervalStats[3][2],
      memUsage())
  }
}

const MEGA = 1024 * 1024 // bytes in a MB
function memUsage () {
  const memUsage = process.memoryUsage()
  const rss = Math.round(memUsage.rss / MEGA)
  const heapUsed = Math.round(memUsage.heapUsed / MEGA)
  const heapTotal = Math.round(memUsage.heapTotal / MEGA)
  return format('%d MB, heap: %d / %d MB', rss, heapUsed, heapTotal)
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
const keyrange = argv.keyRange.max - argv.keyRange.min

if (!argv.silent) {
  logger.info('namespace: %s, set: %s, worker processes: %s, keys: %s, read: %s%%, write: %s%%, promises: %s',
    argv.namespace, argv.set, argv.processes, keyrange, ROPSPCT, WOPSPCT, argv.promises)
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
for (let p = 0; p < argv.processes; p++) {
  workerSpawn()
}
