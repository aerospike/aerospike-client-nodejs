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

const Table = require('cli-table')
const yargs = require('yargs')

const MEM_MATCH = /(\d+(\.\d+)?) MB/

const TABLE_CHARS = {
  top: '',
  'top-mid': '',
  'top-left': '',
  'top-right': '',
  bottom: '',
  'bottom-mid': '',
  'bottom-left': '',
  'bottom-right': '',
  left: '',
  'left-mid': '',
  mid: '',
  'mid-mid': '',
  right: '',
  'right-mid': '',
  middle: ''
}

const TABLE_STYLE = {
  'padding-left': 4,
  'padding-right': 0,
  head: ['blue'],
  border: ['grey'],
  compact: true
}

let ITERATION_COUNT = 0

let memCnt = 0
let memMin
let memMax
const memRanges = []

// *****************************************************************************
// Options Parsing
// *****************************************************************************

const argp = yargs
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

const argv = argp.argv

if (argv.help === true) {
  argp.showHelp()
  process.exit()
}

// *****************************************************************************
// Functions
// *****************************************************************************

const MEM_MAX_MB = 100
const MEM_BUCKETS = 100

function memoryBar (minUsedMb, maxUsedMb) {
  const minUsedLen = Math.floor(minUsedMb / MEM_MAX_MB * MEM_BUCKETS)
  const minUsedBar = Buffer.alloc(minUsedLen)
  if (minUsedLen > 0) {
    minUsedBar.fill(']')
  }

  const maxUsedLen = Math.floor(maxUsedMb / MEM_MAX_MB * MEM_BUCKETS)
  const maxUsedBar = Buffer.alloc(maxUsedLen - minUsedLen)
  if (maxUsedLen > 0) {
    maxUsedBar.fill(']')
  }

  return minUsedBar.toString().blue + maxUsedBar.toString().red
}

function report () {
  const minhist = {}
  const maxhist = {}
  const stephist = {}

  const rtable = new Table({
    head: ['min', 'min diff', 'max', 'max diff', 'steps', 'size'],
    chars: TABLE_CHARS,
    style: TABLE_STYLE
  })

  let l

  const unfiltered = memRanges

  const filtered = unfiltered.filter(function (r, i) {
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
    const minceil = Math.ceil(r[0])
    minhist[minceil] = (minhist[minceil] || 0) + 1

    const maxceil = Math.ceil(r[1])
    maxhist[maxceil] = (maxhist[maxceil] || 0) + 1

    const step = Math.ceil(r[2])
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

  let k

  const minhead = []
  const minbody = []
  for (k in minhist) {
    minhead.push('<' + k)
    minbody.push(minhist[k])
  }
  const mintable = new Table({
    head: minhead,
    chars: TABLE_CHARS,
    style: TABLE_STYLE
  })
  mintable.push(minbody)

  const maxhead = []
  const maxbody = []
  for (k in maxhist) {
    maxhead.push('<' + k)
    maxbody.push(maxhist[k])
  }
  const maxtable = new Table({
    head: maxhead,
    chars: TABLE_CHARS,
    style: TABLE_STYLE
  })
  maxtable.push(maxbody)

  const stephead = []
  const stepbody = []
  for (k in stephist) {
    stephead.push(k)
    stepbody.push(stephist[k])
  }
  const steptable = new Table({
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

  const matches = line.match(MEM_MATCH)
  if (!matches || !matches[1]) {
    console.error('RegEx match failed on: |%s|', line, matches)
    process.exit(1)
  }

  const mem = parseFloat(matches[1])

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

let lastLine

process.stdin.on('data', function (chunk) {
  let i = 0
  let j = 0

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
