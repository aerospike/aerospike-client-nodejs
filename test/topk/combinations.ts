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
import type { OrderKey, ModelRecord } from './helpers.ts';
import {
  loadModel, removeLoadedSets, indexBin, topK, digests, referenceTopK, orderBy, describeKeys,
  partitionOf, seededRandom, pick, randomValue, skipUnlessTopKQueriesRun
} from './helpers.ts';

const { INTEGER, DOUBLE, STRING, BYTES } = Aerospike.orderByType
const { ASC, DESC } = Aerospike.order
const { DEFAULT, CASE_INSENSITIVE } = Aerospike.orderByFlags
const { exp, filter } = Aerospike

// Every setting one order key can have: 4 types x 2 directions, plus case-insensitive strings.
function everyKey (bin: string): OrderKey[] {
  const keys: OrderKey[] = []
  for (const type of [INTEGER, DOUBLE, STRING, BYTES]) {
    for (const direction of [ASC, DESC]) {
      keys.push({ bin, type, direction, flags: DEFAULT })
      if (type === STRING) keys.push({ bin, type, direction, flags: CASE_INSENSITIVE })
    }
  }
  return keys
}

const hexDigests = (records: ModelRecord[]) => records.map(record => record.digest.toString('hex'))
const randomInt = (random: () => number, max: number) => Math.floor(random() * max)

describe('Top-K combinations against the reference order', function () {
  helper.skipUnlessVersion('>= 8.2.1', this)
  skipUnlessTopKQueriesRun(this)
  afterEach(removeLoadedSets)
  this.timeout(300000)

  it('every first and second key setting at every k, over mixed data', async function () {
    // 60 records whose a and b bins hold any type, or nothing.
    const random = seededRandom(1)
    const { set, model } = await loadModel(Array.from({ length: 60 }, () => ({ a: randomValue(random), b: randomValue(random) })))

    for (const first of everyKey('a')) {
      for (const second of [null, ...everyKey('b')]) {
        const keys = second ? [first, second] : [first]
        for (const k of [1, 7, 60, 100]) {
          const actual = await topK(set, orderBy(keys), k)
          expect(digests(actual), `${describeKeys(keys)}, k = ${k}`).to.eql(hexDigests(referenceTopK(model, keys, k)))
        }
      }
    }
  })

  it('random data, keys, k and query path', async function () {
    for (let seed = 1; seed <= 40; seed++) {
      const random = seededRandom(seed)
      const count = randomInt(random, 80)
      const { set, model } = await loadModel(Array.from({ length: count }, () => ({
        a: randomValue(random),
        b: randomValue(random),
        f: { type: INTEGER, value: randomInt(random, 10) }
      })))

      const keys = [pick(random, everyKey('a'))]
      if (random() < 0.5) keys.push(pick(random, everyKey('b')))
      const k = pick(random, [1, Math.max(1, randomInt(random, count)), count + 5, 1000])
      const f = randomInt(random, 10)
      const path = pick(random, ['plain', 'filter expression', 'index filter', 'partitions', 'select'] as const)

      // Each path, and the records the reference keeps for it.
      let policy: object | null = null
      let kept = model
      const fOf = (record: ModelRecord) => record.bins.f!.value as number
      if (path === 'filter expression') {
        policy = { filterExpression: exp.ge(exp.binInt('f'), exp.int(f)) }
        kept = model.filter(record => fOf(record) >= f)
      } else if (path === 'index filter') {
        await indexBin(set, 'f', Aerospike.indexDataType.INTEGER)
        kept = model.filter(record => fOf(record) === f)
      } else if (path === 'partitions') {
        kept = model.filter(record => partitionOf(record.digest) < 2048)
      }

      const actual = await topK(set, q => {
        if (path === 'index filter') q.where(filter.equal('f', f))
        if (path === 'partitions') q.partitions(0, 2048)
        if (path === 'select') q.select('a', 'b', 'f')
        orderBy(keys)(q)
      }, k, policy)

      const label = `seed ${seed}: ${count} records, ${path} (f = ${f}), ${describeKeys(keys)}, k = ${k}`
      expect(digests(actual), label).to.eql(hexDigests(referenceTopK(kept, keys, k)))
      await removeLoadedSets()
    }
  })

  it('random keys computed by read expressions: the similarity-search pattern', async function () {
    // c = 2f - g and d = |f - g|, computed by the server and checked against the same arithmetic here.
    const c = exp.sub(exp.mul(exp.binInt('f'), exp.int(2)), exp.binInt('g'))
    const d = exp.abs(exp.sub(exp.binInt('f'), exp.binInt('g')))

    for (let seed = 1; seed <= 30; seed++) {
      const random = seededRandom(1000 + seed)
      const count = 1 + randomInt(random, 60)
      const rows = Array.from({ length: count }, () => ({ f: randomInt(random, 11) - 5, g: randomInt(random, 11) - 5 }))
      const { set, model } = await loadModel(rows.map(({ f, g }) => ({
        f: { type: INTEGER, value: f },
        g: { type: INTEGER, value: g }
      })))
      // The reference sees the computed values as the bins c and d.
      const computed = model.map((record, i) => ({
        digest: record.digest,
        bins: {
          c: { type: INTEGER, value: 2 * rows[i].f - rows[i].g },
          d: { type: INTEGER, value: Math.abs(rows[i].f - rows[i].g) }
        }
      }))

      const keys: OrderKey[] = [{ bin: 'c', type: INTEGER, direction: pick(random, [ASC, DESC]), flags: DEFAULT }]
      if (random() < 0.5) keys.push({ bin: 'd', type: INTEGER, direction: pick(random, [ASC, DESC]), flags: DEFAULT })
      const k = pick(random, [1, 1 + randomInt(random, count), count + 5])

      const actual = await topK(set, q => {
        q.ops = [exp.operations.read('c', c, 0), exp.operations.read('d', d, 0)]
        orderBy(keys)(q)
      }, k)

      const label = `seed ${seed}: ${count} records, ${describeKeys(keys)}, k = ${k}`
      expect(digests(actual), label).to.eql(hexDigests(referenceTopK(computed, keys, k)))
      await removeLoadedSets()
    }
  })

  it('random computed keys of every other type: DOUBLE, STRING and BYTES', async function () {
    // Computed by the server, and by the same rules here: d / 2.0, upper(s) and toBlob(s).
    const ops = [
      exp.operations.read('half', exp.div(exp.binFloat('d'), exp.float(2)), 0),
      exp.operations.read('loud', exp.string.upper(null, exp.binStr('s')), 0),
      exp.operations.read('blob', exp.string.toBlob(exp.binStr('s')), 0)
    ]
    const computedKeys: OrderKey[] = []
    for (const [bin, type] of [['half', DOUBLE], ['loud', STRING], ['blob', BYTES]] as const) {
      for (const direction of [ASC, DESC]) computedKeys.push({ bin, type, direction, flags: DEFAULT })
    }

    for (let seed = 1; seed <= 30; seed++) {
      const random = seededRandom(2000 + seed)
      const count = 1 + randomInt(random, 60)
      const rows = Array.from({ length: count }, () => ({
        d: pick(random, [-1.5, -0.5, 0, 0.5, 1.5, 2.5]),
        s: pick(random, ['', 'a', 'ab', 'b', 'B', 'Ab'])
      }))
      const { set, model } = await loadModel(rows.map(({ d, s }) => ({
        d: { type: DOUBLE, value: d },
        s: { type: STRING, value: s }
      })))
      const computed = model.map((record, i) => ({
        digest: record.digest,
        bins: {
          half: { type: DOUBLE, value: rows[i].d / 2 },
          loud: { type: STRING, value: rows[i].s.toUpperCase() },
          blob: { type: BYTES, value: Buffer.from(rows[i].s) }
        }
      }))

      const keys = [pick(random, computedKeys)]
      if (random() < 0.5) keys.push(pick(random, computedKeys.filter(key => key.bin !== keys[0].bin)))
      const k = pick(random, [1, 1 + randomInt(random, count), count + 5])

      const actual = await topK(set, q => {
        q.ops = ops
        orderBy(keys)(q)
      }, k)

      const label = `seed ${seed}: ${count} records, ${describeKeys(keys)}, k = ${k}`
      expect(digests(actual), label).to.eql(hexDigests(referenceTopK(computed, keys, k)))
      await removeLoadedSets()
    }
  })

  it('k = 1,000 over 1,500 records with many ties', async function () {
    const random = seededRandom(2026)
    const { set, model } = await loadModel(Array.from({ length: 1500 }, () => ({
      score: { type: INTEGER, value: randomInt(random, 50) },
      name: { type: STRING, value: pick(random, ['a', 'b', 'c', 'd', 'e']) }
    })))
    const keys: OrderKey[] = [
      { bin: 'score', type: INTEGER, direction: DESC, flags: DEFAULT },
      { bin: 'name', type: STRING, direction: ASC, flags: DEFAULT }
    ]

    const actual = await topK(set, orderBy(keys), 1000)
    expect(actual).to.have.length(1000)
    expect(digests(actual)).to.eql(hexDigests(referenceTopK(model, keys, 1000)))
  })
})
