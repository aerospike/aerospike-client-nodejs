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

import { expect } from 'chai';
import * as Aerospike from '../../lib/aerospike.js';
import * as helper from '../test_helper.ts';

const { FLOAT16, INT32, FLOAT32, FLOAT64 } = Aerospike.vectorElementType
const { EUCLIDEAN_SQUARED, DOT_PRODUCT, COSINE_SIMILARITY } = Aerospike.vectorDistanceMetric
const { AerospikeError, status, exp } = Aerospike

// Shared plumbing for the vector tests, so the test files stay short.

// Each element type with its builder, typed array, element size in bytes and
// the most dimensions a vector of that type can hold (256 KiB of elements).
export const ELEMENT_TYPES = [
  { name: 'FLOAT16', type: FLOAT16, build: Aerospike.Vector.ofFloat16, array: Uint16Array, size: 2, maxDimensions: 131072 },
  { name: 'INT32', type: INT32, build: Aerospike.Vector.ofInt32, array: Int32Array, size: 4, maxDimensions: 65536 },
  { name: 'FLOAT32', type: FLOAT32, build: Aerospike.Vector.ofFloat32, array: Float32Array, size: 4, maxDimensions: 65536 },
  { name: 'FLOAT64', type: FLOAT64, build: Aerospike.Vector.ofFloat64, array: Float64Array, size: 8, maxDimensions: 32768 }
]

// The serialized vector header: format version 1, the element type, and the
// dimension count (32-bit little-endian).
export const HEADER_SIZE = 6

export function header (elementType: number, dimensions: number, version = 1): Buffer {
  const bytes = Buffer.alloc(HEADER_SIZE)
  bytes[0] = version
  bytes[1] = elementType
  bytes.writeUInt32LE(dimensions, 2)
  return bytes
}

// Runs fn and returns what it threw, or null.
export function errorFrom (fn: () => unknown): any {
  try {
    fn()
    return null
  } catch (error) {
    return error
  }
}

// Checks that fn throws an AerospikeError with ERR_PARAM and the given message.
export function expectParamError (fn: () => unknown, message: string, label = '') {
  const error = errorFrom(fn)
  expect(error, `${label} expected an error`).to.be.instanceof(AerospikeError)
  expect(error.code, label).to.equal(status.ERR_PARAM)
  expect(error.message, label).to.equal(message)
}

// Checks that fn throws a TypeError with the given message.
export function expectTypeError (fn: () => unknown, message: string, label = '') {
  const error = errorFrom(fn)
  expect(error, `${label} expected an error`).to.be.instanceof(TypeError)
  expect(error.message, label).to.equal(message)
}

// A seeded random number generator (mulberry32), so failures can be replayed.
export function seededRandom (seed: number) {
  return function () {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// The value of a half-precision float from its raw bits.
export function float16Value (bits: number): number {
  const sign = bits & 0x8000 ? -1 : 1
  const exponent = (bits >> 10) & 0x1f
  const fraction = bits & 0x3ff
  if (exponent === 0x1f) return fraction ? NaN : sign * Infinity
  if (exponent === 0) return sign * fraction * 2 ** -24
  return sign * (1 + fraction / 1024) * 2 ** (exponent - 15)
}

// The raw bits of the half-precision float nearest to value (no overflow handling:
// callers keep values within +-65504).
export function float16Bits (value: number): number {
  const sign = value < 0 || Object.is(value, -0) ? 0x8000 : 0
  const magnitude = Math.abs(value)
  if (magnitude < 2 ** -14) return sign | Math.round(magnitude / 2 ** -24)
  let exponent = Math.floor(Math.log2(magnitude))
  let fraction = Math.round((magnitude / 2 ** exponent - 1) * 1024)
  if (fraction === 1024) { fraction = 0; exponent++ }
  return sign | ((exponent + 15) << 10) | fraction
}

// A vector of the given type and its element values as JS numbers. values()
// gives each wanted value; FLOAT16 and FLOAT32 round it, INT32 truncates it.
export function makeVector (elementType: number, dimensions: number, value: (i: number) => number) {
  const wanted = Array.from({ length: dimensions }, (_, i) => value(i))
  switch (elementType) {
    case FLOAT16: {
      const bits = wanted.map(float16Bits)
      return { vector: Aerospike.Vector.ofFloat16(bits), values: bits.map(float16Value) }
    }
    case INT32: {
      const ints = wanted.map(Math.trunc)
      return { vector: Aerospike.Vector.ofInt32(ints), values: ints }
    }
    case FLOAT32: {
      const floats = wanted.map(Math.fround)
      return { vector: Aerospike.Vector.ofFloat32(floats), values: floats }
    }
    default:
      return { vector: Aerospike.Vector.ofFloat64(wanted), values: wanted }
  }
}

// The distance computed in double precision, with the sum of the absolute values
// of its terms, which bounds the rounding error of any summation order.
export function referenceDistance (metric: number, stored: number[], query: number[]) {
  let dot = 0, absDot = 0, l2 = 0, normS = 0, normQ = 0
  for (let i = 0; i < stored.length; i++) {
    dot += stored[i] * query[i]
    absDot += Math.abs(stored[i] * query[i])
    l2 += (stored[i] - query[i]) ** 2
    normS += stored[i] ** 2
    normQ += query[i] ** 2
  }
  switch (metric) {
    case DOT_PRODUCT: return { value: dot, scale: absDot }
    case EUCLIDEAN_SQUARED: return { value: l2, scale: l2 }
    default: {
      const norms = Math.sqrt(normS * normQ)
      // Cosine also carries the rounding of both norms.
      return norms === 0 ? { value: 0, scale: 0 } : { value: dot / norms, scale: absDot / norms + 2 }
    }
  }
}

// The unit roundoff of the server's sums: 32-bit floats for FLOAT16, INT32 and
// FLOAT32 vectors unless the server is set to double precision; doubles for FLOAT64.
export function roundoff (elementType: number, precision: string) {
  return elementType === FLOAT64 || precision === 'double' ? 2 ** -53 : 2 ** -24
}

// Checks a distance against the reference within (2 * sqrt(n) + 4) * roundoff * scale:
// the usual bound for summing rounding errors that don't all lean one way, plus the
// few roundings inside each term (a difference, a product, a norm). Measured server
// errors stay below 0.6 of it.
export function expectNear (actual: number, reference: { value: number, scale: number }, dimensions: number, unit: number, label = '') {
  const tolerance = toleranceOf(reference, dimensions, unit)
  const error = Math.abs(actual - reference.value)
  expect(error <= tolerance, `${label}: got ${actual}, expected ${reference.value} +- ${tolerance}`).to.be.true
}

// The server's vector-distance-precision setting: 'float' (the default) or 'double'.
export async function distancePrecision (): Promise<string> {
  const info = await helper.client.infoAny('get-config:context=service')
  const match = /vector-distance-precision=(\w+)/.exec(info)
  return match ? match[1] : 'float'
}

// Each call writes the values into a new set (keys 0, 1, 2, ...) in bin v, with
// any other bins given, and returns the set name; an undefined value leaves bin v
// out. removeLoadedSets() deletes them.
const loaded: Array<{ set: string, count: number }> = []
let setCount = 0

export async function loadVectors (vectors: unknown[], bins: Array<Record<string, unknown>> = []): Promise<string> {
  const set = `vector_${process.pid}_${++setCount}`
  // A generous timeout: in big loads, garbage collection can pause the client.
  const policy = { socketTimeout: 30000, totalTimeout: 30000 }
  await inBatches(vectors.length, i => helper.client.put(new Aerospike.Key(helper.namespace, set, i),
    { ...(vectors[i] === undefined ? {} : { v: vectors[i] }), ...bins[i] } as any, null, policy as any))
  loaded.push({ set, count: vectors.length })
  return set
}

// Marks keys 0 to count - 1 of a loaded set for removeLoadedSets(), for tests that
// write more records into it.
export function removeLater (set: string, count: number) {
  const entry = loaded.find(e => e.set === set)!
  entry.count = Math.max(entry.count, count)
}

export async function removeLoadedSets () {
  const policy = { socketTimeout: 30000, totalTimeout: 30000 }
  const removeIfThere = (key: Aerospike.Key) => helper.client.remove(key, policy as any).catch(error => {
    if (error.code !== status.ERR_RECORD_NOT_FOUND) throw error
  })
  for (const { set, count } of loaded.splice(0)) {
    await inBatches(count, i => removeIfThere(new Aerospike.Key(helper.namespace, set, i)))
  }
}

// Runs task(0) to task(count - 1), 50 at a time.
async function inBatches (count: number, task: (i: number) => Promise<unknown>) {
  for (let start = 0; start < count; start += 50) {
    const batch = []
    for (let i = start; i < Math.min(count, start + 50); i++) batch.push(task(i))
    await Promise.all(batch)
  }
}

// The distance from query to the vector in bin v of record i of set, read with
// a read expression.
export async function distanceOf (set: string, i: number, metric: number, query: Aerospike.Vector): Promise<number> {
  const distance = exp.vectorDistance(metric, query, exp.binVector('v'))
  const record = await helper.client.operate(new Aerospike.Key(helper.namespace, set, i), [exp.operations.read('d', distance, 0)])
  return record.bins.d as number
}

export const METRICS = [
  { name: 'DOT_PRODUCT', metric: DOT_PRODUCT },
  { name: 'EUCLIDEAN_SQUARED', metric: EUCLIDEAN_SQUARED },
  { name: 'COSINE_SIMILARITY', metric: COSINE_SIMILARITY }
]

// The rounding tolerance of one reference distance (see expectNear).
export function toleranceOf (reference: { scale: number }, dimensions: number, unit: number) {
  return (2 * Math.sqrt(dimensions) + 4) * unit * reference.scale
}

// Checks that records (each with bins id and d, the server's distance) are the
// best k by the reference, best first. A null reference marks a record that must
// not be returned (unknown distance, or filtered out). ascending says which way is
// best. Records whose distances are within rounding of each other may swap places.
export function expectBestK (records: Aerospike.AerospikeRecord[], references: Array<{ value: number, scale: number } | null>,
  k: number, ascending: boolean, dimensions: number, unit: number) {
  const better = (a: number, b: number) => (ascending ? a - b : b - a)
  const best = references.flatMap((reference, id) => (reference ? [{ id, reference }] : []))
    .sort((a, b) => better(a.reference.value, b.reference.value))
  const ids = records.map(record => record.bins.id as number)
  const tolerance = (id: number) => toleranceOf(references[id]!, dimensions, unit)

  expect(ids.length, 'number of records').to.equal(Math.min(k, best.length))
  expect(new Set(ids).size, 'a record was returned twice').to.equal(ids.length)
  for (let j = 0; j < ids.length; j++) {
    const id = ids[j]
    const reference = references[id]
    expect(reference, `record ${id} should not be returned`).to.not.equal(null)
    const distance = records[j].bins.d as number
    expect(Math.abs(distance - reference!.value) <= tolerance(id), `record ${id}: distance ${distance}, reference ${reference!.value}`).to.be.true
    if (j > 0) {
      expect(better(records[j - 1].bins.d as number, distance) <= 0, `position ${j} is out of order`).to.be.true
    }
    const wanted = best[j]
    expect(Math.abs(reference!.value - wanted.reference.value) <= tolerance(id) + tolerance(wanted.id),
      `position ${j}: record ${id} (${reference!.value}) instead of record ${wanted.id} (${wanted.reference.value})`).to.be.true
  }
}
