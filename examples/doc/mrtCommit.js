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

const MRT_KEYS = ['mrtkey1', 'mrtkey2']
const TXN_BINS = { def: 456 }

async function runExample ({
  client,
  ns,
  set,
  writePolicy,
  console,
  requireEnterprise,
  requireStrongConsistency,
  requireMinServerVersion
}) {
  requireEnterprise()
  requireStrongConsistency()
  requireMinServerVersion('8.0.0')

  const mrt = new Aerospike.Transaction()
  const policy = { ...writePolicy, txn: mrt }
  const keys = MRT_KEYS.map(userKey => new Aerospike.Key(ns, set, userKey))

  for (const key of keys) {
    await client.put(key, TXN_BINS, policy)
    await client.get(key, policy)
  }

  console.info(`MrtCommit committing transaction with ${keys.length * 2} operations`)
  const status = await client.commit(mrt)
  console.info(`MrtCommit commit status=${status}`)
}

module.exports = { name: 'MrtCommit', runExample, MRT_KEYS, TXN_BINS }
