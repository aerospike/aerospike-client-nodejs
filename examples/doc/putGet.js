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

async function runExample ({ client, ns, set, writePolicy, policy, console }) {
  const key = new Aerospike.Key(ns, set, 'putgetkey')
  await client.put(key, { bin1: 'value1' }, null, writePolicy)
  const record = await client.get(key, policy)
  console.info(`Record: ${JSON.stringify(record.bins)}`)

  const meta = await client.get(key, policy)
  console.info(`Header: generation=${meta.gen} ttl=${meta.ttl}`)
}

module.exports = { name: 'PutGet', runExample }
