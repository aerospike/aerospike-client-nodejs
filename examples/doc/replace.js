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
  const replaceKey = new Aerospike.Key(ns, set, 'replacekey')
  const replacePolicy = { ...writePolicy, exists: Aerospike.policy.exists.REPLACE }
  await client.put(replaceKey, { bin3: 'value3' }, null, replacePolicy)

  const replaceOnlyKey = new Aerospike.Key(ns, set, 'replaceonlykey')
  const replaceOnlyPolicy = { ...writePolicy, exists: Aerospike.policy.exists.REPLACE_ONLY }
  try {
    await client.put(replaceOnlyKey, { bin: 'value' }, null, replaceOnlyPolicy)
    console.info('Replace-only unexpectedly allowed on missing record; removing test key')
    await client.remove(replaceOnlyKey, writePolicy)
  } catch (err) {
    console.info('Replace-only rejected missing record as expected')
  }
}

module.exports = { name: 'Replace', runExample }
