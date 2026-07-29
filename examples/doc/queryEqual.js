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

const TARGET = 'equal-match'

async function runExample ({ client, ns, set, console }) {
  const query = client.query(ns, set)
  query.where(Aerospike.filter.equal('querybineq', TARGET))
  query.select('querybineq')

  let hits = 0
  const stream = query.foreach()
  await new Promise((resolve, reject) => {
    stream.on('data', record => {
      hits += 1
      console.info(`QueryEqual hit: key=${record.key.key} bin=${record.bins.querybineq}`)
    })
    stream.on('error', reject)
    stream.on('end', resolve)
  })
  console.info(`QueryEqual total hits=${hits}`)
}

module.exports = { name: 'QueryEqual', runExample }
