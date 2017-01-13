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
var yargs = require('yargs')

var MEM_MATCH = /(\d+(\.\d+)?) MB/

var TABLE_CHARS = {
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

var TABLE_STYLE = {
  'padding-left': 4,
  'padding-right': 0,
  'head': ['blue'],
  'border': ['grey'],
  'compact': true
}

var ITERATION_COUNT = 0

var memCnt = 0
var memMin
var memMax
var memRanges = []

// *****************************************************************************
// Options Parsing
// *****************************************************************************

var argp = yargs
  .usage('$0 [options]')
  .options({
    help: {
      boolean: true,
      describe: 'Display this message.'
    },
    factor: {
      alias: 'f',
      default: 1,
      describe: 'Factor to filter by.'
    },
    start: {
      alias: 's',
      default: undefined,
      describe: 'Start GC range.'
    },
    end: {
      alias: 'e',
      default: undefined,
      describe: 'End GC range.'
    }
  })

var argv = argp.argv

if (argv.help === true) {
  argp.showHelp()
  process.exit()
}

// *****************************************************************************
// Functions
// *****************************************************************************

var MEM_MAX_MB = 100
var MEM_BUCKETS = 100

function memoryBar (minUsedMb, maxUsedMb) {
  var minUsedLen = Math.floor(minUsedMb / MEM_MAX_MB * MEM_BUCKETS)
  var minUsedBar = new Buffer(minUsedLen)
  if (minUsedLen > 0) {
    minUsedBar.fill(']')
  }

  var maxUsedLen = Math.floor(maxUsedMb / MEM_MAX_MB * MEM_BUCKETS)
  var maxUsedBar = new Buffer(maxUsedLen - minUsedLen)
  if (maxUsedLen > 0) {
    maxUsedBar.fill(']')
  }

  return minUsedBar.toString().blue + maxUsedBar.toString().red
}

function report () {
  var minhist = {}
  var maxhist = {}
  var stephist = {}

  var rtable = new Table({
    head: ['min', 'min diff', 'max', 'max diff', 'steps', 'size'],
    chars: TABLE_CHARS,
    style: TABLE_STYLE
  })

  var l

  var unfiltered = memRanges

  var filtered = unfiltered.filter(function (r, i) {
    if (argv.factor && i % argv.factor !== 0) {
      return false
    }
    if (argv.start && i < argv.start) {
      return false
    }
    if (argv.end && i > argv.end) {
      return false
    }
    return true
  })

  filtered.forEach(function (r, i) {
    var minceil = Math.ceil(r[0])
    minhist[minceil] = (minhist[minceil] || 0) + 1

    var maxceil = Math.ceil(r[1])
    maxhist[maxceil] = (maxhist[maxceil] || 0) + 1

    var step = Math.ceil(r[2])
    stephist[step] = (stephist[step] || 0) + 1

    if (l) {
      rtable.push([
        r[0],
        (r[0] - l[0]).toFixed(3),
        r[1],
        (r[1] - l[1]).toFixed(3),
        r[2],
        (r[1] - r[0]).toFixed(3),
        memoryBar(r[0], r[1])
      ])
    } else {
      rtable.push([
        r[0],
        0.00,
        r[1],
        0.00,
        r[2],
        (r[1] - r[0]).toFixed(3),
        memoryBar(r[0], r[1])
      ])
    }
    l = r
  })

  var k

  var minhead = []
  var minbody = []
  for (k in minhist) {
    minhead.push('<' + k)
    minbody.push(minhist[k])
  }
  var mintable = new Table({
    head: minhead,
    chars: TABLE_CHARS,
    style: TABLE_STYLE
  })
  mintable.push(minbody)

  var maxhead = []
  var maxbody = []
  for (k in maxhist) {
    maxhead.push('<' + k)
    maxbody.push(maxhist[k])
  }
  var maxtable = new Table({
    head: maxhead,
    chars: TABLE_CHARS,
    style: TABLE_STYLE
  })
  maxtable.push(maxbody)

  var stephead = []
  var stepbody = []
  for (k in stephist) {
    stephead.push(k)
    stepbody.push(stephist[k])
  }
  var steptable = new Table({
    head: stephead,
    chars: TABLE_CHARS,
    style: TABLE_STYLE
  })
  steptable.push(stepbody)

// *****************************************************************************

  console.log()
  console.log('Heap Usage (MB)'.grey)
  rtable.toString().split('\n').forEach(function (l) {
    if (l.length > 0) {
      console.log(l)
    }
  })

  console.log()
  console.log('Heap Used Lower Bound (MB)'.grey)
  mintable.toString().split('\n').forEach(function (l) {
    if (l.length > 0) {
      console.log(l)
    }
  })

  console.log()
  console.log('Heap Used Upper Bound (MB)'.grey)
  maxtable.toString().split('\n').forEach(function (l) {
    if (l.length > 0) {
      console.log(l)
    }
  })

  console.log()
  console.log('Iterations / GC'.grey)
  steptable.toString().split('\n').forEach(function (l) {
    if (l.length > 0) {
      console.log(l)
    }
  })

  console.log()
  console.log('%s %d', 'Number of Iterations:'.grey, ITERATION_COUNT)
  console.log('%s %d', 'Number of GC executions (unfiltered):'.grey, unfiltered.length)
  console.log('%s %d', 'Number of GC executions (filtered):'.grey, filtered.length)

  console.log()
}

function readline (line) {
  if (line.trim().length === 0) {
    return line
  }

  var matches = line.match(MEM_MATCH)
  if (!matches || !matches[1]) {
    console.error('RegEx match failed on: |%s|', line, matches)
    process.exit(1)
  }

  var mem = parseFloat(matches[1])

  if (memMin === undefined) {
    memMin = mem
    memCnt = 0
  }

  if (memMax === undefined || mem > memMax) {
    memMax = mem
    memCnt++
  } else {
    // this is where the magic happens

    // we will filter based on a factor
    memRanges.push([memMin, memMax, memCnt])

    // reset
    memMin = mem
    memMax = mem
    memCnt = 0
  }

  ITERATION_COUNT++
}

// *****************************************************************************
// Event Listeners
// *****************************************************************************

var lastLine

process.stdin.on('data', function (chunk) {
  var i = 0
  var j = 0

  for (i = 0, j = chunk.indexOf('\n', i); j !== -1; i = j + 1, j = chunk.indexOf('\n', i)) {
    if (lastLine) {
      readline(lastLine + chunk.slice(i, j))
      lastLine = undefined
    } else {
      readline(chunk.slice(i, j))
    }
  }

  if (chunk.length > i) {
    lastLine = chunk.slice(i)
  }
})

process.stdin.on('end', function () {
  report()
})

// *****************************************************************************
// Run
// *****************************************************************************

process.stdin.resume()
process.stdin.setEncoding('utf8')
