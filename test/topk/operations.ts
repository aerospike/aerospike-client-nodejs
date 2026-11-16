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
import { loadSet, removeLoadedSets, topK, values, errorFrom, skipUnlessTopKQueriesRun } from './helpers.ts';

const { INTEGER } = Aerospike.binDataType
const { DESC } = Aerospike.order
const { operations, lists, status } = Aerospike

// Projects n plus count - 1 reads of x, and orders by n.
const withOps = (count: number) => (q: any) => {
  q.ops = [operations.read('n'), ...Array.from({ length: count - 1 }, () => operations.read('x'))]
  q.orderBy('n', INTEGER, DESC)
}

describe('Top-K with projection operations', function () {
  this.timeout(60000)
  helper.skipUnlessVersion('>= 8.2.1', this)
  skipUnlessTopKQueriesRun(this)
  afterEach(removeLoadedSets)

  it('fails when an operation fails on a record, where a plain query leaves the record out', async function () {
    const set = await loadSet([{ n: 1, l: [1] }, { n: 2, l: [1, 2] }, { n: 100, l: 7 }])
    const project = (q: any) => { q.ops = [operations.read('n'), lists.size('l')] }

    const plain = helper.client.query(helper.namespace, set)
    project(plain)
    expect(values(await plain.results(), 'n').sort()).to.eql([1, 2])

    const query = helper.client.query(helper.namespace, set)
    project(query)
    query.orderBy('n', INTEGER, DESC)
    query.topK(3)
    expect((await errorFrom(() => query.results()))?.code).to.equal(status.ERR_BIN_INCOMPATIBLE_TYPE)
  })

  it('accepts 32,768 operations and rejects more when the query starts, as the server does', async function () {
    const set = await loadSet([{ n: 1, x: 1 }, { n: 2, x: 2 }, { n: 3, x: 3 }])
    expect(values(await topK(set, withOps(32768), 3), 'n')).to.eql([3, 2, 1])
    for (const count of [32769, 65535]) {
      const query = helper.client.query(helper.namespace, set)
      withOps(count)(query)
      query.topK(3)
      const error = await errorFrom(() => query.results({ errorDetailVerbosity: Aerospike.errorDetailVerbosity.MESSAGE } as any))
      expect(error?.code, `${count} operations`).to.equal(status.ERR_REQUEST_INVALID)
      expect(error.message, `${count} operations`).to.match(new RegExp(` request has ${count} bin ops, max is 32768$`))
    }
  })

  it('rejects more than 65,535 operations before sending, instead of wrapping the count', async function () {
    const set = await loadSet([{ n: 1, x: 1 }])
    const query = helper.client.query(helper.namespace, set)
    withOps(65536)(query)
    query.topK(1)
    expect((await errorFrom(() => query.results()))?.code, 'Top-K query').to.equal(status.ERR_PARAM)

    const reads = Array.from({ length: 65536 }, () => operations.read('n'))
    const key = new Aerospike.Key(helper.namespace, set, 0)
    expect((await errorFrom(() => helper.client.operate(key, reads)))?.code, 'operate()').to.equal(status.ERR_PARAM)
  })
})
