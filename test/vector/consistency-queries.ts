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

'use strict'

/* global describe, it, before, after */

// Runs only when the test namespace has strong consistency on (enterprise server).

import { expect } from 'chai';
import * as Aerospike from '../../lib/aerospike.js';
import * as helper from '../test_helper.ts';
import { topK, values, skipUnlessTopKQueriesRun } from '../topk/helpers.ts';
import { METRICS, makeVector, referenceDistance, loadVectors, removeLoadedSets, seededRandom } from './helpers.ts';

const { Vector, exp, filter, operations } = Aerospike
const { INTEGER, DOUBLE } = Aerospike.binDataType
const { ASC, DESC } = Aerospike.order
const { FLOAT64 } = Aerospike.vectorElementType

const byNDesc = (q: any) => q.orderBy('n', INTEGER, DESC)

// Ten records: n 0 to 9, even or odd, and n again inside a map.
const tenRecords = () => Array.from({ length: 10 }, (_, n) => ({ n, cat: n % 2 === 0 ? 'even' : 'odd', m: { score: n } }))

describe('Top-K and vector search with strong consistency', function () {
  this.timeout(120000)
  helper.skipUnlessVersion('>= 8.2.1', this)
  before(async function () {
    const config = await helper.client.infoAny(`get-config:context=namespace;id=${helper.namespace}`)
    if (!/strong-consistency=true/.test(config)) this.skip()
  })
  skipUnlessTopKQueriesRun(this)

  const indexes: string[] = []
  const index = async (name: string, create: (name: string) => Promise<void>) => {
    indexes.push(name)
    await create(name)
    return name
  }
  after(async function () {
    for (const name of indexes.splice(0)) await helper.index.remove(name)
    await removeLoadedSets()
  })

  it('ranks the same records as on an AP namespace, on every query path', async function () {
    const records = tenRecords()
    const set = await loadVectors(records.map(() => undefined), records)

    expect(values(await topK(set, byNDesc, 3), 'n'), 'no filter').to.eql([9, 8, 7])
    expect(values(await topK(set, byNDesc, 3, { filterExpression: exp.lt(exp.binInt('n'), exp.int(7)) }), 'n'), 'filter expression')
      .to.eql([6, 5, 4])

    const cat = await index(`${set}_cat`, name => helper.index.create(name, set, 'cat', Aerospike.indexDataType.STRING as any, Aerospike.indexType.DEFAULT as any))
    expect(values(await topK(set, q => { q.where(filter.equal('cat', 'even')); byNDesc(q) }, 3), 'n'), 'index equality').to.eql([8, 6, 4])
    expect(values(await topK(set, q => { q.whereWithIndexName(filter.equal(null as any, 'odd'), cat); byNDesc(q) }, 3), 'n'), 'index by name')
      .to.eql([9, 7, 5])

    await index(`${set}_n`, name => helper.index.create(name, set, 'n', Aerospike.indexDataType.INTEGER as any, Aerospike.indexType.DEFAULT as any))
    expect(values(await topK(set, q => { q.where(filter.range('n', 3, 8)); q.orderBy('n', INTEGER, ASC) }, 3), 'n'), 'index range')
      .to.eql([3, 4, 5])

    await index(`${set}_nexp`, name => helper.index.createExpIndex(name, set, exp.binInt('n'), Aerospike.indexDataType.INTEGER as any, Aerospike.indexType.DEFAULT as any))
    expect(values(await topK(set, q => { q.whereWithExp(filter.range(null as any, 3, 8), exp.binInt('n')); byNDesc(q) }, 3), 'n'), 'expression index')
      .to.eql([8, 7, 6])

    const score = new Aerospike.cdt.Context().addMapKey('score')
    await index(`${set}_m`, name => helper.index.create(name, set, 'm', Aerospike.indexDataType.INTEGER as any, Aerospike.indexType.DEFAULT as any, score))
    expect(values(await topK(set, q => { q.where(filter.range('m', 2, 5, Aerospike.indexType.DEFAULT, score)); byNDesc(q) }, 3), 'n'), 'CDT context index')
      .to.eql([5, 4, 3])
  })

  it('finds the same nearest vectors as a brute-force search, for every metric', async function () {
    const random = seededRandom(91)
    const stored = Array.from({ length: 200 }, () => makeVector(FLOAT64, 16, () => random() * 2 - 1))
    const query = makeVector(FLOAT64, 16, () => random() * 2 - 1)
    const set = await loadVectors(stored.map(s => s.vector), stored.map((_, i) => ({ id: i })))

    for (const { name, metric } of METRICS) {
      // Squared Euclidean ranks nearest first (ASC); dot product and cosine, most similar first (DESC).
      const ascending = metric === Aerospike.vectorDistanceMetric.EUCLIDEAN_SQUARED
      const expected = stored.map((s, id) => ({ id, d: referenceDistance(metric, s.values, query.values).value }))
        .sort((a, b) => (ascending ? a.d - b.d : b.d - a.d)).slice(0, 10).map(r => r.id)
      const records = await topK(set, q => {
        q.ops = [operations.read('id'), exp.operations.read('d', exp.vectorDistance(metric, query.vector, exp.binVector('v')), 0)]
        q.orderBy('d', DOUBLE, ascending ? ASC : DESC)
      }, 10)
      expect(records.map(r => r.bins.id), name).to.eql(expected)
    }
  })

  it('ranks the committed vector, not one an open transaction has replaced, with or without the transaction', async function () {
    const set = await loadVectors([Vector.ofFloat32([1, 0]), Vector.ofFloat32([0, 1])], [{ id: 0 }, { id: 1 }])
    const nearest = (q: any) => {
      q.ops = [operations.read('id'), exp.operations.read('d', exp.vectorDistance(Aerospike.vectorDistanceMetric.DOT_PRODUCT, Vector.ofFloat32([1, 0]), exp.binVector('v')), 0)]
      q.orderBy('d', DOUBLE, DESC)
    }
    const ranked = async (policy: object | null = null) => (await topK(set, nearest, 2, policy)).map(r => [r.bins.id, r.bins.d])

    expect(await ranked()).to.eql([[0, 1], [1, 0]])
    const txn = new Aerospike.Transaction()
    try {
      // Swap the vectors inside the transaction.
      await helper.client.put(new Aerospike.Key(helper.namespace, set, 0), { v: Vector.ofFloat32([0, 1]) }, null, { txn } as any)
      await helper.client.put(new Aerospike.Key(helper.namespace, set, 1), { v: Vector.ofFloat32([2, 0]) }, null, { txn } as any)
      expect(await ranked(), 'outside the transaction').to.eql([[0, 1], [1, 0]])
      expect(await ranked({ txn }), 'with the transaction on the query policy').to.eql([[0, 1], [1, 0]])
      expect(await helper.client.commit(txn)).to.equal(Aerospike.Transaction.commitStatus.OK)
    } catch (error) {
      await helper.client.abort(txn)
      throw error
    }
    expect(await ranked(), 'after commit').to.eql([[1, 2], [0, 0]])
  })
})
