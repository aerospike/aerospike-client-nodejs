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

async function runExample ({ client, ns, set, console }) {
  const begin = 14
  const end = 18
  const binName = 'querybinint'
  console.info(`Query range ${begin}-${end} on ${binName}`)

  const query = client.query(ns, set)
  query.where(Aerospike.filter.range(binName, begin, end))
  query.select(binName)

  const stream = query.foreach()
  await new Promise((resolve, reject) => {
    stream.on('data', record => {
      console.info(`Query hit: key=${record.key.key} ${binName}=${record.bins[binName]}`)
    })
    stream.on('error', reject)
    stream.on('end', resolve)
  })
}

module.exports = { name: 'QueryInteger', runExample }
