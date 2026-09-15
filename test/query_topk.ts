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

'use strict'

/* eslint-env mocha */
/* global expect */

// Server integration tests for Query#orderBy/Query#topK (`ORDER BY <bin>
// LIMIT k`), executed against a live cluster that supports the
// `query-order-by` feature. Client-side argument validation and pre-flight
// checks that never reach the server are covered separately in
// test/query_orderby.ts (#noserver).
//
// Note: maxRecords is incompatible with orderBy/topK (rejected client-side,
// see test/query_orderby.ts) so it isn't exercised here.

import type { Client, Key as K, AerospikeRecord, query as queryModule } from '../lib/aerospike.js';
import * as Aerospike from '../lib/aerospike.js';

import { expect } from 'chai';
import * as helper from './test_helper.ts';

const orderByType: typeof queryModule.orderByType = Aerospike.query.orderByType
const order: typeof queryModule.order = Aerospike.query.order
const orderByFlags: typeof queryModule.orderByFlags = Aerospike.query.orderByFlags

describe('Query#orderBy / Query#topK - server integration', function () {
  helper.skipUnlessSupportsFeature(Aerospike.features.QUERY_ORDER_BY, this)

  const client: Client = helper.client
  const testSet = 'test/topk-' + Math.floor(Math.random() * 100000)

  // 25 records:
  //  - i in [0, 19]: score=i, fscore=i*1.5, blob=Buffer.from([i]),
  //    name=letter (upper-cased on even i to exercise CASE_INSENSITIVE).
  //  - i in [20, 24]: score=100 for all five (a 5-way tie at the top of the
  //    INTEGER ranking), fscore/blob/name stay monotonic with i so the
  //    DOUBLE/BYTES/STRING order-by tests remain unambiguous.
  const RECORD_COUNT = 25
  const TIE_SCORE = 100
  const letters = 'abcdefghijklmnopqrstuvwxy'

  const keys: K[] = []

  function recordFor (i: number) {
    const letter = letters[i]
    return {
      id: i,
      score: i < 20 ? i : TIE_SCORE,
      // Wrapped in Aerospike.Double - otherwise whole-number results of
      // i*1.5 (e.g. i=2 -> 3) would be written as AS_INTEGER rather than
      // AS_DOUBLE, and get excluded from DOUBLE order-by ranking.
      fscore: new Aerospike.Double(i * 1.5),
      name: i % 2 === 0 ? letter.toUpperCase() : letter,
      blob: Buffer.from([i])
    }
  }

  before(async function () {
    for (let i = 0; i < RECORD_COUNT; i++) {
      const key = new Aerospike.Key(helper.namespace, testSet, i)
      keys.push(key)
      await client.put(key, recordFor(i))
    }
  })

  after(async function () {
    await Promise.all(keys.map(key => client.remove(key)))
  })

  function ids (records: AerospikeRecord[]): number[] {
    return records.map(r => r.bins.id as number)
  }

  describe('INTEGER order-by', function () {
    it('returns the global top-k records in descending order', async function () {
      const query = client.query(helper.namespace, testSet)
      query.orderBy('score', orderByType.INTEGER, order.DESC)
      query.topK(5)

      const records = await query.results()
      expect(records.length).to.equal(5)
      // The top 5 by score are exactly the 5-way tie at score=100
      // (ids 20-24); tie-break order among them is unspecified.
      expect(ids(records).sort((a, b) => a - b)).to.eql([20, 21, 22, 23, 24])
      records.forEach(r => expect(r.bins.score).to.equal(TIE_SCORE))
    })

    it('returns the global top-k records in ascending order', async function () {
      const query = client.query(helper.namespace, testSet)
      query.orderBy('score', orderByType.INTEGER, order.ASC)
      query.topK(5)

      const records = await query.results()
      expect(ids(records)).to.eql([0, 1, 2, 3, 4])
      expect(records.map(r => r.bins.score)).to.eql([0, 1, 2, 3, 4])
    })

    it('defaults to DESC when no direction is given', async function () {
      const query = client.query(helper.namespace, testSet)
      query.orderBy('score', orderByType.INTEGER)
      query.topK(1)

      const records = await query.results()
      expect(records.length).to.equal(1)
      expect(records[0].bins.score).to.equal(TIE_SCORE)
    })
  })

  describe('DOUBLE order-by', function () {
    it('ranks by a floating point bin, descending', async function () {
      const query = client.query(helper.namespace, testSet)
      query.orderBy('fscore', orderByType.DOUBLE, order.DESC)
      query.topK(5)

      const records = await query.results()
      expect(ids(records)).to.eql([24, 23, 22, 21, 20])
      expect(records.map(r => r.bins.fscore)).to.eql([36, 34.5, 33, 31.5, 30])
    })

    it('ranks by a floating point bin, ascending', async function () {
      const query = client.query(helper.namespace, testSet)
      query.orderBy('fscore', orderByType.DOUBLE, order.ASC)
      query.topK(5)

      const records = await query.results()
      expect(ids(records)).to.eql([0, 1, 2, 3, 4])
      expect(records.map(r => r.bins.fscore)).to.eql([0, 1.5, 3, 4.5, 6])
    })
  })

  describe('STRING order-by', function () {
    it('CASE_INSENSITIVE ranks purely by letter, ignoring case', async function () {
      const query = client.query(helper.namespace, testSet)
      query.orderBy('name', orderByType.STRING, order.DESC, orderByFlags.CASE_INSENSITIVE)
      query.topK(5)

      const records = await query.results()
      expect(ids(records)).to.eql([24, 23, 22, 21, 20])
      // Case is preserved in the stored value even though it didn't affect ranking.
      expect(records.map(r => r.bins.name)).to.eql(['Y', 'x', 'W', 'v', 'U'])
    })

    it('plain byte comparison ranks lowercase above uppercase (no CASE_INSENSITIVE)', async function () {
      const query = client.query(helper.namespace, testSet)
      query.orderBy('name', orderByType.STRING, order.DESC)
      query.topK(5)

      const records = await query.results()
      // Without the flag, all lowercase letters (odd ids) sort above all
      // uppercase letters (even ids) since lowercase ASCII codes are larger -
      // demonstrating CASE_INSENSITIVE actually changes the result set.
      expect(ids(records)).to.eql([23, 21, 19, 17, 15])
      expect(records.map(r => r.bins.name)).to.eql(['x', 'v', 't', 'r', 'p'])
    })
  })

  describe('BYTES order-by', function () {
    it('ranks by a blob bin using lexicographic byte comparison, descending', async function () {
      const query = client.query(helper.namespace, testSet)
      query.orderBy('blob', orderByType.BYTES, order.DESC)
      query.topK(5)

      const records = await query.results()
      expect(ids(records)).to.eql([24, 23, 22, 21, 20])
    })

    it('ranks by a blob bin using lexicographic byte comparison, ascending', async function () {
      const query = client.query(helper.namespace, testSet)
      query.orderBy('blob', orderByType.BYTES, order.ASC)
      query.topK(5)

      const records = await query.results()
      expect(ids(records)).to.eql([0, 1, 2, 3, 4])
    })
  })

  describe('projection consistency', function () {
    it('only returns the selected bins when select() is used', async function () {
      const query = client.query(helper.namespace, testSet, { select: ['score'] })
      query.orderBy('score', orderByType.INTEGER, order.DESC)
      query.topK(5)

      const records = await query.results()
      expect(records.length).to.equal(5)
      records.forEach(r => {
        expect(Object.keys(r.bins)).to.eql(['score'])
        expect(r.bins.score).to.equal(TIE_SCORE)
      })
    })
  })

  describe('k boundaries', function () {
    it('k=1 returns exactly the single best-ranked record', async function () {
      const query = client.query(helper.namespace, testSet)
      query.orderBy('score', orderByType.INTEGER, order.ASC)
      query.topK(1)

      const records = await query.results()
      expect(records.length).to.equal(1)
      expect(records[0].bins.id).to.equal(0)
    })

    it('k larger than the number of matching records returns all of them, still ranked', async function () {
      const smallSet = testSet + '-small'
      const smallKeys = [0, 1, 2].map(i => new Aerospike.Key(helper.namespace, smallSet, i))
      await Promise.all(smallKeys.map((key, i) => client.put(key, { id: i, score: i + 1 })))

      try {
        const query = client.query(helper.namespace, smallSet)
        query.orderBy('score', orderByType.INTEGER, order.DESC)
        query.topK(1000)

        const records = await query.results()
        expect(records.length).to.equal(3)
        expect(ids(records)).to.eql([2, 1, 0])
      } finally {
        await Promise.all(smallKeys.map(key => client.remove(key)))
      }
    })
  })

  describe('Query#min / Query#max', function () {
    it('finds the minimum value of an INTEGER bin', async function () {
      const query = client.query(helper.namespace, testSet)
      const min = await query.min('score', orderByType.INTEGER)
      expect(min).to.equal(0)
    })

    it('finds the maximum value of an INTEGER bin', async function () {
      const query = client.query(helper.namespace, testSet)
      const max = await query.max('score', orderByType.INTEGER)
      expect(max).to.equal(TIE_SCORE)
    })

    it('finds the minimum value of a DOUBLE bin', async function () {
      const query = client.query(helper.namespace, testSet)
      const min = await query.min('fscore', orderByType.DOUBLE)
      expect(min).to.equal(0)
    })

    it('finds the maximum value of a DOUBLE bin', async function () {
      const query = client.query(helper.namespace, testSet)
      const max = await query.max('fscore', orderByType.DOUBLE)
      expect(max).to.equal(36)
    })

    it('projects only the requested bin when the query has no prior projection', async function () {
      const query = client.query(helper.namespace, testSet)
      await query.min('score', orderByType.INTEGER)
      expect(query.selected).to.eql(['score'])
    })

    it('accepts a bin already covered by an existing projection', async function () {
      const query = client.query(helper.namespace, testSet, { select: ['score', 'fscore'] })
      const min = await query.min('score', orderByType.INTEGER)
      expect(min).to.equal(0)
    })

    it('rejects a bin not covered by an existing projection', async function () {
      const query = client.query(helper.namespace, testSet, { select: ['fscore'] })
      await expect(query.min('score', orderByType.INTEGER)).to.be.rejectedWith(Aerospike.AerospikeError)
    })

    it('returns null when the result set is empty', async function () {
      const query = client.query(helper.namespace, testSet + '-empty')
      const min = await query.min('score', orderByType.INTEGER)
      expect(min).to.equal(null)
    })
  })
})
