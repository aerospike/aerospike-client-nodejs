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
const exp = Aerospike.exp
const op = Aerospike.operations

const GeoJSON = Aerospike.GeoJSON

const FILTERED_OUT = Aerospike.status.FILTERED_OUT

const helper = require('./test_helper')
const keygen = helper.keygen
const tempBin = 'ExpVar'

describe('Aerospike.exp', function () {
  helper.skipUnlessVersion('>= 5.0.0', this)

  const client = helper.client

  async function createRecord (bins, meta = null) {
    const key = keygen.string(helper.namespace, helper.set, { prefix: 'test/exp' })()
    await client.put(key, bins, meta)
    return key
  }

  async function testNoMatch (key, filterExpression) {
    const rejectPolicy = { filterExpression }
    let operationSuccessful = false
    try {
      await client.remove(key, rejectPolicy)
      operationSuccessful = true
    } catch (error) {
      expect(error.code).to.eq(FILTERED_OUT, `Received unexpected error code with message "${error.message}"`)
    }
    if (operationSuccessful) {
      expect.fail('Test no-match: Operation should have not have been executed due to failed expression match')
    }
  }

  async function testMatch (key, filterExpression) {
    const passPolicy = { filterExpression }
    await client.remove(key, passPolicy)
  }

  it('builds up a filter expression value', function () {
    const filter = exp.eq(exp.binInt('intVal'), exp.int(42))
    expect(filter).to.be.an('array')
  })

  describe('comparison expressions', function () {
    describe('eq on int bin', function () {
      it('evaluates to true if an integer bin equals the given value', async function () {
        const key = await createRecord({ intVal: 42 })

        await testNoMatch(key, exp.eq(exp.binInt('intVal'), exp.int(37)))
        await testMatch(key, exp.eq(exp.binInt('intVal'), exp.int(42)))
      })
    })

    describe('eq on blob bin', function () {
      it('evaluates to true if a blob bin matches a value', async function () {
        const key = await createRecord({ blob: Buffer.from([1, 2, 3]) })

        await testNoMatch(key, exp.eq(exp.binBlob('blob'), exp.bytes(Buffer.from([4, 5, 6]))))
        await testMatch(key, exp.eq(exp.binBlob('blob'), exp.bytes(Buffer.from([1, 2, 3]))))
      })
    })

    describe('ne on int bin', function () {
      it('evaluates to true if an integer bin does not equal the given value', async function () {
        const key = await createRecord({ intVal: 42 })

        await testNoMatch(key, exp.ne(exp.binInt('intVal'), exp.int(42)))
        await testMatch(key, exp.ne(exp.binInt('intVal'), exp.int(37)))
      })
    })

    describe('gt on float bin', function () {
      it('evaluates to true if a float bin value is greater than the given value', async function () {
        const key = await createRecord({ pi: Math.PI })

        await testNoMatch(key, exp.gt(exp.binFloat('pi'), exp.float(4.5678)))
        await testMatch(key, exp.gt(exp.binFloat('pi'), exp.float(1.2345)))
      })
    })

    describe('regex - regular expression comparisons', function () {
      it('matches a string value with a regular expression', async function () {
        const key = await createRecord({ title: 'Star Wars' })

        await testNoMatch(key, exp.cmpRegex(0, 'Treck$', exp.binStr('title')))
        await testMatch(key, exp.cmpRegex(0, '^Star', exp.binStr('title')))
      })

      it('matches a string value with a regular expression - case insensitive', async function () {
        const key = await createRecord({ title: 'Star Wars' })

        await testNoMatch(key, exp.cmpRegex(Aerospike.regex.ICASE, 'trEcK$', exp.binStr('title')))
        await testMatch(key, exp.cmpRegex(Aerospike.regex.ICASE, '^sTaR', exp.binStr('title')))
      })
    })

    describe('geo - geospatial comparisons', function () {
      it('matches if the point is contained within the region', async function () {
        const key = await createRecord({ location: new GeoJSON.Point(103.913, 1.308) })

        await testNoMatch(key, exp.cmpGeo(exp.binGeo('location'), exp.geo(new GeoJSON.Circle(9.78, 53.55, 50000))))
        await testMatch(key, exp.cmpGeo(exp.binGeo('location'), exp.geo(new GeoJSON.Circle(103.875, 1.297, 10000))))
      })

      it('matches if the region contains the point', async function () {
        const key = await createRecord({ location: new GeoJSON.Point(103.913, 1.308) })

        await testNoMatch(key, exp.cmpGeo(exp.geo(new GeoJSON.Circle(9.78, 53.55, 50000)), exp.binGeo('location')))
        await testMatch(key, exp.cmpGeo(exp.geo(new GeoJSON.Circle(103.875, 1.297, 10000)), exp.binGeo('location')))
      })
    })
  })

  describe('binExists', function () {
    it('evaluates to true if the bin with the given name exists', async function () {
      const key = await createRecord({ foo: 'bar' })

      await testNoMatch(key, exp.binExists('fox'))
      await testMatch(key, exp.binExists('foo'))
    })
  })

  describe('ttl', function () {
    helper.skipUnlessSupportsTtl(this)

    it('evaluates to true if the record ttl matches expectations', async function () {
      const key = await createRecord({ foo: 'bar' }, { ttl: 1000 })

      await testNoMatch(key, exp.eq(exp.ttl(), exp.int(0)))
      await testMatch(key, exp.gt(exp.ttl(), exp.int(0)))
    })
  })

  describe('voidTime', function () {
    helper.skipUnlessSupportsTtl(this)

    it('evaluates to true if the record void time matches expectations', async function () {
      const key = await createRecord({ foo: 'bar' }, { ttl: 1000 })

      const now = Date.now() * 1000000 // nanoseconds
      await testNoMatch(key, exp.lt(exp.voidTime(), exp.int(now)))
      await testMatch(key, exp.gt(exp.voidTime(), exp.int(now)))
    })
  })

  describe('not', function () {
    it('evaluates to true if the expression evaluates to false', async function () {
      const key = await createRecord({ a: 1, b: 2, c: 3 })

      await testNoMatch(key, exp.not(exp.binExists('a')))
      await testMatch(key, exp.not(exp.binExists('d')))
    })
  })

  describe('and', function () {
    it('evaluates to true if all expressions evaluate to true', async function () {
      const key = await createRecord({ a: 1, b: 2, c: 3 })

      await testNoMatch(key, exp.and(exp.binExists('a'), exp.binExists('d')))
      await testMatch(key, exp.and(exp.binExists('a'), exp.binExists('b')))
    })
  })

  describe('or', function () {
    it('evaluates to true if any expression evaluates to true', async function () {
      const key = await createRecord({ a: 1, b: 2, c: 3 })

      await testNoMatch(key, exp.or(exp.binExists('d'), exp.binExists('e')))
      await testMatch(key, exp.or(exp.binExists('a'), exp.binExists('d')))
    })
  })

  describe('arithmetic expressions', function () {
    describe('int bin add expression', function () {
      it('evaluates exp_read op to true if temp bin equals the sum of bin and given value', async function () {
        const key = await createRecord({ intVal: 2 })
        const ops = [
          exp.operations.read(tempBin,
            exp.add(exp.binInt('intVal'), exp.binInt('intVal')),
            0),
          op.read('intVal')
        ]
        const result = await client.operate(key, ops, {})
        // console.log(result)
        expect(result.bins.intVal).to.eql(2)
        expect(result.bins.ExpVar).to.eql(4)
      })
      it('evaluates exp_write op to true if bin equals the sum of bin and given value', async function () {
        const key = await createRecord({ intVal: 2 })
        const ops = [
          exp.operations.write('intVal',
            exp.add(exp.binInt('intVal'), exp.binInt('intVal')),
            0),
          op.read('intVal')
        ]
        const result = await client.operate(key, ops, {})
        // console.log(result)
        expect(result.bins.intVal).to.eql(4)
      })
      it('evaluates exp_read op to true if temp bin equals the sum of bin and given value', async function () {
        const key = await createRecord({ intVal: 2 })
        const ops = [
          exp.operations.read(tempBin,
            exp.add(exp.binInt('intVal'), exp.binInt('intVal')),
            0),
          op.read('intVal')
        ]
        const result = await client.operate(key, ops, {})
        // console.log(result)
        expect(result.bins.intVal).to.eql(2)
        expect(result.bins.ExpVar).to.eql(4)
      })
    })
  })
})
