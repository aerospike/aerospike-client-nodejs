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
// node inspect.js -h
// *****************************************************************************

const spawn = require('child_process').spawn

const cluster = require('cluster')
const yargs = require('yargs')
const os = require('os')
const stats = require('./stats')

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
    host: {
      alias: 'h',
      default: '127.0.0.1',
      describe: 'Aerospike database address.'
    },
    port: {
      alias: 'p',
      default: 3000,
      describe: 'Aerospike database port.'
    },
    totalTimeout: {
      alias: 't',
      default: 10,
      describe: 'Timeout in milliseconds.'
    },
    log: {
      alias: 'l',
      default: 1,
      describe: 'Log level [0-5].'
    },
    namespace: {
      alias: 'n',
      default: 'test',
      describe: 'Key namespace.'
    },
    set: {
      alias: 's',
      default: 'demo',
      describe: 'Key set.'
    },
    reads: {
      alias: 'R',
      default: 1,
      describe: 'The read in the read/write ratio.'
    },
    writes: {
      alias: 'W',
      default: 1,
      describe: 'The write in the read/write ratio.'
    },
    keyrange: {
      alias: 'K',
      default: 1000,
      describe: 'The number of keys to use.'
    }
  })

const argv = argp.argv

if (argv.help === true) {
  argp.showHelp()
  process.exit()
}

if (!cluster.isMaster) {
  console.error('main.js must not run as a child process.')
  process.exit()
}

// *****************************************************************************
// Globals
// *****************************************************************************

const cpus = os.cpus()

const P_MIN = 1
const P_MAX = cpus.length
const P_STEP = 1
const I_MIN = 1
const I_MAX = 1
const I_STEP = 1
const O_MIN = 1
const O_MAX = 100
const O_STEP = 8

// *****************************************************************************
// Functions
// *****************************************************************************

const results = []
const errors = []

function reportStep (p, i, o, code, stdout, stderr) {
  console.log('processes: %d, iterations: %d, operations: %d, status: %d', p, i, o, code)

  console.log()

  let result

  if (code === 0) {
    result = JSON.parse(stdout)

    console.log('    tps (per process):')
    console.log('        min: %d, max: %d, mean: %d',
      result.tps.min,
      result.tps.max,
      result.tps.mean
    )

    console.log('    times (ms):')
    console.log('        min: %d, max: %d, mean: %d',
      result.times.min.toFixed(2),
      result.times.max.toFixed(2),
      result.times.mean.toFixed(2)
    )

    console.log('    duration:')
    stats.print_histogram(result.durations, console.log, '    ')

    console.log('    status codes:')
    stats.print_histogram(result.status_codes, console.log, '    ')

    results.push(result)
  } else {
    stderr.split('\n').forEach(function (l) {
      console.log('    error: %s', l)
    })
    errors.push([p, i, o, code, stderr])
  }

  console.log()
}

function reportFinal () {
  console.log()
  console.log('SUMMARY')
  console.log()

  const matched = results.filter(function (res) {
    const ops = res.operations
    return (res.durations['<= 1'] / ops * 100).toFixed(0) >= 90 &&
    (res.durations['> 1'] / ops * 100).toFixed(0) <= 10 &&
    (res.durations['> 2'] / ops * 100).toFixed(0) <= 2 &&
    (res.durations['<= 1'] + res.durations['> 1'] + res.durations['> 2'] === ops)
  })

  matched.forEach(function (res) {
    console.log('  processes: %d, iterations: %d, operations: %d',
      res.configuration.processes,
      res.configuration.iterations,
      res.configuration.operations
    )
    console.log('      tps:  {min: %d, max: %d, avg: %d}',
      res.tps.min,
      res.tps.max,
      res.tps.mean
    )
    console.log('      time: {min: %d, max: %d, avg: %d}',
      res.times.min.toFixed(2),
      res.times.max.toFixed(2),
      res.times.mean.toFixed(2)
    )
    console.log('      duration:')
    stats.print_histogram(res.durations, console.log, '      ')
  })

  const groupOps = {}

  matched.forEach(function (res) {
    const ops = res.configuration.operations
    const group = (groupOps[ops] || [])
    group.push(res)
    groupOps[ops] = group
  })

  console.log()
  console.log()
  for (const k in groupOps) {
    const ops = groupOps[k]
    console.log('operations: %d', k)
    for (let o = 0; o < ops.length; o++) {
      const op = ops[o]
      console.log('    p: %d, tps: {l: %d, u: %d, m: %d}, time: {l: %d, u: %d, m: %d}, dur: {0: %d, 1: %d, 2: %d}',
        op.configuration.processes,
        op.tps.min,
        op.tps.max,
        op.tps.mean,
        op.times.min.toFixed(2),
        op.times.max.toFixed(2),
        op.times.mean.toFixed(2),
        op.durations['<= 1'],
        op.durations['> 1'],
        op.durations['> 2']
      )
    }
  }
  console.log()

  const opsHist = {}

  matched.forEach(function (res) {
    const ops = res.configuration.operations
    opsHist[ops] = (opsHist[ops] || 0) + 1
  })

  console.log()
  console.log('Number of Concurrent Transactions:')
  stats.print_histogram(opsHist, console.log, '    ')

  console.log()
}

function exec (p, i, o) {
  let stdout = Buffer.alloc(0)
  let stderr = Buffer.alloc(0)

  const prog = 'node'

  const args = ['main.js',
    '-h', argv.host, '-p', argv.port, '-t', argv.totalTimeout,
    '-n', argv.namespace, '-s', argv.set,
    '-R', argv.reads, '-W', argv.writes, '-K', argv.keyrange,
    '-P', p, '-I', i, '-O', o,
    '--silent', '--json'
  ]

  const proc = spawn(prog, args)

  proc.stdout.on('data', function (data) {
    stdout = Buffer.concat([stdout, data])
  })

  proc.stderr.on('data', function (data) {
    stderr = Buffer.concat([stderr, data])
  })

  proc.on('close', function (code) {
    reportStep(p, i, o, code, stdout.toString(), stderr.toString())
    step(p, i, o)
  })
}

function step (p, i, o) {
  o += O_STEP

  if (o > O_MAX) {
    i += I_STEP
    o = O_MIN
  }

  if (i > I_MAX) {
    p += P_STEP
    i = I_MIN
    o = O_MIN
  }

  if (p > P_MAX) {
    reportFinal()
    return
  }

  return exec(p, i, o)
}

exec(P_MIN, I_MIN, O_MIN)
