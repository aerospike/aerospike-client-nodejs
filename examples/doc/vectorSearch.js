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

const { Vector, exp } = Aerospike

// Stores three embeddings, then returns the two most similar to a query vector.
async function runExample ({ client, ns, set, console, requireMinServerVersion }) {
  requireMinServerVersion('8.2.1')

  const embeddings = { vector1: [1, 0, 0], vector2: [0.8, 0.6, 0], vector3: [0, 0, 1] }
  for (const [name, embedding] of Object.entries(embeddings)) {
    await client.put(new Aerospike.Key(ns, set, name), { vecname: name, vecembedding: Vector.ofFloat32(embedding) })
  }

  const similarity = exp.vectorDistance(Aerospike.vectorDistanceMetric.COSINE_SIMILARITY,
    Vector.ofFloat32([1, 0.1, 0]), exp.binVector('vecembedding'))
  const query = client.query(ns, set)
  query.ops = [Aerospike.operations.read('vecname'), exp.operations.read('vecscore', similarity, exp.expReadFlags.DEFAULT)]
  query.orderBy('vecscore', Aerospike.orderByType.DOUBLE, Aerospike.order.DESC)
  query.topK(2)

  // Only rank records that hold an embedding; others in the set have none.
  const records = await query.results({ filterExpression: exp.binExists('vecembedding') })
  records.forEach((record, i) => {
    console.info(`VectorSearch #${i + 1}: ${record.bins.vecname} ${record.bins.vecscore.toFixed(3)}`)
  })
}

module.exports = { name: 'VectorSearch', runExample }
