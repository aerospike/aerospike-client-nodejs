// *****************************************************************************
// Copyright 2026 Aerospike, Inc.
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

const Aerospike = require('../harness/aerospikeClient')

const SIZE = 8
const KEY_PREFIX = 'batchkey'
const BIN_NAME = 'batchbin'

function buildKeys (ns, set) {
  const keys = []
  for (let i = 1; i <= SIZE; i++) {
    keys.push(new Aerospike.Key(ns, set, `${KEY_PREFIX}${i}`))
  }
  return keys
}

async function runExample ({ client, ns, set, batchPolicy, console }) {
  const keys = buildKeys(ns, set)
  const existsResults = await client.batchExists(keys, batchPolicy)
  for (let i = 0; i < keys.length; i++) {
    console.info(`Exists ${keys[i].key}: ${existsResults[i].status === Aerospike.status.OK}`)
  }

  const batchRecords = keys.map(key => ({ key, bins: [BIN_NAME] }))
  const readResults = await client.batchRead(batchRecords, batchPolicy)
  for (let i = 0; i < readResults.length; i++) {
    const result = readResults[i]
    const value = result.record ? result.record.bins[BIN_NAME] : undefined
    console.info(`Batch read ${keys[i].key}: ${value}`)
  }
}

module.exports = { name: 'Batch', runExample }
