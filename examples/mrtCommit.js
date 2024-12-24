#!/usr/bin/env node
// *****************************************************************************
// Copyright 2013-2024 Aerospike, Inc.
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

async function mrtCommit (client, argv) {
  // const record1 = { abc: 123 }
  const record2 = { def: 456 }

  const mrt = new Aerospike.Transaction()

  const policy = {
    txn: mrt
  }
  const keyList = []
  for (let i = 0; i < argv.keys.length; i++) {
    keyList.push(new Aerospike.Key(argv.namespace, argv.set, argv.keys[i]))
  }
  for (let i = 0; i < argv.keys.length; i++) {
    await client.put(keyList[i], record2, policy)
    await client.get(keyList[i], policy)
  }

  console.log(keyList)

  console.log('committing multi-record transaction with %d operations.', keyList.length * 2)
  await client.commit(mrt)
  console.info('multi-record transaction has been committed.')
}

exports.command = 'mrtCommit <keys..>'
exports.describe = 'Commit a multi-record transaction'
exports.handler = shared.run(mrtCommit)
exports.builder = {
  keys: {
    desc: 'Provide keys for the records in the multi-record transaction',
    type: 'array',
    group: 'Command:'
  }
}
