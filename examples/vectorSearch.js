#!/usr/bin/env node
// *****************************************************************************
// Copyright 2013-2026 Aerospike, Inc.
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

// Demonstrates Vector bins + KNN search (exp.vectorDist + Query#orderBy/
// Query#topK), plain Top-K ranking of a scalar bin, and the Query#min/
// Query#max convenience methods. Requires a server that supports the
// "query-order-by" feature.

const Aerospike = require('aerospike')
const shared = require('./shared')

shared.runner()

const VEC_BIN = 'vec'
const SCORE_BIN = 'score'

const METRICS = {
  euclidean: {
    value: Aerospike.exp.vectorDistanceMetric.EUCLIDEAN,
    direction: Aerospike.query.order.ASC, // smaller (squared) distance = closer
    describe: 'Euclidean squared distance'
  },
  dot: {
    value: Aerospike.exp.vectorDistanceMetric.DOT_PRODUCT,
    direction: Aerospike.query.order.DESC, // larger dot product = more similar
    describe: 'dot product'
  },
  cosine: {
    value: Aerospike.exp.vectorDistanceMetric.COSINE,
    direction: Aerospike.query.order.DESC, // larger cosine similarity = more similar
    describe: 'cosine similarity'
  }
}

// Seeds argv.count sample records: id/score = 0..count-1, vec = [i, 1, 0, 0]
async function seed (client, argv) {
  const keys = []
  for (let i = 0; i < argv.count; i++) {
    const key = new Aerospike.Key(argv.namespace, argv.set, `vector-search-${i}`)
    const vec = Aerospike.Vector.ofFloat32([i, 1.0, 0.0, 0.0])
    await client.put(key, { id: i, [SCORE_BIN]: i, [VEC_BIN]: vec })
    keys.push(key)
  }
  return keys
}

async function cleanup (client, keys) {
  await Promise.all(keys.map(key => client.remove(key)))
}

// KNN search: rank every record by its vector distance/similarity to
// argv.vector, and return only the argv.k closest matches.
async function knnQuery (client, argv) {
  const exp = Aerospike.exp
  const op = Aerospike.operations
  const metric = METRICS[argv.metric]
  const queryVector = Aerospike.Vector.ofFloat32(argv.vector.map(Number))

  const ops = [
    op.read('id'),
    // Computes the distance/similarity server-side, on the fly, as a
    // projected "distance" bin - nothing needs to be pre-computed or stored.
    exp.operations.read('distance', exp.vectorDist(metric.value, queryVector, exp.binVector(VEC_BIN)), 0)
  ]

  const query = client.query(argv.namespace, argv.set, { ops })
  query.orderBy('distance', Aerospike.query.orderByType.DOUBLE, metric.direction)
  query.topK(argv.k)

  console.info('\nTop %d nearest neighbors by %s to [%s]:', argv.k, metric.describe, argv.vector.join(', '))
  const records = await query.results()
  records.forEach(r => console.info('  id=%s distance=%s', r.bins.id, r.bins.distance))
}

// Plain (non-vector) Top-K: rank by the "score" bin directly.
async function topKQuery (client, argv) {
  const orderByType = Aerospike.query.orderByType
  const query = client.query(argv.namespace, argv.set)
  query.orderBy(SCORE_BIN, orderByType.INTEGER, Aerospike.query.order.DESC)
  query.topK(argv.k)

  console.info('\nTop %d records by "%s", descending:', argv.k, SCORE_BIN)
  const records = await query.results()
  records.forEach(r => console.info('  id=%s score=%s', r.bins.id, r.bins.score))
}

// Query#min/Query#max: reduce the whole result set down to a single scalar,
// built on the same orderBy/topK primitives used above.
async function minMaxQuery (client, argv) {
  const orderByType = Aerospike.query.orderByType
  const min = await client.query(argv.namespace, argv.set).min(SCORE_BIN, orderByType.INTEGER)
  const max = await client.query(argv.namespace, argv.set).max(SCORE_BIN, orderByType.INTEGER)

  console.info('\nQuery#min/Query#max on "%s": min=%s max=%s', SCORE_BIN, min, max)
}

async function vectorSearch (client, argv) {
  const keys = argv.seed ? await seed(client, argv) : []

  try {
    await knnQuery(client, argv)
    if (argv.topk) {
      await topKQuery(client, argv)
    }
    if (argv.minMax) {
      await minMaxQuery(client, argv)
    }
  } finally {
    if (argv.seed && !argv.keep) {
      await cleanup(client, keys)
    }
  }
}

exports.command = 'vectorSearch'
exports.describe = 'Seed sample vector records and run a KNN Top-K query (exp.vectorDist + Query#orderBy/#topK), plus Query#min/#max'
exports.handler = shared.run(vectorSearch)
exports.builder = {
  seed: {
    describe: 'Insert sample vector records before querying',
    type: 'boolean',
    default: true,
    group: 'Command:'
  },
  keep: {
    describe: 'Keep the seeded records after the command completes',
    type: 'boolean',
    default: false,
    group: 'Command:'
  },
  count: {
    describe: 'Number of sample records to seed',
    type: 'number',
    default: 20,
    group: 'Command:'
  },
  metric: {
    describe: 'Vector distance metric to rank the KNN query by',
    choices: ['euclidean', 'dot', 'cosine'],
    default: 'euclidean',
    group: 'Command:'
  },
  vector: {
    describe: 'Query vector to compare every record against',
    type: 'array',
    default: [7.3, 1.0, 0.0, 0.0],
    group: 'Command:'
  },
  k: {
    describe: 'Number of results to return (Top-K)',
    type: 'number',
    default: 5,
    group: 'Command:'
  },
  topk: {
    describe: 'Also demonstrate plain (non-vector) Top-K ranking of the "score" bin',
    type: 'boolean',
    default: true,
    group: 'Command:'
  },
  minMax: {
    describe: 'Also demonstrate Query#min/Query#max on the "score" bin',
    type: 'boolean',
    default: true,
    group: 'Command:'
  }
}
