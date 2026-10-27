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

/* global describe, it */

import type { Query as Q } from '../../lib/aerospike.js';

import { expect } from 'chai';
import * as Aerospike from '../../lib/aerospike.js';
import * as helper from '../test_helper.ts';
import { newQuery, errorFrom, streamErrorFrom, skipUnlessTopKQueriesRun } from './helpers.ts';

const { INTEGER, DOUBLE, STRING, BYTES } = Aerospike.orderByType
const { DESC } = Aerospike.order
const { CASE_INSENSITIVE } = Aerospike.orderByFlags
const { status, exp } = Aerospike

// A query ranked by 'score', highest first, top 10.
function topKQuery (): Q {
  const query = newQuery()
  query.orderBy('score', INTEGER, DESC)
  query.topK(10)
  return query
}

// Either setting alone makes a query a Top-K query, so each must reach the C client on its own.
const EACH_SETTING: Array<[string, () => Q]> = [
  ['an order key alone', () => { const query = newQuery(); query.orderBy('score', INTEGER, DESC); return query }],
  ['k alone', () => { const query = newQuery(); query.topK(10); return query }]
]

// Rules the C client checks: the error is a parameter error with C's message.
function expectRejected (error: any, message: string, label = '') {
  expect(error, `${label} expected an error`).to.not.be.null
  expect(error.code, label).to.equal(status.ERR_PARAM)
  expect(error.message, label).to.equal(message)
}

describe('Top-K rejections by the C client', function () {
  helper.skipUnlessVersion('>= 8.2.1', this)

  describe('on queries that are not foreground queries', function () {
    it('rejects Top-K with an aggregation UDF', async function () {
      const message = "orderBy is incompatible with aggregate UDFs; use the UDF's own reduce stage"
      for (const [name, build] of EACH_SETTING) {
        expectRejected(await errorFrom(() => build().apply('module', 'fn')), message, `apply() with ${name}:`)

        const query = build()
        query.setUdf('module', 'fn')
        expectRejected(await streamErrorFrom(query), message, `foreach() + setUdf() with ${name}:`)
      }
    })

    it('rejects Top-K on background queries', async function () {
      const message = 'orderBy/topK is only valid on foreground (SELECT-style) queries; ' +
        'background (UPDATE-style) queries do not produce a result stream'
      for (const [name, build] of EACH_SETTING) {
        expectRejected(await errorFrom(() => build().background('module', 'fn')), message, `background() with ${name}:`)
        expectRejected(await errorFrom(() => build().operate([Aerospike.operations.write('x', 1)])), message, `operate() with ${name}:`)
      }
    })
  })

  describe('on foreground queries', function () {
    skipUnlessTopKQueriesRun(this)

    it('rejects k above 1,000', async function () {
      for (const k of [1001, 2 ** 32 - 1]) {
        const query = topKQuery()
        query.topK(k)
        expectRejected(await errorFrom(() => query.results()), `topK must be in [1, 1000]; got ${k}`, `k = ${k}:`)
      }
    })

    // R28 says the client rejects k = 0 before sending, but the C client stores k = 0 as
    // "no k" and sends an order key without k, which the server rejects (code 4).
    // Pending the decision on who checks it (raised with Julian on C PR #283).
    it.skip('rejects k = 0 before sending (R28)', async function () {
      const query = topKQuery()
      query.topK(0)
      expectRejected(await errorFrom(() => query.results()), 'topK must be in [1, 1000]; got 0')
    })

    it('rejects topK without orderBy', async function () {
      const query = newQuery()
      query.topK(10)
      expectRejected(await errorFrom(() => query.results()), 'top_k requires order_by to be set')
    })

    it('rejects an order key the C client does not accept', async function () {
      const flagsMessage = 'orderBy flags are only valid with type STRING'
      const unknownFlagMessage = 'order_by has unknown flag bits set'
      const binMessage = 'Top-K order-by bin name must be 1-15 UTF-8 bytes without NUL'
      const cases: Array<[string, string, number, number, number, string]> = [
        ['type 0', 'score', 0, DESC, 0,
          'orderBy requires a type declaration (INTEGER, DOUBLE, STRING, or BYTES); Aerospike has no schema'],
        ['type 5', 'score', 5, DESC, 0, 'orderBy type must be one of INTEGER, DOUBLE, STRING, BYTES; got 5'],
        ['direction 2', 'score', INTEGER, 2, 0, 'orderBy direction must be ASC or DESC'],
        ['empty bin name', '', INTEGER, DESC, 0, binMessage],
        ['unknown flag 2', 'score', STRING, DESC, 2, unknownFlagMessage],
        ['unknown flag 4', 'score', STRING, DESC, 4, unknownFlagMessage],
        ['CASE_INSENSITIVE on INTEGER', 'score', INTEGER, DESC, CASE_INSENSITIVE, flagsMessage],
        ['CASE_INSENSITIVE on DOUBLE', 'score', DOUBLE, DESC, CASE_INSENSITIVE, flagsMessage],
        ['CASE_INSENSITIVE on BYTES', 'score', BYTES, DESC, CASE_INSENSITIVE, flagsMessage]
      ]
      for (const [name, bin, type, direction, flags, message] of cases) {
        const query = newQuery()
        query.orderBy(bin, type, direction, flags)
        query.topK(10)
        expectRejected(await errorFrom(() => query.results()), message, `${name}:`)
      }
    })

    it('rejects an order key the query does not return exactly once', async function () {
      const notProjected = "orderBy bin 'score' is not in projection; add it to setOperations or remove projection"

      const selectsOther = newQuery()
      selectsOther.select('other')
      selectsOther.orderBy('score', INTEGER, DESC)
      selectsOther.topK(10)
      expectRejected(await errorFrom(() => selectsOther.results()), notProjected, 'select() without the key:')

      const readsOther = topKQuery()
      readsOther.ops = [exp.operations.read('other', exp.int(1), 0)]
      expectRejected(await errorFrom(() => readsOther.results()), notProjected, 'ops without the key:')

      const readsScoreTwice = topKQuery()
      readsScoreTwice.ops = [exp.operations.read('score', exp.int(1), 0), exp.operations.read('score', exp.int(2), 0)]
      expectRejected(await errorFrom(() => readsScoreTwice.results()),
        "orderBy bin 'score' is produced by more than one operation", 'ops producing the key twice:')
    })

    it('rejects settings that conflict with Top-K', async function () {
      const noBins = topKQuery()
      noBins.nobins = true
      expectRejected(await errorFrom(() => noBins.results()),
        'order_by/top_k cannot be combined with a metadata-only (no-bins) query', 'nobins:')

      const maxRecords = topKQuery()
      maxRecords.maxRecords = 10
      expectRejected(await errorFrom(() => maxRecords.results()), 'Top-K is incompatible with maxRecords', 'maxRecords:')

      const paginated = topKQuery()
      paginated.paginate = true
      expectRejected(await streamErrorFrom(paginated),
        'order_by/top_k does not support pagination in this client version', 'paginate:')
    })

    // Pending: query.partitions() with a digest crashes Node before the query reaches the
    // C client (policy.cc partitions_from_jsobject() passes the digest array as a pointer),
    // with or without Top-K. Enable once that existing bug is fixed.
    it.skip('rejects a partition filter that resumes an earlier query', async function () {
      const resumed = topKQuery()
      resumed.partitions(0, 4096, Buffer.alloc(20, 1))
      expectRejected(await errorFrom(() => resumed.results()),
        "Top-K can't resume a partition filter from an earlier query")
    })

    it('rejects orderBy without topK on the server', async function () {
      const query = newQuery()
      query.orderBy('score', INTEGER, DESC)
      const error = await errorFrom(() => query.results())

      // R20: the server rejects an order key sent without k with a parameter error.
      expect(error, 'expected an error').to.not.be.null
      expect(error.code).to.equal(status.ERR_REQUEST_INVALID)
    })
  })
})
