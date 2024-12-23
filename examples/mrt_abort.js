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

async function mrt_abort (client, argv) {

  let record1 = {abc: 123}
  let record2 = {def: 456}

  let mrt = new Aerospike.Transaction()

  const policy = {
      txn: mrt
  }
  let key_list = []
  for (var i = 0; i < argv.keys.length; i++) {
    key_list.push(new Aerospike.Key(argv.namespace, argv.set, argv.keys[i]))
  }
  for (var i = 0; i < argv.keys.length; i++) {
    await client.put(key_list[i], policy)
    await client.get(key_list[i], policy)
  }

  console.log(key_list)

  console.log("aborting multi-record transaction with %d operations.", key_list.length*2)
  await client.abort(mrt)
  console.info("multi-record transaction has been aborted.")
}

exports.command = 'mrt_abort <keys..>'
exports.describe = 'Abort a multi-record transaction'
exports.handler = shared.run(mrt_abort)
exports.builder = {
  keys: {
    desc: 'Provide keys for the records in the multi-record transaction',
    type: 'array',
    group: 'Command:'
  }
}
