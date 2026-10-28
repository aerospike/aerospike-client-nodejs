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

/* global describe, it, afterEach */

import { expect } from 'chai';
import * as Aerospike from '../../lib/aerospike.js';
import * as helper from '../test_helper.ts';
import { loadSet, removeLoadedSets, indexBin, indexExpression, topK, values, allRecords, partitionId, skipUnlessTopKQueriesRun } from './helpers.ts';

const { INTEGER } = Aerospike.orderByType
const { ASC, DESC } = Aerospike.order
const { exp, filter } = Aerospike
const { SHORT } = Aerospike.policy.queryDuration

// The half of the 4,096 partitions that leaves out the given record, so a
// partition filter always changes the answer, wherever the digests land.
const halfWithout = (record: any): [number, number] => partitionId(record) < 2048 ? [2048, 2048] : [0, 2048]

// Ten records: n = 0 to 9, cat = 'even' or 'odd'.
const tenRecords = () => Array.from({ length: 10 }, (_, n) => ({ n, cat: n % 2 === 0 ? 'even' : 'odd' }))
const byNDesc = (q: any) => q.orderBy('n', INTEGER, DESC)

describe('Top-K on each query path', function () {
  this.timeout(60000)
  helper.skipUnlessVersion('>= 8.2.1', this)
  skipUnlessTopKQueriesRun(this)

  afterEach(removeLoadedSets)

  const indexCat = (set: string) => indexBin(set, 'cat', Aerospike.indexDataType.STRING)

  it('ranks only the records a secondary-index filter matches', async function () {
    const set = await loadSet(tenRecords())
    await indexCat(set)

    const records = await topK(set, q => {
      q.where(filter.equal('cat', 'even'))
      byNDesc(q)
    }, 3)
    expect(values(records, 'n')).to.eql([8, 6, 4])
  })

  it('ranks within a secondary-index range on the same bin, in both directions', async function () {
    const set = await loadSet(tenRecords())
    await indexBin(set, 'n', Aerospike.indexDataType.INTEGER)
    const inRange = (direction: number) => (q: any) => {
      q.where(filter.range('n', 3, 8))
      q.orderBy('n', INTEGER, direction)
    }

    expect(values(await topK(set, inRange(DESC), 3), 'n')).to.eql([8, 7, 6])
    expect(values(await topK(set, inRange(ASC), 3), 'n')).to.eql([3, 4, 5])
  })

  it('ranks within a filter on an expression index, and on an index chosen by name', async function () {
    const set = await loadSet(tenRecords())

    await indexExpression(set, 'n_exp', exp.binInt('n'), Aerospike.indexDataType.INTEGER)
    const viaExpression = await topK(set, q => {
      q.whereWithExp(filter.range(null as any, 3, 8), exp.binInt('n'))
      byNDesc(q)
    }, 3)
    expect(values(viaExpression, 'n')).to.eql([8, 7, 6])

    const catIndex = await indexCat(set)
    const viaName = await topK(set, q => {
      q.whereWithIndexName(filter.equal(null as any, 'even'), catIndex)
      byNDesc(q)
    }, 3)
    expect(values(viaName, 'n')).to.eql([8, 6, 4])
  })

  it('ranks within a filter on a value nested in a map (CDT context)', async function () {
    const set = await loadSet(Array.from({ length: 10 }, (_, n) => ({ n, m: { score: n } })))
    const score = new Aerospike.cdt.Context().addMapKey('score')
    await indexBin(set, 'm', Aerospike.indexDataType.INTEGER, score)

    const records = await topK(set, q => {
      q.where(filter.range('m', 3, 8, Aerospike.indexType.DEFAULT, score))
      byNDesc(q)
    }, 3)
    expect(values(records, 'n')).to.eql([8, 7, 6])
  })

  it('ranks only the records a filter expression keeps, alone and with a secondary-index filter', async function () {
    const set = await loadSet(tenRecords())
    await indexCat(set)
    const belowSeven = { filterExpression: exp.lt(exp.binInt('n'), exp.int(7)) }

    expect(values(await topK(set, byNDesc, 3, belowSeven), 'n')).to.eql([6, 5, 4])

    const evenAndBelowSeven = await topK(set, q => {
      q.where(filter.equal('cat', 'even'))
      byNDesc(q)
    }, 3, belowSeven)
    expect(values(evenAndBelowSeven, 'n')).to.eql([6, 4, 2])

    const belowThree = { filterExpression: exp.lt(exp.binInt('n'), exp.int(3)) }
    expect(values(await topK(set, byNDesc, 10, belowThree), 'n'), 'fewer matches than k').to.eql([2, 1, 0])

    const belowZero = { filterExpression: exp.lt(exp.binInt('n'), exp.int(0)) }
    expect(await topK(set, byNDesc, 3, belowZero), 'no matches').to.eql([])

    const shortHint = { ...belowSeven, expectedDuration: SHORT }
    expect(values(await topK(set, byNDesc, 3, shortHint), 'n'), 'the short-query hint is ignored').to.eql([6, 5, 4])
  })

  it('ranks only the records in the requested partitions', async function () {
    const set = await loadSet(Array.from({ length: 40 }, (_, n) => ({ n })))
    const all = await allRecords(set)
    const [begin, count] = halfWithout(all.find(record => record.bins.n === 39))
    const inHalf = all.filter(record => partitionId(record) >= begin && partitionId(record) < begin + count)
    const expected = values(inHalf, 'n').sort((a: any, b: any) => b - a).slice(0, 5)

    const records = await topK(set, q => {
      q.partitions(begin, count)
      byNDesc(q)
    }, 5)
    expect(values(records, 'n')).to.eql(expected)
    expect(values(records, 'n')).to.not.include(39)
  })

  it('ranks only the records in the requested partitions that both filters keep', async function () {
    const set = await loadSet(Array.from({ length: 40 }, (_, n) => ({ n, cat: n % 2 === 0 ? 'even' : 'odd' })))
    await indexCat(set)
    const all = await allRecords(set)
    const [begin, count] = halfWithout(all.find(record => record.bins.n === 28)) // the filters' best on their own
    const kept = all.filter(record => partitionId(record) >= begin && partitionId(record) < begin + count &&
      record.bins.cat === 'even' && (record.bins.n as number) < 30)
    const expected = values(kept, 'n').sort((a: any, b: any) => b - a).slice(0, 3)

    const records = await topK(set, q => {
      q.partitions(begin, count)
      q.where(filter.equal('cat', 'even'))
      byNDesc(q)
    }, 3, { filterExpression: exp.lt(exp.binInt('n'), exp.int(30)) })
    expect(values(records, 'n')).to.eql(expected)
    expect(values(records, 'n')).to.not.include(28)
  })

  it('orders by a computed distance, nearest first, within both filters: the similarity-search pattern', async function () {
    const set = await loadSet(tenRecords())
    await indexCat(set)

    // Even n above 0 are 2, 4, 6, 8; their distance to 7 is 5, 3, 1, 1. Ties go to the higher n.
    const records = await topK(set, q => {
      q.where(filter.equal('cat', 'even'))
      q.ops = [
        exp.operations.read('dist', exp.abs(exp.sub(exp.binInt('n'), exp.int(7))), 0),
        exp.operations.read('n', exp.binInt('n'), 0)
      ]
      q.orderBy('dist', INTEGER, ASC)
      q.thenOrderBy('n', INTEGER, DESC)
    }, 3, { filterExpression: exp.gt(exp.binInt('n'), exp.int(0)) })

    expect(records.map(r => [r.bins.dist, r.bins.n])).to.eql([[1, 8], [1, 6], [3, 4]])
  })

  it('stops cleanly when foreach() is aborted after the first record', async function () {
    const set = await loadSet(tenRecords())
    const query = helper.client.query(helper.namespace, set)
    byNDesc(query)
    query.topK(5)

    let received = 0
    await new Promise<void>((resolve, reject) => {
      const stream = query.foreach()
      stream.on('data', () => {
        received++
        stream.abort()
      })
      stream.on('error', reject)
      stream.on('end', () => resolve())
    })
    expect(received).to.be.within(1, 5)

    // The client still works afterwards.
    expect(values(await topK(set, byNDesc, 3), 'n')).to.eql([9, 8, 7])
  })

  it('orders by a selected bin and returns only the selected bins', async function () {
    const set = await loadSet([1, 5, 3, 4, 2].map(n => ({ n, label: `n${n}`, extra: true })))

    const records = await topK(set, q => {
      q.select('n', 'label')
      byNDesc(q)
    }, 3)
    expect(values(records, 'n')).to.eql([5, 4, 3])
    for (const record of records) {
      expect(Object.keys(record.bins).sort()).to.eql(['label', 'n'])
    }
  })

  it('orders by a computed bin; records it cannot compute drop out by default, or rank last with EVAL_NO_FAIL', async function () {
    const set = await loadSet([{ m: 1 }, { m: 2 }, { m: 3 }, { other: 1 }, { other: 2 }])
    const byNegatedM = (flags: number) => (q: any) => {
      q.ops = [exp.operations.read('negM', exp.mul(exp.binInt('m'), exp.int(-1)), flags)]
      q.orderBy('negM', INTEGER, DESC)
    }

    const computable = await topK(set, byNegatedM(exp.expReadFlags.DEFAULT), 5)
    expect(values(computable, 'negM')).to.eql([-1, -2, -3])

    const all = await topK(set, byNegatedM(exp.expReadFlags.EVAL_NO_FAIL), 5)
    expect(values(all, 'negM').slice(0, 3)).to.eql([-1, -2, -3])
    expect(values(all, 'negM').slice(3).every(value => value == null), 'the two without m have no value').to.be.true
  })
})
