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

var Table = require('cli-table')

const OPERATION_STATUS = 0
const OPERATION_TIME_START = 1
const OPERATION_TIME_END = 2

// histograms
// 1. For status code of each operation.
// 2. Latency histogram.
var hist = {}
var timeHist = {
  '<= 1': 0,
  '> 1': 0,
  '> 2': 0,
  '> 4': 0,
  '> 8': 0,
  '> 16': 0,
  '> 32': 0
}

var trans = { total: { count: 0, min_tps: Infinity, max_tps: 0 } }

var startTime
var totalDuration

const TABLE_CHARS = {
  'top': '',
  'top-mid': '',
  'top-left': '',
  'top-right': '',
  'bottom': '',
  'bottom-mid': '',
  'bottom-left': '',
  'bottom-right': '',
  'left': '',
  'left-mid': '',
  'mid': '',
  'mid-mid': '',
  'right': '',
  'right-mid': '',
  'middle': ''
}

const TABLE_STYLE = {
  'padding-left': 4,
  'padding-right': 0,
  'head': ['blue'],
  'border': ['grey'],
  'compact': true
}

function sum (l, r) {
  return l + r
}

function duration (start, end) {
  var s = (end[0] - start[0]) * 1000000000
  var ns = s + end[1] - start[1]
  var ms = ns / 1000000
  return ms
}

function parseTimeToSecs (time) {
  if (time !== undefined) {
    var timeMatch = time.toString().match(/(\d+)([smh])?/)
    if (timeMatch !== null) {
      if (timeMatch[2] !== null) {
        time = parseInt(timeMatch[1], 10)
        var timeUnit = timeMatch[2]
        switch (timeUnit) {
          case 'm':
            time = time * 60
            break
          case 'h':
            time = time * 60 * 60
            break
        }
      }
    }
  }
  return time
}

function timeHistogram (operations) {
  operations.map(function (op) {
    return duration(op[OPERATION_TIME_START], op[OPERATION_TIME_END])
  }).forEach(function (dur) {
    var d = Math.floor(dur)
    if (d > 32) {
      timeHist['> 32']++
    }
    if (d > 16) {
      timeHist['> 16']++
    } else if (d > 8) {
      timeHist['> 8']++
    } else if (d > 4) {
      timeHist['> 4']++
    } else if (d > 2) {
      timeHist['> 2']++
    } else if (d > 1) {
      timeHist['> 1']++
    } else {
      timeHist['<= 1']++
    }
  })
}

function numberFormat (v, precision) {
  return v.toFixed(precision || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

function timeUnits (v) {
  var u = v === 1 ? 'second' : 'seconds'

  if (Math.abs(v) >= 60) {
    v = v / 60
    u = v === 1 ? 'minute' : 'minutes'
  }

  if (Math.abs(v) >= 60) {
    v = v / 60
    u = v === 1 ? 'hour' : 'hours'
  }

  return numberFormat(v, 2) + ' ' + u
}

function calculateTPS (transactions) {
  var seconds = totalDuration / 1000
  Object.keys(transactions).forEach(function (stat) {
    transactions[stat]['tps'] = transactions[stat]['count'] / seconds
  })
}

function statusHistogram (operations) {
  operations.map(function (op) {
    return op[OPERATION_STATUS]
  }).forEach(function (status) {
    hist[status] = (hist[status] || 0) + 1
  })
}

function printTable (table, print, prefix) {
  table.toString().split('\n').forEach(function (l) {
    if (l.length > 0) {
      print((prefix || '') + l)
    }
  })
}

function printEnvTable (print, prefix) {
  var envTable = new Table({
    chars: TABLE_CHARS,
    style: TABLE_STYLE
  })

  envTable.push({'Node.js Version': process.versions.node})
  envTable.push({'UV_THREADPOOL_SIZE': process.env.UV_THREADPOOL_SIZE || '-'})

  printTable(envTable, print, prefix)
}

function printConfigTable (config, print, prefix) {
  var configTable = new Table({
    chars: TABLE_CHARS,
    style: TABLE_STYLE
  })

  configTable.push({'operations': config.operations})
  configTable.push({'iterations': config.iterations === undefined ? 'undefined' : config.iterations})
  configTable.push({'processes': config.processes})
  configTable.push({'time': config.time === undefined ? 'undefined' : timeUnits(config.time)})

  printTable(configTable, print, prefix)
}

function printTransactions (transactions, print, prefix) {
  var thead = []
  thead.push('')
  for (var t in transactions) {
    thead.push(t)
  }

  var table = new Table({
    head: thead,
    chars: TABLE_CHARS,
    style: TABLE_STYLE
  })
  var columns = Object.keys(transactions)

  var row = columns.map(function (col) {
    return numberFormat(transactions[col]['count'], 0)
  })
  table.push({'Total': row})

  row = columns.map(function (col) {
    return numberFormat(transactions[col]['tps'], 0)
  })
  table.push({'TPS': row})

  row = columns.map(function (col) {
    return numberFormat(transactions[col]['min_tps'], 0)
  })
  table.push({'Min TPS': row})

  row = columns.map(function (col) {
    return numberFormat(transactions[col]['max_tps'], 0)
  })
  table.push({'Max TPS': row})

  printTable(table, print, prefix)
}

function printHistogram (histogram, print, prefix) {
  var total = Object.keys(histogram).map(function (k) {
    return histogram[k]
  }).reduce(sum)

  var thead = []
  var tbody = []

  for (var k in histogram) {
    thead.push(k)
    tbody.push(numberFormat(histogram[k] / total * 100, 1) + '%')
  }

  var table = new Table({
    head: thead,
    chars: TABLE_CHARS,
    style: TABLE_STYLE
  })

  table.push(tbody)

  printTable(table, print, prefix)
}

function start () {
  startTime = process.hrtime()
}

function stop () {
  var endTime = process.hrtime()
  totalDuration = duration(startTime, endTime)
}

function iteration (operations) {
  statusHistogram(operations)
  timeHistogram(operations)
}

function aggregateIntervalStats (statName, tx) {
  var stats = trans[statName] = trans[statName] || { count: 0, max_tps: 0, min_tps: Infinity }
  stats['count'] += tx
  if (tx > stats['max_tps']) stats['max_tps'] = tx
  if (tx < stats['min_tps']) stats['min_tps'] = tx
}

function interval (intervalStats) {
  var totalTX = 0
  for (var stat in intervalStats) {
    var tx = intervalStats[stat][0]
    totalTX += tx
    aggregateIntervalStats(stat, tx)
  }
  aggregateIntervalStats('total', totalTX)
}

function reportFinal (argv, print) {
  calculateTPS(trans)
  if (!argv.json) {
    print()
    print('SUMMARY')
    print()
    print('  Environment')
    printEnvTable(print)
    print()
    print('  Configuration')
    printConfigTable(argv, print)
    print()
    print('  Transactions')
    printTransactions(trans, print)
    print()
    print('  Durations')
    printHistogram(timeHist, print)
    print()
    print('  Status Codes')
    printHistogram(hist, print)
    print()
  } else {
    var output = {
      env: {
        nodejs: process.versions.node,
        'UV_THREADPOOL_SIZE': process.env.UV_THREADPOOL_SIZE || null
      },
      configuration: {
        operations: argv.operations,
        iterations: argv.iterations,
        processes: argv.processes
      },
      duration: totalDuration,
      transactions: trans,
      durations: timeHist,
      status_codes: hist
    }
    console.log('%j', output)
  }

  return 0
}

module.exports = {
  start: start,
  stop: stop,
  iteration: iteration,
  interval: interval,
  printHistogram: printHistogram,
  reportFinal: reportFinal,
  parseTimeToSecs: parseTimeToSecs
}
