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

const FILTERED_OUT = Aerospike.status.FILTERED_OUT

const helper = require('./test_helper')
const keygen = helper.keygen

describe('Aerospike.expressions', function () {
  helper.skipUnlessVersion('>= 5.0.0', this)

  const client = helper.client

  async function createRecord (bins, meta = null) {
    const key = keygen.string(helper.namespace, helper.set, { prefix: 'test/exp' })()
    await client.put(key, bins, meta)
    return key
  }

  async function testNoMatch (key, filterExpression) {
    const rejectPolicy = { filterExpression }
    try {
      await client.remove(key, rejectPolicy)
    } catch (error) {
      expect(error.code).to.eq(FILTERED_OUT)
    }
  }

  async function testMatch (key, filterExpression) {
    const passPolicy = { filterExpression }
    await client.remove(key, passPolicy)
  }

  it('builds up a filter expression value', function () {
    const filter = exp.cmpEq(exp.binInt('intVal'), exp.int(42))
    expect(filter).to.be.an('array')
  })

  describe('cmpEq on int bin', function () {
    it('evaluates to true if an integer bin equals the given value', async function () {
      const key = await createRecord({ intVal: 42 })

      await testNoMatch(key, exp.cmpEq(exp.binInt('intVal'), exp.int(37)))
      await testMatch(key, exp.cmpEq(exp.binInt('intVal'), exp.int(42)))
    })
  })

  describe('cmpEq on blob bin', function () {
    it('evaluates to true if a blob bin matches a value', async function () {
      const key = await createRecord({ blob: Buffer.from([1, 2, 3]) })

      await testNoMatch(key, exp.cmpEq(exp.binBlob('blob'), exp.bytes(Buffer.from([4, 5, 6]))))
      await testMatch(key, exp.cmpEq(exp.binBlob('blob'), exp.bytes(Buffer.from([1, 2, 3]))))
    })
  })

  describe('cmpNe on int bin', function () {
    it('evaluates to true if an integer bin does not equal the given value', async function () {
      const key = await createRecord({ intVal: 42 })

      await testNoMatch(key, exp.cmpNe(exp.binInt('intVal'), exp.int(42)))
      await testMatch(key, exp.cmpNe(exp.binInt('intVal'), exp.int(37)))
    })
  })

  describe('binExists', function () {
    it('evaluates to true if the bin with the given name exists', async function () {
      const key = await createRecord({ foo: 'bar' })

      await testNoMatch(key, exp.binExists('fox'))
      await testMatch(key, exp.binExists('foo'))
    })
  })
})
