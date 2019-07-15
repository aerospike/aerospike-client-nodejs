#!/usr/bin/env node
// *****************************************************************************
// Copyright 2013-2019 Aerospike, Inc.
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

const Aerospike = require('aerospike')
const shared = require('./shared')

shared.runner()

function udfParams (argv) {
  if (!argv.udf) {
    return
  }

  const udf = {}
  udf.module = argv.udf.shift()
  udf.func = argv.udf.shift()
  udf.args = argv.udf
  return udf
}

function buildScanOptions (argv) {
  const options = {
    percent: argv.percent,
    concurrent: argv.concurrent
  }

  let priority
  switch ((argv.priority || '').toUpperCase()) {
    case 'LOW':
      priority = Aerospike.scanPriority.LOW
      break
    case 'MEDIUM':
      priority = Aerospike.scanPriority.MEDIUM
      break
    case 'HIGH':
      priority = Aerospike.scanPriority.HIGH
      break
    case 'auto':
      priority = Aerospike.scanPriority.AUTO
      break
  }
  if (priority) {
    options.priority = priority
  }

  console.info(options)
  return options
}

async function scan (client, argv) {
  const options = buildScanOptions(argv)
  const scan = client.scan(argv.namespace, argv.set, options)
  if (argv.bins) {
    scan.select(argv.bins)
  }

  const udf = udfParams(argv)
  if (udf && argv.background) {
    await scanBackground(scan, udf)
  } else {
    await scanForeach(scan)
  }
}

async function scanForeach (scan) {
  const stream = scan.foreach()
  stream.on('data', shared.cli.printRecord)
  await shared.streams.consume(stream)
}

async function scanBackground (query, udf) {
  const job = await scan.background(udf.module, udf.func, udf.args)
  console.info('Running scan in background - Job ID:', job.jobID)
}

exports.command = 'scan'
exports.describe = 'Execute a scan and print the results'
exports.handler = shared.run(scan)
exports.builder = {
  bins: {
    describe: 'List of bins to fetch for each record',
    type: 'array',
    group: 'Command:'
  },
  priority: {
    describe: 'Scan priority',
    choices: ['auto', 'low', 'medium', 'high'],
    group: 'Command:'
  },
  percent: {
    describe: 'Run scan on given percentage of records',
    type: 'number',
    group: 'Command:',
    default: 100
  },
  concurrent: {
    describe: 'Scan all cluster nodes in parallel',
    type: 'boolean',
    group: 'Command:',
    default: true
  },
  udf: {
    desc: 'UDF module, function & arguments to apply to the query',
    group: 'Command:',
    type: 'array'
  },
  background: {
    desc: 'Run the scan in the background (with Record UDF)',
    group: 'Command:',
    type: 'boolean'
  }
}
