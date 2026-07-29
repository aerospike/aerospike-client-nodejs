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

const INDEX_NAME = 'sindexdemo'

async function runExample ({ client, args, console }) {
  const job = await client.createIndex({
    ns: args.namespace,
    set: args.set,
    bin: 'sindexbin',
    index: INDEX_NAME,
    datatype: Aerospike.indexDataType.STRING,
    type: Aerospike.indexType.DEFAULT
  })
  await job.wait()
  console.info(`Created secondary index ${INDEX_NAME} on sindexbin`)
}

module.exports = { name: 'SecondaryIndex', runExample }
