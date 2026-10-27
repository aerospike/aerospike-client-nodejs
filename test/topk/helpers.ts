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

import type { Query as Q, AerospikeRecord } from '../../lib/aerospike.js';
import type { Suite } from 'mocha';

import { expect } from 'chai';
import * as Aerospike from '../../lib/aerospike.js';
import * as helper from '../test_helper.ts';

const { INTEGER, DOUBLE, STRING, BYTES } = Aerospike.orderByType
const { DESC } = Aerospike.order
const { CASE_INSENSITIVE } = Aerospike.orderByFlags

// Shared plumbing for the Top-K tests, so the test files stay short.

// A query on the shared test namespace and set.
export function newQuery (): Q {
  return helper.client.query(helper.namespace, helper.set)
}

// Runs fn and returns what it threw or rejected with, or null.
export async function errorFrom (fn: () => unknown): Promise<any> {
  try {
    await fn()
    return null
  } catch (error) {
    return error
  }
}

// Runs a query with foreach() and returns its stream error, or null.
export function streamErrorFrom (query: Q): Promise<any> {
  return new Promise(resolve => {
    const stream = query.foreach()
    stream.on('error', resolve)
    stream.on('end', () => resolve(null))
  })
}

// The C client rejects Top-K on asynchronous queries, which is how foreach()
// and results() run. Until that changes, tests that need a Top-K query to run
// are skipped with this reason.
const ASYNC_REJECTION = 'order_by/top_k is not supported on asynchronous queries'

async function topKQueriesRun (): Promise<boolean> {
  const query = newQuery()
  query.orderBy('a', INTEGER, DESC)
  query.topK(1)
  const error = await errorFrom(() => query.results())
  return !(error && error.message === ASYNC_REJECTION)
}

export function skipUnlessTopKQueriesRun (ctx: Suite) {
  ctx.beforeAll(async function () {
    if (!await topKQueriesRun()) {
      this.skip()
    }
  })
}

// Each call writes the records into a new set (keys 0, 1, 2, ...) and returns
// the set name; removeLoadedSets() deletes them, and any indexes made with indexBin().
type Bins = Record<string, unknown>
const loaded: Array<{ set: string, count: number }> = []
const indexes: string[] = []
let setCount = 0

export async function loadSet (records: Bins[]): Promise<string> {
  const set = `topk_${process.pid}_${++setCount}`
  await inBatches(records.length, i => helper.client.put(new Aerospike.Key(helper.namespace, set, i), records[i]))
  loaded.push({ set, count: records.length })
  return set
}

// Runs task(0) to task(count - 1), 50 at a time: well under the client's
// default limit of 100 async connections per node.
async function inBatches (count: number, task: (i: number) => Promise<unknown>) {
  for (let start = 0; start < count; start += 50) {
    const batch = []
    for (let i = start; i < Math.min(count, start + 50); i++) batch.push(task(i))
    await Promise.all(batch)
  }
}

// Creates a secondary index on one bin of a loaded set (optionally on a value inside it).
export async function indexBin (set: string, bin: string, dataType: number, context?: any) {
  const index = `${set}_${bin}`
  indexes.push(index)
  await helper.index.create(index, set, bin, dataType as any, Aerospike.indexType.DEFAULT, context)
  return index
}

// Creates a secondary index on an expression over a loaded set.
export async function indexExpression (set: string, name: string, expression: any, dataType: number) {
  const index = `${set}_${name}`
  indexes.push(index)
  await helper.index.createExpIndex(index, set, expression, dataType as any, Aerospike.indexType.DEFAULT)
  return index
}

export async function removeLoadedSets () {
  for (const index of indexes.splice(0)) {
    await helper.index.remove(index)
  }
  for (const { set, count } of loaded.splice(0)) {
    await inBatches(count, i => helper.client.remove(new Aerospike.Key(helper.namespace, set, i)))
  }
}

// Runs a Top-K query three ways and checks they return the same records in the
// same order: results(), foreach(), and results() over all partitions, which
// uses a different C client call. configure adds the order keys; k is the limit;
// policy is an optional query policy, e.g. { filterExpression }.
export async function topK (set: string, configure: (query: Q) => void, k: number,
  policy: object | null = null): Promise<AerospikeRecord[]> {
  const viaResults = await runTopK(set, configure, k, policy, 'results')
  const viaForeach = await runTopK(set, configure, k, policy, 'foreach')
  const viaPartitions = await runTopK(set, configure, k, policy, 'partitions')

  expect(digests(viaForeach), 'foreach() returned a different result than results()').to.eql(digests(viaResults))
  expect(digests(viaPartitions), 'partitions() returned a different result than results()').to.eql(digests(viaResults))
  return viaResults
}

async function runTopK (set: string, configure: (query: Q) => void, k: number,
  policy: object | null, via: 'results' | 'foreach' | 'partitions'): Promise<AerospikeRecord[]> {
  const query = helper.client.query(helper.namespace, set)
  configure(query)
  query.topK(k)
  if (via === 'partitions' && !query.pfEnabled) { // keep a test's own partitions
    query.partitions(0, 4096)
  }
  if (via !== 'foreach') {
    return query.results(policy as any)
  }
  return new Promise((resolve, reject) => {
    const records: AerospikeRecord[] = []
    const stream = query.foreach(policy as any)
    stream.on('data', record => records.push(record))
    stream.on('error', reject)
    stream.on('end', () => resolve(records))
  })
}

// Each record's digest as hex, in order: identifies records in clear diffs.
export function digests (records: AerospikeRecord[]): string[] {
  return records.map(record => (record.key.digest as Buffer).toString('hex'))
}

// The value of one bin in each record, in order.
export function values (records: AerospikeRecord[], bin: string): unknown[] {
  return records.map(record => record.bins[bin])
}

// True if the records are in ascending digest order, the tie-break for equal keys.
export function inDigestOrder (records: AerospikeRecord[]): boolean {
  return records.every((record, i) =>
    i === 0 || Buffer.compare(records[i - 1].key.digest as Buffer, record.key.digest as Buffer) < 0)
}

// Every record in set, read with a plain query (no Top-K).
export function allRecords (set: string): Promise<AerospikeRecord[]> {
  return helper.client.query(helper.namespace, set).results()
}

// The partition a digest belongs to: its first two bytes, little-endian, of 4,096.
export function partitionOf (digest: Buffer): number {
  return digest.readUInt16LE(0) & 4095
}

export function partitionId (record: AerospikeRecord): number {
  return partitionOf(record.key.digest as Buffer)
}

// ---------------------------------------------------------------------------
// The reference: the spec's ranking rules, written independently of the C
// client, applied to the data as written (so it knows each value's real type).
// ---------------------------------------------------------------------------

export interface Typed { type: number, value: number | string | Buffer }
export interface OrderKey { bin: string, type: number, direction: number, flags: number }
export interface ModelRecord { digest: Buffer, bins: Record<string, Typed | undefined> }

// The first k records in the order the spec defines.
export function referenceTopK (records: ModelRecord[], keys: OrderKey[], k: number): ModelRecord[] {
  return [...records].sort((a, b) => compareRecords(a, b, keys)).slice(0, k)
}

function compareRecords (a: ModelRecord, b: ModelRecord, keys: OrderKey[]): number {
  for (const key of keys) {
    const result = compareKey(a.bins[key.bin], b.bins[key.bin], key)
    if (result !== 0) return result
  }
  return Buffer.compare(a.digest, b.digest) // full tie: lowest digest first
}

// A missing or wrong-type value ranks last in both directions; two of them tie.
function compareKey (a: Typed | undefined, b: Typed | undefined, key: OrderKey): number {
  const aRanked = a?.type === key.type
  const bRanked = b?.type === key.type
  if (!aRanked || !bRanked) {
    return aRanked === bRanked ? 0 : (aRanked ? -1 : 1)
  }
  const result = compareValues(a!.value, b!.value, key)
  return key.direction === DESC ? -result : result
}

function compareValues (a: any, b: any, key: OrderKey): number {
  switch (key.type) {
    case INTEGER:
    case DOUBLE:
      return a < b ? -1 : a > b ? 1 : 0 // -0 equals 0
    case STRING: {
      const fold = (s: string) => (key.flags & CASE_INSENSITIVE) ? asciiLower(s) : s
      return Buffer.compare(Buffer.from(fold(a)), Buffer.from(fold(b)))
    }
    default: // BYTES: byte order, then length
      return Buffer.compare(a, b)
  }
}

function asciiLower (s: string): string {
  return s.replace(/[A-Z]/g, c => c.toLowerCase())
}

// ---------------------------------------------------------------------------
// Generated data: small value pools so ties, missing and wrong-type values are common.
// ---------------------------------------------------------------------------

// A seeded random number generator (mulberry32): the same seed gives the same data.
export function seededRandom (seed: number): () => number {
  return () => {
    seed = (seed + 0x6D2B79F5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const pick = <T>(random: () => number, items: readonly T[]): T => items[Math.floor(random() * items.length)]

// Includes extremes and long shared prefixes, so the comparator's edges meet every combination.
const POOLS: Record<number, ReadonlyArray<number | string | Buffer>> = {
  [INTEGER]: [-3, -1, 0, 1, 2, 3, Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER],
  [DOUBLE]: [-1.5, -0.5, 0, 0.5, 1.5, Infinity, -Infinity],
  [STRING]: ['', 'a', 'A', 'ab', 'B', 'b', 'aaaaaaaaa', 'aaaaaaaaab'],
  [BYTES]: [[], [0], [1], [1, 0], [2], [1, 1, 1, 1], [1, 1, 1, 1, 0]].map(bytes => Buffer.from(bytes))
}

// A random typed value, or undefined (a missing bin) about one time in six.
export function randomValue (random: () => number): Typed | undefined {
  const type = pick(random, [INTEGER, DOUBLE, STRING, BYTES, 0])
  return type === 0 ? undefined : { type, value: pick(random, POOLS[type]) }
}

// Writes typed records into a new set and returns the set and the records with their digests.
export async function loadModel (records: Array<Record<string, Typed | undefined>>):
  Promise<{ set: string, model: ModelRecord[] }> {
  const set = await loadSet(records.map((bins, id) => ({ id, ...toStored(bins) })))
  const digestById = new Map((await allRecords(set)).map(r => [r.bins.id, r.key.digest as Buffer]))
  return { set, model: records.map((bins, id) => ({ bins, digest: digestById.get(id)! })) }
}

function toStored (bins: Record<string, Typed | undefined>): Record<string, unknown> {
  const stored: Record<string, unknown> = {}
  for (const [bin, typed] of Object.entries(bins)) {
    if (typed) {
      stored[bin] = typed.type === DOUBLE ? new Aerospike.Double(typed.value as number) : typed.value
    }
  }
  return stored
}

// Applies order keys to a query the same way the reference reads them.
export function orderBy (keys: OrderKey[]) {
  return (query: Q) => {
    for (const key of keys) {
      query.thenOrderBy(key.bin, key.type, key.direction, key.flags)
    }
  }
}

// A short name for a set of order keys, for failure messages.
export function describeKeys (keys: OrderKey[]): string {
  const names: Record<number, string> = { [INTEGER]: 'INTEGER', [DOUBLE]: 'DOUBLE', [STRING]: 'STRING', [BYTES]: 'BYTES' }
  return keys.map(key => `${key.bin} ${names[key.type]} ${key.direction === DESC ? 'DESC' : 'ASC'}` +
    (key.flags ? ' CASE_INSENSITIVE' : '')).join(', then ')
}

// ---------------------------------------------------------------------------
// Multi-node clusters (local only).
// ---------------------------------------------------------------------------

// Runs the suite only when AEROSPIKE_MULTI_NODE=1 and the cluster has at least minNodes nodes.
export function skipUnlessMultiNode (ctx: Suite, minNodes: number) {
  ctx.beforeAll(function () {
    if (process.env.AEROSPIKE_MULTI_NODE !== '1' || helper.client.getNodes().length < minNodes) {
      this.skip()
    }
  })
}

// The partitions each node is master for, from the node's "replicas" info:
// "<ns>:<regime>,<replica count>,<master bitmap, base64>,...". Bit order as in
// the C client (as_partition.c): partition i is bit (0x80 >> (i % 8)) of byte i / 8.
export async function masterPartitions (): Promise<Map<string, Set<number>>> {
  const masters = new Map<string, Set<number>>()
  for (const node of helper.client.getNodes()) {
    const response = await helper.client.infoNode('replicas', node)
    const entry = response.split('\t').pop()!.split(';').find(e => e.startsWith(`${helper.namespace}:`))!
    const bitmap = Buffer.from(entry.split(':')[1].split(',')[2], 'base64')
    const owned = new Set<number>()
    for (let i = 0; i < 4096; i++) {
      if (bitmap[i >> 3] & (0x80 >> (i & 7))) owned.add(i)
    }
    masters.set(node.name, owned)
  }
  return masters
}

// The node that is master for a record's partition.
export function ownerOf (masters: Map<string, Set<number>>, digest: Buffer): string {
  const partition = partitionOf(digest)
  for (const [node, owned] of masters) {
    if (owned.has(partition)) return node
  }
  throw new Error(`no node owns partition ${partition}`)
}

// Changes one bin of a record written by loadSet() or loadModel().
export function setBin (set: string, id: number, bin: string, value: unknown) {
  return helper.client.put(new Aerospike.Key(helper.namespace, set, id), { [bin]: value })
}

// Waits until every node reports no migrations left, twice in a row.
export async function waitForMigrations (timeoutMs = 300000) {
  const end = Date.now() + timeoutMs
  let quietPolls = 0
  while (quietPolls < 2) {
    if (Date.now() > end) throw new Error('migrations did not finish in time')
    await new Promise(resolve => setTimeout(resolve, 1000))
    const stats = await Promise.all(helper.client.getNodes().map(node => helper.client.infoNode('statistics', node)))
    const settled = stats.every(s => /migrate_partitions_remaining=0(;|$)/.test(s) && /cluster_integrity=true/.test(s))
    quietPolls = settled ? quietPolls + 1 : 0
  }
}

