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

async function runExample ({ client, ns, set, writePolicy, console }) {
  const key = new Aerospike.Key(ns, set, 'putkey')
  const createPolicy = { ...writePolicy, exists: Aerospike.policy.exists.CREATE }
  await client.put(key, { name: 'Alice', age: 42 }, null, createPolicy)
  console.info('Put with CREATE policy completed')

  const updatePolicy = { ...writePolicy, exists: Aerospike.policy.exists.UPDATE }
  await client.put(key, { age: 43 }, null, updatePolicy)
  console.info('Put with UPDATE policy completed')
}

module.exports = { name: 'Put', runExample }
