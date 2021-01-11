// *****************************************************************************
// Copyright 2021 Aerospike, Inc.
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

const Aerospike = require('../lib/aerospike')
const exp = Aerospike.expressions

const helper = require('./test_helper')
const keygen = helper.keygen

describe('Aerospike.expressions', function () {
  helper.skipUnlessVersion('>= 5.0.0', this)

  const client = helper.client

  it('builds up an expression', function () {
    const filter = exp.cmpEq(exp.binInt('intVal'), exp.int(42))
    expect(filter).to.be.an('array')
  })

  it('updates a bin conditionally', async function () {
    const key = keygen.string(helper.namespace, helper.set, { prefix: 'test/exp' })()
    await client.put(key, { intVal: 42 })
    const policy = { filterExpression: exp.cmpEq(exp.binInt('intVal'), exp.int(42)) }
    await client.put(key, { intVal: 48 }, null, policy)
    const record = await client.get(key)
    expect(record.bins.intVal).to.eq(48)
    try {
      await client.put(key, { intVal: 52 }, null, policy)
    } catch (error) {
      expect(error.code).to.eq(Aerospike.status.FILTERED_OUT)
    }
  })
})
