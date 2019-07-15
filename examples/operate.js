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
const op = Aerospike.operations
const lists = Aerospike.lists

shared.runner()

async function operate (client, argv) {
  const key = new Aerospike.Key(argv.namespace, argv.set, argv.key)
  const i = shared.random.int(1, 10)
  const ops = [
    lists.append('values', i),
    op.read('values'),
    op.incr('sum', i),
    op.read('sum')
  ]
  const results = await client.operate(key, ops)
  console.info(results)
}

exports.command = 'operate <key>'
exports.describe = 'Perform multiple operations on a single record'
exports.handler = shared.run(operate)
