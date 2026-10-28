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

// Returns the 3 best players: highest topkscore first, ties broken by topkname A to Z.
async function runExample ({ client, ns, set, console, requireMinServerVersion }) {
  requireMinServerVersion('8.2.1')

  const query = client.query(ns, set)
  query.orderBy('topkscore', Aerospike.orderByType.INTEGER, Aerospike.order.DESC)
  query.thenOrderBy('topkname', Aerospike.orderByType.STRING, Aerospike.order.ASC)
  query.topK(3)

  // Only rank this example's records; others in the set have no topkscore.
  const policy = new Aerospike.QueryPolicy({
    filterExpression: Aerospike.exp.binExists('topkscore')
  })
  const records = await query.results(policy)
  records.forEach((record, i) => {
    console.info(`QueryTopK #${i + 1}: ${record.bins.topkname} ${record.bins.topkscore}`)
  })
}

module.exports = { name: 'QueryTopK', runExample }
