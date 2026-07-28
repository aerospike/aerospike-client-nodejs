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

const DOC_READ_KEY = 'docreadkey'

async function runExample ({ client, ns, set, policy, console }) {
  const key = new Aerospike.Key(ns, set, DOC_READ_KEY)

  const readPolicy = { ...policy, totalTimeout: 1000 }
  console.info(`Read policy: totalTimeout=${readPolicy.totalTimeout}`)

  let exists = await client.exists(key, policy)
  console.info(`Exists: ${exists}`)

  const header = await client.get(key, policy)
  console.info(`Record header: generation=${header.gen}`)

  const record = await client.get(key, policy)
  console.info(`Whole record: ${JSON.stringify(record.bins)}`)

  const partial = await client.select(key, ['report', 'location'], policy)
  console.info(`Selected bins: ${JSON.stringify(partial.bins)}`)
}

module.exports = { name: 'Get', runExample }
