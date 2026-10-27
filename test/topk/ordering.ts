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
import { loadSet, removeLoadedSets, topK, values, digests, inDigestOrder, skipUnlessTopKQueriesRun } from './helpers.ts';

const { INTEGER, DOUBLE, STRING, BYTES } = Aerospike.orderByType
const { ASC, DESC } = Aerospike.order
const { CASE_INSENSITIVE } = Aerospike.orderByFlags
const { Double } = Aerospike

const hex = (records: any[], bin: string) => values(records, bin).map(value => (value as Buffer).toString('hex'))

// Every topK() call runs results(), foreach() and partitions() and checks they agree.

describe('Top-K ordering', function () {
  helper.skipUnlessVersion('>= 8.2.1', this)
  skipUnlessTopKQueriesRun(this)
  afterEach(removeLoadedSets)

  it('ranks integers in both directions', async function () {
    const set = await loadSet([{ n: -5 }, { n: 0 }, { n: 7 }, { n: 3 }, { n: -100 }, { n: 42 },
      { n: Number.MAX_SAFE_INTEGER }, { n: Number.MIN_SAFE_INTEGER }])

    expect(values(await topK(set, q => q.orderBy('n', INTEGER, DESC), 3), 'n'))
      .to.eql([Number.MAX_SAFE_INTEGER, 42, 7])
    expect(values(await topK(set, q => q.orderBy('n', INTEGER, ASC), 3), 'n'))
      .to.eql([Number.MIN_SAFE_INTEGER, -100, -5])
  })

  it('ranks doubles in both directions, including infinities', async function () {
    const set = await loadSet([-1.5, 0.25, 2.75, 1e300, Infinity, -Infinity].map(d => ({ d: new Double(d) })))

    expect(values(await topK(set, q => q.orderBy('d', DOUBLE, DESC), 3), 'd')).to.eql([Infinity, 1e300, 2.75])
    expect(values(await topK(set, q => q.orderBy('d', DOUBLE, ASC), 3), 'd')).to.eql([-Infinity, -1.5, 0.25])
  })

  it('ranks strings by byte order in both directions', async function () {
    const set = await loadSet(['b', 'a', 'ab', '', 'B', 'abc'].map(s => ({ s })))

    expect(values(await topK(set, q => q.orderBy('s', STRING, ASC), 6), 's')).to.eql(['', 'B', 'a', 'ab', 'abc', 'b'])
    expect(values(await topK(set, q => q.orderBy('s', STRING, DESC), 6), 's')).to.eql(['b', 'abc', 'ab', 'a', 'B', ''])
  })

  it('ranks byte arrays by byte order, then by length', async function () {
    const set = await loadSet([[1], [1, 0], [0, 255], [], [2]].map(b => ({ b: Buffer.from(b) })))

    expect(hex(await topK(set, q => q.orderBy('b', BYTES, ASC), 5), 'b')).to.eql(['', '00ff', '01', '0100', '02'])
    expect(hex(await topK(set, q => q.orderBy('b', BYTES, DESC), 5), 'b')).to.eql(['02', '0100', '01', '00ff', ''])
  })

  it('puts missing and wrong-type keys last in both directions, and counts them toward k', async function () {
    const set = await loadSet([{ score: 1 }, { score: 3 }, { other: 1 }, { score: 'x' }, { score: 2 }])

    for (const [direction, expected] of [[DESC, [3, 2, 1]], [ASC, [1, 2, 3]]] as const) {
      const records = await topK(set, q => q.orderBy('score', INTEGER, direction), 5)
      expect(values(records, 'score').slice(0, 3)).to.eql(expected)
      expect(values(records.slice(3), 'score').sort()).to.eql(['x', undefined])
      expect(inDigestOrder(records.slice(3)), 'the two unranked records tie, so digest order').to.be.true
    }

    const four = await topK(set, q => q.orderBy('score', INTEGER, DESC), 4)
    expect(values(four, 'score').slice(0, 3)).to.eql([3, 2, 1])
    expect(four).to.have.length(4)
  })

  it('breaks ties on the only key by digest, lowest first, with -0.0 equal to 0.0', async function () {
    const ints = await loadSet([{ n: 5 }, { n: 5 }, { n: 5 }, { n: 5 }, { n: 1 }])
    const tied = await topK(ints, q => q.orderBy('n', INTEGER, DESC), 4)
    expect(values(tied, 'n')).to.eql([5, 5, 5, 5])
    expect(inDigestOrder(tied)).to.be.true

    const zeros = await loadSet([{ d: new Double(-0) }, { d: new Double(0) }, { d: new Double(1) }])
    const lowest = await topK(zeros, q => q.orderBy('d', DOUBLE, ASC), 2)
    expect(values(lowest, 'd').map(Math.abs)).to.eql([0, 0])
    expect(inDigestOrder(lowest)).to.be.true
  })

  it('uses the second key only to break ties on the first', async function () {
    const set = await loadSet([{ score: 2, name: 'b' }, { score: 1, name: 'a' }, { score: 2, name: 'a' }, { score: 3, name: 'z' }])
    const records = await topK(set, q => {
      q.orderBy('score', INTEGER, DESC)
      q.thenOrderBy('name', STRING, ASC)
    }, 4)

    expect(records.map(r => `${r.bins.score}${r.bins.name}`)).to.eql(['3z', '2a', '2b', '1a'])
  })

  it("applies each key's own type and direction", async function () {
    // Built so that a swapped, dropped or ignored setting gives a different order.
    const rows = ['1d', '1b', '1a', '1c', '2c', '2a', '2d', '2b']
    const set = await loadSet(rows.map(row => ({ score: Number(row[0]), name: row[1] })))
    const records = await topK(set, q => {
      q.orderBy('score', INTEGER, DESC)
      q.thenOrderBy('name', STRING, ASC)
    }, 8)

    expect(records.map(r => `${r.bins.score}${r.bins.name}`)).to.eql(['2a', '2b', '2c', '2d', '1a', '1b', '1c', '1d'])
  })

  it('compares strings without case only when asked', async function () {
    const set = await loadSet(['banana', 'Apple', 'cherry', 'apple', 'Banana'].map(name => ({ name })))

    const byBytes = await topK(set, q => q.orderBy('name', STRING, ASC), 5)
    expect(values(byBytes, 'name')).to.eql(['Apple', 'Banana', 'apple', 'banana', 'cherry'])

    const ignoringCase = await topK(set, q => q.orderBy('name', STRING, ASC, CASE_INSENSITIVE), 5)
    expect(values(ignoringCase, 'name').map(name => (name as string).toLowerCase()))
      .to.eql(['apple', 'apple', 'banana', 'banana', 'cherry'])
    expect(inDigestOrder(ignoringCase.slice(0, 2)), 'Apple and apple tie').to.be.true
    expect(inDigestOrder(ignoringCase.slice(2, 4)), 'banana and Banana tie').to.be.true
  })

  it('when k cuts through tied records, the lowest digests make the cut', async function () {
    const set = await loadSet([{ n: 9 }, ...Array.from({ length: 10 }, () => ({ n: 7 }))])
    const byN = (q: any) => q.orderBy('n', INTEGER, DESC)

    const all = await topK(set, byN, 11)
    expect(values(all, 'n')).to.eql([9, ...Array(10).fill(7)])
    expect(inDigestOrder(all.slice(1)), 'the ten 7s tie, so digest order').to.be.true

    const cut = await topK(set, byN, 4)
    expect(digests(cut)).to.eql(digests(all.slice(0, 4)))
  })

  it('second key: either direction, any type, missing values, and ties on both keys', async function () {
    const thenBy = (bin: string, type: number, direction: number) => (q: any) => {
      q.orderBy('score', INTEGER, DESC)
      q.thenOrderBy(bin, type, direction)
    }

    const doubles = await loadSet([0.5, 2.5, 1.5].map(d => ({ score: 1, d: new Double(d) })))
    expect(values(await topK(doubles, thenBy('d', DOUBLE, DESC), 3), 'd')).to.eql([2.5, 1.5, 0.5])

    const bytes = await loadSet([[2], [1, 0], [1]].map(b => ({ score: 1, b: Buffer.from(b) })))
    expect(hex(await topK(bytes, thenBy('b', BYTES, ASC), 3), 'b')).to.eql(['01', '0100', '02'])

    const missing = await loadSet([{ score: 1, name: 'b' }, { score: 1 }, { score: 1, name: 'a' }])
    expect(values(await topK(missing, thenBy('name', STRING, ASC), 3), 'name')).to.eql(['a', 'b', undefined])

    const sameOnBoth = await loadSet([1, 2, 3].map(() => ({ score: 1, name: 'a' })))
    expect(inDigestOrder(await topK(sameOnBoth, thenBy('name', STRING, ASC), 3))).to.be.true
  })

  it('handles an empty set, a set without the key, and values of the other number type', async function () {
    const empty = await loadSet([])
    expect(await topK(empty, q => q.orderBy('n', INTEGER, DESC), 5)).to.eql([])

    const keyless = await loadSet([1, 2, 3, 4].map(other => ({ other })))
    const allFour = await topK(keyless, q => q.orderBy('n', INTEGER, DESC), 4)
    expect(allFour).to.have.length(4)
    expect(inDigestOrder(allFour), 'no record has the key, so all tie').to.be.true
    expect(digests(await topK(keyless, q => q.orderBy('n', INTEGER, DESC), 2))).to.eql(digests(allFour.slice(0, 2)))

    const mixed = await loadSet([{ n: 3 }, { n: new Double(2.5) }, { n: 1 }])
    expect(values(await topK(mixed, q => q.orderBy('n', INTEGER, DESC), 3), 'n')).to.eql([3, 1, 2.5])
    const asDoubles = await topK(mixed, q => q.orderBy('n', DOUBLE, DESC), 3)
    expect(values(asDoubles, 'n')[0]).to.equal(2.5)
    expect(inDigestOrder(asDoubles.slice(1)), 'the integers are the wrong type, so they tie last').to.be.true
  })

  it('ranks values at the edges of each type: int64, non-ASCII, long strings and bytes', async function () {
    const ints = await loadSet([2n ** 63n - 1n, -(2n ** 63n), 2n ** 53n + 1n, 2n ** 53n, 0].map(n => ({ n })))
    expect(values(await topK(ints, q => q.orderBy('n', INTEGER, DESC), 5), 'n').map(String))
      .to.eql(['9223372036854775807', '9007199254740993', '9007199254740992', '0', '-9223372036854775808'])

    // Byte order of the UTF-8: 'z' is 7a, 'é' is c3 a9, 'ü' is c3 bc.
    const longA = 'a'.repeat(1000)
    const strings = await loadSet(['ü', longA + 'b', 'z', 'é', longA + 'a'].map(s => ({ s })))
    expect(values(await topK(strings, q => q.orderBy('s', STRING, ASC), 5), 's'))
      .to.eql([longA + 'a', longA + 'b', 'z', 'é', 'ü'])

    const longBytes = Buffer.alloc(1000, 7)
    const longBytesLastHigher = Buffer.concat([Buffer.alloc(999, 7), Buffer.from([8])])
    const bytes = await loadSet([[0xff], [0x00, 0xff], [0x00], [], longBytesLastHigher, longBytes].map(b => ({ b: Buffer.from(b) })))
    const ranked = values(await topK(bytes, q => q.orderBy('b', BYTES, ASC), 6), 'b') as Buffer[]
    expect(ranked.map(b => b.equals(longBytes) ? 'long' : b.equals(longBytesLastHigher) ? 'long, last byte higher' : b.toString('hex')))
      .to.eql(['', '00', '00ff', 'long', 'long, last byte higher', 'ff'])
  })

  it('orders by bins whose names are exactly 15 bytes', async function () {
    const ascii = 'a'.repeat(15)
    const utf8 = 'é'.repeat(7) + 'a' // 14 bytes of 'é' plus one
    const set = await loadSet([[2, 'x'], [1, 'y'], [2, 'w']].map(([n, s]) => ({ [ascii]: n, [utf8]: s })))
    const records = await topK(set, q => {
      q.orderBy(ascii, INTEGER, DESC)
      q.thenOrderBy(utf8, STRING, ASC)
    }, 3)

    expect(records.map(r => `${r.bins[ascii]}${r.bins[utf8]}`)).to.eql(['2w', '2x', '1y'])
  })

  it('returns at most k records', async function () {
    const set = await loadSet([1, 2, 3, 4, 5].map(n => ({ n })))
    const ranked = async (k: number) => values(await topK(set, q => q.orderBy('n', INTEGER, DESC), k), 'n')

    expect(await ranked(1)).to.eql([5])
    expect(await ranked(3)).to.eql([5, 4, 3])
    expect(await ranked(5)).to.eql([5, 4, 3, 2, 1])
    expect(await ranked(10)).to.eql([5, 4, 3, 2, 1])
  })

  it('returns complete records', async function () {
    const set = await loadSet([3, 1, 4, 1, 5, 9, 2, 6].map(n => ({ n, label: `n${n}` })))
    const records = await topK(set, q => q.orderBy('n', INTEGER, DESC), 5)

    expect(values(records, 'n')).to.eql([9, 6, 5, 4, 3])
    for (const record of records) {
      expect(record.bins.label).to.equal(`n${record.bins.n}`)
      expect(record.key.digest).to.have.length(20)
      expect(record.gen).to.be.a('number')
    }
  })
})
