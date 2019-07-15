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
//
const Aerospike = require('aerospike')
const shared = require('./shared')

shared.runner()

async function batchRead (client, argv) {
  const batch = argv.keys.map(key => {
    const request = {
      key: new Aerospike.Key(argv.namespace, argv.set, key)
    }
    if (argv.bins) {
      request.bins = argv.bins
    } else {
      request.read_all_bins = true
    }
    return request
  })

  const batchResults = await client.batchRead(batch)

  for (const result of batchResults) {
    const record = result.record
    console.info(record.key.key, ':', result.status === Aerospike.status.OK
      ? record.bins : 'NOT FOUND')
  }
}

exports.command = 'batch <keys..>'
exports.describe = 'Fetch multiple records from the database in a batch'
exports.handler = shared.run(batchRead)
exports.builder = {
  bins: {
    describe: 'List of bins to fetch for each record',
    type: 'array',
    group: 'Command:'
  }
}
