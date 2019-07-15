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

function selectBins (query, argv) {
  if (argv.bins) {
    query.select(argv.bins)
  }
}

function applyFilter (query, argv) {
  if (argv.equal) {
    const filter = argv.equal
    const bin = filter[0]
    const value = filter[1]
    query.where(Aerospike.filter.equal(bin, value))
  } else if (argv.range) {
    const filter = argv.range
    const bin = filter[0]
    const start = filter[1]
    const end = filter[2]
    query.where(Aerospike.filter.range(bin, start, end))
  } else if (argv.geoWithinRadius) {
    const filter = argv.geoWithinRadius
    const bin = filter[0]
    const lng = filter[1]
    const lat = filter[2]
    const radius = filter[3]
    query.where(Aerospike.filter.geoWithinRadius(bin, lng, lat, radius))
  }
}

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

async function query (client, argv) {
  const query = client.query(argv.namespace, argv.set)
  selectBins(query, argv)
  applyFilter(query, argv)

  const udf = udfParams(argv)
  if (udf && argv.background) {
    await queryBackground(query, udf)
  } else if (udf) {
    await queryApply(query, udf)
  } else {
    await queryForeach(query)
  }
}

async function queryForeach (query) {
  const stream = query.foreach()
  stream.on('data', shared.cli.printRecord)
  await shared.streams.consume(stream)
}

async function queryBackground (query, udf) {
  const job = await query.background(udf.module, udf.func, udf.args)
  console.info('Running query in background - Job ID:', job.jobID)
}

async function queryApply (query, udf) {
  const result = await query.apply(udf.module, udf.func, udf.args)
  console.info('Query result:', result)
}

exports.command = 'query'
exports.describe = 'Execute a query and print the results'
exports.handler = shared.run(query)
exports.builder = {
  bins: {
    describe: 'List of bins to fetch for each record',
    type: 'array',
    group: 'Command:'
  },
  equal: {
    desc: 'Applies an equal filter to the query',
    group: 'Command:',
    nargs: 2,
    conflicts: ['range', 'geoWithinRadius']
  },
  range: {
    desc: 'Applies a range filter to the query',
    group: 'Command:',
    nargs: 3,
    conflicts: ['equal', 'geoWithinRadius']
  },
  geoWithinRadius: {
    desc: 'Applies a geospatial "within-radius" filter to the query',
    group: 'Command:',
    nargs: 4,
    conflicts: ['equal', 'range']
  },
  udf: {
    desc: 'UDF module, function & arguments to apply to the query',
    group: 'Command:',
    type: 'array'
  },
  background: {
    desc: 'Run the query in the background (with Record UDF)',
    group: 'Command:',
    type: 'boolean'
  }
}
