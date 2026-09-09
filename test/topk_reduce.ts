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

// TopKReduce is an internal (non-exported-from-aerospike.js) helper - see
// docs/design/vector-phase-1-client-design.md §4.5. It is pure JS and
// requires no live cluster, so it is required directly rather than through
// the public Aerospike module.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const TopKReduce = require('../lib/topk_reduce')

import type { query as queryModule } from '../lib/aerospike.js';
import * as Aerospike from '../lib/aerospike.js';

import { expect } from 'chai';

const orderByType: typeof queryModule.orderByType = Aerospike.query.orderByType
const order: typeof queryModule.order = Aerospike.query.order
const orderByFlags: typeof queryModule.orderByFlags = Aerospike.query.orderByFlags

// Builds a synthetic record the same shape RecordStream receives from the
// native layer: { bins, key: { ns, set, digest } }.
function rec (digestByte: number, bins: Record<string, any>) {
  const digest = Buffer.alloc(20)
  digest[0] = digestByte
  return { bins, key: { ns: 'test', set: 'demo', digest } }
}

describe('TopKReduce #noserver', function () {
  describe('DESC + INTEGER', function () {
    it('keeps the k largest values, best-first', function () {
      const reduce = new TopKReduce('score', orderByType.INTEGER, order.DESC, orderByFlags.NONE, 3)
      ;[5, 1, 9, 3, 7, 2, 8].forEach((v, i) => reduce.acceptPartial(rec(i, { score: v })))

      const result = reduce.getResult().map((r: any) => r.bins.score)
      expect(result).to.eql([9, 8, 7])
    })
  })

  describe('ASC + DOUBLE', function () {
    it('keeps the k smallest values, best-first', function () {
      const reduce = new TopKReduce('dist', orderByType.DOUBLE, order.ASC, orderByFlags.NONE, 3)
      ;[5.5, 1.1, 9.9, 3.3, 7.7, 2.2, 8.8].forEach((v, i) => reduce.acceptPartial(rec(i, { dist: v })))

      const result = reduce.getResult().map((r: any) => r.bins.dist)
      expect(result).to.eql([1.1, 2.2, 3.3])
    })
  })

  describe('NIL handling', function () {
    it('sorts a missing bin last, regardless of direction', function () {
      const reduce = new TopKReduce('score', orderByType.INTEGER, order.DESC, orderByFlags.NONE, 5)
      reduce.acceptPartial(rec(1, { score: 5 }))
      reduce.acceptPartial(rec(2, {})) // missing bin -> NIL
      reduce.acceptPartial(rec(3, { score: 1 }))

      const result = reduce.getResult()
      expect(result).to.have.lengthOf(3)
      expect(result[0].bins.score).to.equal(5)
      expect(result[1].bins.score).to.equal(1)
      expect(result[2].bins).to.eql({})
    })

    it('resolves a wrong-typed (list/map) bin value to NIL', function () {
      const reduce = new TopKReduce('score', orderByType.INTEGER, order.DESC, orderByFlags.NONE, 5)
      reduce.acceptPartial(rec(1, { score: 5 }))
      reduce.acceptPartial(rec(2, { score: [1, 2, 3] })) // list -> NIL for INTEGER
      reduce.acceptPartial(rec(3, { score: { a: 1 } })) // map -> NIL for INTEGER

      const result = reduce.getResult()
      expect(result).to.have.lengthOf(3)
      expect(result[0].bins.score).to.equal(5)
    })

    it('both-NIL ties are broken by digest ascending', function () {
      const reduce = new TopKReduce('score', orderByType.INTEGER, order.DESC, orderByFlags.NONE, 5)
      reduce.acceptPartial(rec(9, {}))
      reduce.acceptPartial(rec(1, {}))
      reduce.acceptPartial(rec(5, {}))

      const digests = reduce.getResult().map((r: any) => r.key.digest[0])
      expect(digests).to.eql([1, 5, 9])
    })
  })

  describe('digest dedup', function () {
    it('keeps the better-ranked occurrence of a re-seen digest', function () {
      const reduce = new TopKReduce('score', orderByType.INTEGER, order.DESC, orderByFlags.NONE, 5)
      const digest = Buffer.alloc(20)
      digest[0] = 42

      reduce.acceptPartial({ bins: { score: 3 }, key: { digest } })
      reduce.acceptPartial({ bins: { score: 9 }, key: { digest } }) // same digest, better rank
      reduce.acceptPartial({ bins: { score: 1 }, key: { digest } }) // same digest, worse rank -> discarded

      const result = reduce.getResult()
      expect(result).to.have.lengthOf(1)
      expect(result[0].bins.score).to.equal(9)
    })
  })

  describe('bounded size k', function () {
    it('evicts the single worst entry once k is exceeded', function () {
      const reduce = new TopKReduce('score', orderByType.INTEGER, order.DESC, orderByFlags.NONE, 2)
      ;[1, 2, 3, 4, 5].forEach((v, i) => reduce.acceptPartial(rec(i, { score: v })))

      const result = reduce.getResult().map((r: any) => r.bins.score)
      expect(result).to.eql([5, 4])
    })
  })

  describe('STRING type', function () {
    it('compares case-sensitively by default', function () {
      const reduce = new TopKReduce('name', orderByType.STRING, order.ASC, orderByFlags.NONE, 3)
      ;['banana', 'Apple', 'cherry'].forEach((v, i) => reduce.acceptPartial(rec(i, { name: v })))

      const result = reduce.getResult().map((r: any) => r.bins.name)
      // 'Apple' (uppercase 'A') sorts before lowercase letters in byte order.
      expect(result).to.eql(['Apple', 'banana', 'cherry'])
    })

    it('compares case-insensitively when CASE_INSENSITIVE is set', function () {
      const reduce = new TopKReduce('name', orderByType.STRING, order.ASC, orderByFlags.CASE_INSENSITIVE, 3)
      ;['banana', 'Apple', 'cherry'].forEach((v, i) => reduce.acceptPartial(rec(i, { name: v })))

      const result = reduce.getResult().map((r: any) => r.bins.name)
      expect(result).to.eql(['Apple', 'banana', 'cherry'])
    })
  })

  describe('BYTES type', function () {
    it('compares lexicographically', function () {
      const reduce = new TopKReduce('blob', orderByType.BYTES, order.ASC, orderByFlags.NONE, 3)
      reduce.acceptPartial(rec(1, { blob: Buffer.from([3, 0]) }))
      reduce.acceptPartial(rec(2, { blob: Buffer.from([1, 0]) }))
      reduce.acceptPartial(rec(3, { blob: Buffer.from([2, 0]) }))

      const result = reduce.getResult().map((r: any) => r.bins.blob[0])
      expect(result).to.eql([1, 2, 3])
    })
  })

  describe('tie-breaking', function () {
    it('breaks exact-value ties by digest ascending', function () {
      const reduce = new TopKReduce('score', orderByType.INTEGER, order.DESC, orderByFlags.NONE, 5)
      reduce.acceptPartial(rec(9, { score: 5 }))
      reduce.acceptPartial(rec(1, { score: 5 }))
      reduce.acceptPartial(rec(5, { score: 5 }))

      const digests = reduce.getResult().map((r: any) => r.key.digest[0])
      expect(digests).to.eql([1, 5, 9])
    })
  })
})
