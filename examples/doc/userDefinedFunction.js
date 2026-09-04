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

const PACKAGE = 'record_example'

async function runExample ({ client, ns, set, writePolicy, console }) {
  const key1 = new Aerospike.Key(ns, set, 'udfkey1')
  await client.apply(key1, {
    module: PACKAGE,
    funcname: 'writeBin',
    args: ['udfbin1', 'string value']
  })

  const key3 = new Aerospike.Key(ns, set, 'udfkey3')
  await client.apply(key3, {
    module: PACKAGE,
    funcname: 'writeBin',
    args: ['udfbin3', 'first']
  })
  await client.apply(key3, {
    module: PACKAGE,
    funcname: 'writeUnique',
    args: ['udfbin3', 'second']
  })

  console.info('UserDefinedFunction writes completed')
}

module.exports = { name: 'UserDefinedFunction', runExample }
