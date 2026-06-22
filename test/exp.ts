// *****************************************************************************
// Copyright 2021-2023 Aerospike, Inc.
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

import { AerospikeError, Client as Cli, exp as expr, operations, maps as Maps, GeoJSON as GJ, Key, AerospikeBins, cdt, AerospikeRecord, RecordMetadata, AerospikeExp, ReadPolicy, BatchApplyPolicy, Key as K, UDF, BatchPolicy, BatchWriteRecord, batchType, BatchReadPolicy, Query, IndexOptions, BatchWritePolicy, BatchRemovePolicy} from '../lib/aerospike.js';
import * as Aerospike from '../lib/aerospike.js';

import { expect, assert } from 'chai'; 

const exp: typeof expr = Aerospike.exp
const op: typeof operations = Aerospike.operations
const maps: typeof Maps = Aerospike.maps
const strings = Aerospike.strings

const GeoJSON: typeof GJ = Aerospike.GeoJSON

const FILTERED_OUT: number = Aerospike.status.FILTERED_OUT

import * as helper from './test_helper.ts';

const keygen = helper.keygen
const tempBin = 'ExpVar'

describe('Aerospike.exp', function () {

  const client: Cli = helper.client

  const orderMap = (key: Key, binName: string, order: Maps.order, ctx?: cdt.Context): Promise<AerospikeRecord> => {
    const policy = new Aerospike.MapPolicy({ order })
    const setMapPolicy = Aerospike.maps.setPolicy(binName, policy)
    if (ctx) setMapPolicy.withContext(ctx)
    return client.operate(key, [setMapPolicy])
  }

  const orderByKey = (key: Key, binName: string, ctx?: cdt.Context): Promise<AerospikeRecord> => orderMap(key, binName, Aerospike.maps.order.KEY_ORDERED , ctx)

  async function createRecord (bins: AerospikeBins, meta: RecordMetadata | null = null) {
    const key = keygen.string(helper.namespace, helper.set, { prefix: 'test/exp' })()
    await client.put(key, bins, meta)
    return key
  }

  async function testNoMatch (key: Key, filterExpression: AerospikeExp) {
    const rejectPolicy = { filterExpression }
    let operationSuccessful = false
    try {
      await client.remove(key, rejectPolicy)
      operationSuccessful = true
    } catch (error: any) {
      expect(error.code).to.eq(FILTERED_OUT, `Received unexpected error code with message "${error.message}"`)
    }
    if (operationSuccessful) {
      expect.fail('Test no-match: Operation should have not have been executed due to failed expression match')
    }
  }

  async function testMatch (key: Key, filterExpression: AerospikeExp) {
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

    describe('eq on bool bin', function () {
      it('evaluates to true if an integer bin equals the given value', async function () {
        const key = await createRecord({ boolVal: true })

        await testNoMatch(key, exp.eq(exp.binBool('boolVal'), exp.bool(false)))
        await testMatch(key, exp.eq(exp.binBool('boolVal'), exp.bool(true)))
      })
    })

    describe('eq on map bin', function () {
      helper.skipUnlessVersion('>= 6.3.0', this)
      it('evaluates to true if a map bin matches a value', async function () {
        const key = await createRecord({ map: { c: 1, b: 2, a: 3 } })
        await orderByKey(key, 'map')
        await testNoMatch(key, exp.eq(exp.map({ d: 4, e: 5 }), exp.binMap('map')))
        await testMatch(key, exp.eq(exp.map({ c: 1, b: 2, a: 3 }), exp.binMap('map')))
      })

      it('evaluates to true if a map bin matches a map bin', async function () {
        const key = await createRecord({ map: { c: 1, b: 2, a: 3 }, map2: { c: 1, b: 2, a: 3 }, map3: { c: 1, b: 2 } })
        await orderByKey(key, 'map')
        await testNoMatch(key, exp.eq(exp.binMap('map'), exp.binMap('map3')))
        await testMatch(key, exp.eq(exp.binMap('map'), exp.binMap('map2')))
      })
    })

    describe('eq on list bin', function () {
      helper.skipUnlessVersion('>= 6.3.0', this)
      it('evaluates to true if a list bin matches a value', async function () {
        const key = await createRecord({ list: [4, 2, 0] })
        await orderByKey(key, 'map')
        await testNoMatch(key, exp.eq(exp.list([0, 2, 4]), exp.binList('list')))
        await testMatch(key, exp.eq(exp.list([4, 2, 0]), exp.binList('list')))
      })

      it('evaluates to true if a list bin matches a list bin', async function () {
        const key = await createRecord({ list: [4, 2, 0], list2: [4, 2, 0], list3: [4, 2] })
        await orderByKey(key, 'map')
        await testNoMatch(key, exp.eq(exp.binList('list'), exp.binList('list3')))
        await testMatch(key, exp.eq(exp.binList('list'), exp.binList('list2')))
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

        const circle1: GJ = new GeoJSON.Circle(9.78, 53.55, 50000)
        const circle2: GJ = new GeoJSON.Circle(103.875, 1.297, 10000)
        await testNoMatch(key, exp.cmpGeo(exp.binGeo('location'), exp.geo(circle1)))
        await testMatch(key, exp.cmpGeo(exp.binGeo('location'), exp.geo(circle2)))
      })

      it('matches if the region contains the point', async function () {
        const key = await createRecord({ location: new GeoJSON.Point(103.913, 1.308) })

        const circle1: GJ = new GeoJSON.Circle(9.78, 53.55, 50000)
        const circle2: GJ = new GeoJSON.Circle(103.875, 1.297, 10000)
        await testNoMatch(key, exp.cmpGeo(exp.geo(circle1), exp.binGeo('location')))
        await testMatch(key, exp.cmpGeo(exp.geo(circle2), exp.binGeo('location')))
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

  describe('nil', function () {
    it('evaluates to true if any expression evaluates to true', async function () {
      const key = await createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow' } })

      await testNoMatch(key, exp.eq(exp.maps.getByValueRange(exp.binMap('tags'), exp.str('green'), exp.nil(), maps.returnType.COUNT), exp.int(2)))
      await testMatch(key, exp.eq(exp.maps.getByValueRange(exp.binMap('tags'), exp.str('green'), exp.nil(), maps.returnType.COUNT), exp.int(1)))
    })
  })

  describe('inf', function () {
    it('evaluates to true if any expression evaluates to true', async function () {
      const key = await createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow' } })

      await testNoMatch(key, exp.eq(exp.maps.getByValueRange(exp.binMap('tags'), exp.inf(), exp.str('green'), maps.returnType.COUNT), exp.int(1)))
      await testMatch(key, exp.eq(exp.maps.getByValueRange(exp.binMap('tags'), exp.inf(), exp.str('green'), maps.returnType.COUNT), exp.int(2)))
    })
  })

  describe('inf', function () {
    it('evaluates to true if any expression evaluates to true', async function () {
      const key = await createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow' } })

      await testNoMatch(key, exp.eq(exp.maps.getByValueRange(exp.binMap('tags'), exp.inf(), exp.str('green'), maps.returnType.COUNT), exp.int(1)))
      await testMatch(key, exp.eq(exp.maps.getByValueRange(exp.binMap('tags'), exp.inf(), exp.str('green'), maps.returnType.COUNT), exp.int(2)))
    })
  })

  describe('recordSize', function () {
    helper.skipUnlessVersion('>= 7.0.0', this)

    it('evaluates to true if any expression evaluates to true', async function () {
      const key = await createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow' } })
      await testNoMatch(key, exp.eq(exp.recordSize(), exp.int(1)))
      await testMatch(key, exp.gt(exp.recordSize(), exp.int(64)))
    })

    it('evaluates to true if any expression evaluates to true', async function () {
      const key = await createRecord({ tags: { a: '123456789', b: 'green', c: 'yellow' } })
      await testNoMatch(key, exp.eq(exp.recordSize(), exp.int(1)))
      await testMatch(key, exp.gt(exp.recordSize(), exp.int(64)))
    })
  })

  describe('wildcard', function () {
    it('evaluates to true if any expression evaluates to true', async function () {
      const key = await createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow' } })

      await testNoMatch(key, exp.eq(exp.maps.getByValueRange(exp.binMap('tags'), exp.inf(), exp.wildcard(), maps.returnType.COUNT), exp.int(2)))
      await testMatch(key, exp.eq(exp.maps.getByValueRange(exp.binMap('tags'), exp.inf(), exp.wildcard(), maps.returnType.COUNT), exp.int(3)))
    })
  })

  describe('unknown', function () {
    it('evaluates to false', async function () {
      const key = await createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow' } })

      await testNoMatch(key, exp.unknown())
      await testNoMatch(key, exp.eq(exp.unknown(), exp.unknown()))
    })
  })

  describe('expWriteFlags', function () {
    it('write flags have correct value', async function () {
      expect(exp.expWriteFlags).to.have.property('DEFAULT', 0)
      expect(exp.expWriteFlags).to.have.property('CREATE_ONLY', 1)
      expect(exp.expWriteFlags).to.have.property('UPDATE_ONLY', 2)
      expect(exp.expWriteFlags).to.have.property('ALLOW_DELETE', 4)
      expect(exp.expWriteFlags).to.have.property('POLICY_NO_FAIL', 8)
      expect(exp.expWriteFlags).to.have.property('EVAL_NO_FAIL', 16)
    })
  })
  describe('expReadFlags', function () {
    it('read flags have correct value', async function () {
      expect(exp.expReadFlags).to.have.property('DEFAULT', 0)
      expect(exp.expReadFlags).to.have.property('EVAL_NO_FAIL', 16)
    })
  })

  describe('arithmetic expressions', function () {
    describe('int bin add expression', function () {
      it('evaluates exp_read op to true if temp bin equals the sum of bin and given value', async function () {
        const key = await createRecord({ intVal: 2 })
        const ops = [
          exp.operations.read(tempBin,
            exp.add(exp.binInt('intVal'), exp.binInt('intVal')),
            exp.expWriteFlags.DEFAULT),
          op.read('intVal')
        ]
        const result: AerospikeRecord = await client.operate(key, ops, {})
        // console.log(result)
        const bins: AerospikeBins = result.bins
        expect(bins.intVal).to.eql(2)
        expect(bins.ExpVar).to.eql(4)
      })
      it('evaluates exp_write op to true if bin equals the sum of bin and given value', async function () {
        const key = await createRecord({ intVal: 2 })
        const ops = [
          exp.operations.write('intVal',
            exp.add(exp.binInt('intVal'), exp.binInt('intVal')),
            exp.expWriteFlags.DEFAULT),
          op.read('intVal')
        ]
        const result: AerospikeRecord = await client.operate(key, ops, {})
        const bins: AerospikeBins = result.bins
        // console.log(result)
        expect(bins.intVal).to.eql(4)
      })
      it('evaluates exp_read op to true if temp bin equals the sum of bin and given value', async function () {
        const key = await createRecord({ intVal: 2 })
        const ops = [
          exp.operations.read(tempBin,
            exp.add(exp.binInt('intVal'), exp.binInt('intVal')),
            exp.expWriteFlags.DEFAULT),
          op.read('intVal')
        ]
        const result: AerospikeRecord = await client.operate(key, ops, {})
        // console.log(result)
        const bins: AerospikeBins = result.bins
        expect(bins.intVal).to.eql(2)
        expect(bins.ExpVar).to.eql(4)
      })
    })

  })

  describe('string expressions', function () {
    helper.skipUnlessVersion('>= 8.1.3', this)

    it('evaluates exp_read for strlen on a string bin', async function () {
      const key = await createRecord({ text: 'hello' })
      const ops = [
        exp.operations.read(tempBin,
          exp.string.strlen(exp.binStr('text')),
          exp.expWriteFlags.DEFAULT),
        op.read('text')
      ]
      const result: AerospikeRecord = await client.operate(key, ops, {})
      const bins: AerospikeBins = result.bins
      expect(bins.text).to.eql('hello')
      expect(bins.ExpVar).to.eql(5)
    })

    it('evaluates substrRange via exp_read', async function () {
      const key = await createRecord({ text: 'abcdef' })
      const ops = [
        exp.operations.read(tempBin,
          // Two-arg SUBSTR in expressions: half-open codepoint range [start, end)
          exp.string.substrRange(1, 5, exp.binStr('text')),
          exp.expWriteFlags.DEFAULT),
        op.read('text')
      ]
      const result: AerospikeRecord = await client.operate(key, ops, {})
      const bins: AerospikeBins = result.bins
      expect(bins.text).to.eql('abcdef')
      expect(bins.ExpVar).to.eql('bcde')
    })

    it('evaluates substr(start, end, bin) alias of substrRange via exp_read', async function () {
      const key = await createRecord({ text: 'abcdef' })
      const ops = [
        exp.operations.read(tempBin,
          exp.string.substr(1, 5, exp.binStr('text')),
          exp.expWriteFlags.DEFAULT),
        op.read('text')
      ]
      const result: AerospikeRecord = await client.operate(key, ops, {})
      expect(result.bins.text).to.eql('abcdef')
      expect(result.bins.ExpVar).to.eql('bcde')
    })

    describe('string read expressions', function () {
      it('charAt', async function () {
        const key = await createRecord({ text: 'abcde' })
        const ops = [
          exp.operations.read(tempBin,
            exp.string.charAt(2, exp.binStr('text')),
            exp.expWriteFlags.DEFAULT),
          op.read('text')
        ]
        const result: AerospikeRecord = await client.operate(key, ops, {})
        expect(result.bins.text).to.eql('abcde')
        expect(result.bins.ExpVar).to.eql('c')
      })

      it('endsWith as filter', async function () {
        const key = await createRecord({ text: 'hello.txt' })
        await testNoMatch(key, exp.eq(exp.string.endsWith('.pdf', exp.binStr('text')), exp.bool(true)))
        await testMatch(key, exp.eq(exp.string.endsWith('.txt', exp.binStr('text')), exp.bool(true)))
      })

      it('toInteger', async function () {
        const key = await createRecord({ text: '42' })
        const ops = [
          exp.operations.read(tempBin,
            exp.string.toInteger(exp.binStr('text')),
            exp.expWriteFlags.DEFAULT),
          op.read('text')
        ]
        const result: AerospikeRecord = await client.operate(key, ops, {})
        expect(result.bins.text).to.eql('42')
        expect(result.bins.ExpVar).to.eql(42)
      })

      it('isUpper', async function () {
        const key = await createRecord({ text: 'ABC' })
        const ops = [
          exp.operations.read(tempBin,
            exp.string.isUpper(exp.binStr('text')),
            exp.expWriteFlags.DEFAULT),
          op.read('text')
        ]
        const result: AerospikeRecord = await client.operate(key, ops, {})
        expect(result.bins.ExpVar).to.eql(true)
      })

      it('substr(start, bin) from offset to end', async function () {
        const key = await createRecord({ text: 'abcdef' })
        const ops = [
          exp.operations.read(tempBin,
            exp.string.substr(3, exp.binStr('text')),
            exp.expWriteFlags.DEFAULT),
          op.read('text')
        ]
        const result: AerospikeRecord = await client.operate(key, ops, {})
        expect(result.bins.text).to.eql('abcdef')
        expect(result.bins.ExpVar).to.eql('def')
      })

      it('find', async function () {
        const key = await createRecord({ text: 'abcdef' })
        const ops = [
          exp.operations.read(tempBin,
            exp.string.find('cd', exp.binStr('text')),
            exp.expWriteFlags.DEFAULT),
          op.read('text')
        ]
        const result: AerospikeRecord = await client.operate(key, ops, {})
        expect(result.bins.ExpVar).to.eql(2)
      })

      it('findOccurrence', async function () {
        const key = await createRecord({ text: 'banana' })
        const ops = [
          exp.operations.read(tempBin,
            exp.string.findOccurrence('a', 2, exp.binStr('text')),
            exp.expWriteFlags.DEFAULT),
          op.read('text')
        ]
        const result: AerospikeRecord = await client.operate(key, ops, {})
        expect(result.bins.ExpVar).to.eql(3)
      })

      it('startsWith as filter', async function () {
        const key = await createRecord({ text: 'prefix_value' })
        await testNoMatch(key, exp.eq(exp.string.startsWith('wrong', exp.binStr('text')), exp.bool(true)))
        await testMatch(key, exp.eq(exp.string.startsWith('prefix', exp.binStr('text')), exp.bool(true)))
      })

      it('toDouble', async function () {
        const key = await createRecord({ text: '3.5' })
        const ops = [
          exp.operations.read(tempBin,
            exp.string.toDouble(exp.binStr('text')),
            exp.expWriteFlags.DEFAULT),
          op.read('text')
        ]
        const result: AerospikeRecord = await client.operate(key, ops, {})
        expect(result.bins.ExpVar).to.eql(3.5)
      })

      it('byteLength vs strlen for non-ASCII', async function () {
        const key = await createRecord({ text: '🙂' })
        const ops = [
          exp.operations.read(tempBin,
            exp.string.byteLength(exp.binStr('text')),
            exp.expWriteFlags.DEFAULT),
          op.read('text')
        ]
        const r1: AerospikeRecord = await client.operate(key, ops, {})
        expect(r1.bins.ExpVar).to.eql(4)
        const ops2 = [
          exp.operations.read(tempBin,
            exp.string.strlen(exp.binStr('text')),
            exp.expWriteFlags.DEFAULT),
          op.read('text')
        ]
        const r2: AerospikeRecord = await client.operate(key, ops2, {})
        expect(r2.bins.ExpVar).to.eql(1)
      })

      it('isNumeric', async function () {
        const key = await createRecord({ text: '-12' })
        const ops = [
          exp.operations.read(tempBin,
            exp.string.isNumeric(exp.binStr('text')),
            exp.expWriteFlags.DEFAULT),
          op.read('text')
        ]
        const result: AerospikeRecord = await client.operate(key, ops, {})
        expect(result.bins.ExpVar).to.eql(true)
      })

      it('isNumericType INT', async function () {
        const key = await createRecord({ text: '99' })
        const ops = [
          exp.operations.read(tempBin,
            exp.string.isNumericType(strings.numericType.INT, exp.binStr('text')),
            exp.expWriteFlags.DEFAULT),
          op.read('text')
        ]
        const result: AerospikeRecord = await client.operate(key, ops, {})
        expect(result.bins.ExpVar).to.eql(true)
      })

      it('isLower', async function () {
        const key = await createRecord({ text: 'abc' })
        const ops = [
          exp.operations.read(tempBin,
            exp.string.isLower(exp.binStr('text')),
            exp.expWriteFlags.DEFAULT),
          op.read('text')
        ]
        const result: AerospikeRecord = await client.operate(key, ops, {})
        expect(result.bins.ExpVar).to.eql(true)
      })

      it('split by codepoint (default split)', async function () {
        const key = await createRecord({ text: 'a,b,c' })
        const ops = [
          exp.operations.read(tempBin,
            exp.string.split(exp.binStr('text')),
            exp.expWriteFlags.DEFAULT),
          op.read('text')
        ]
        const result: AerospikeRecord = await client.operate(key, ops, {})
        expect(result.bins.ExpVar).to.be.an('array')
        // AS_STRING_OP_SPLIT with no separator: one list element per Unicode codepoint.
        expect(result.bins.ExpVar).to.eql(['a', ',', 'b', ',', 'c'])
      })

      it('splitSeparator', async function () {
        const key = await createRecord({ text: 'one|two|three' })
        const ops = [
          exp.operations.read(tempBin,
            exp.string.splitSeparator('|', exp.binStr('text')),
            exp.expWriteFlags.DEFAULT),
          op.read('text')
        ]
        const result: AerospikeRecord = await client.operate(key, ops, {})
        expect(result.bins.ExpVar).to.eql(['one', 'two', 'three'])
      })

      it('b64Decode', async function () {
        const key = await createRecord({ text: 'Zm9v' })
        const ops = [
          exp.operations.read(tempBin,
            exp.string.b64Decode(exp.binStr('text')),
            exp.expWriteFlags.DEFAULT),
          op.read('text')
        ]
        const result: AerospikeRecord = await client.operate(key, ops, {})
        expect(result.bins.ExpVar).to.eql(Buffer.from('foo'))
      })

      it('regexCompare', async function () {
        const key = await createRecord({ text: 'foobar' })
        const ops = [
          exp.operations.read(tempBin,
            exp.string.regexCompare('foo', exp.binStr('text')),
            exp.expWriteFlags.DEFAULT),
          op.read('text')
        ]
        const result: AerospikeRecord = await client.operate(key, ops, {})
        expect(result.bins.ExpVar).to.eql(true)
      })

      it('regexCompareFlags case-insensitive', async function () {
        const key = await createRecord({ text: 'Hello' })
        const ops = [
          exp.operations.read(tempBin,
            exp.string.regexCompareFlags('^hello$', strings.regexFlags.CASE_INSENSITIVE, exp.binStr('text')),
            exp.expWriteFlags.DEFAULT),
          op.read('text')
        ]
        const result: AerospikeRecord = await client.operate(key, ops, {})
        expect(result.bins.ExpVar).to.eql(true)
      })

      it('toString repr on string bin', async function () {
        const key = await createRecord({ text: 'quoted' })
        const ops = [
          exp.operations.read(tempBin,
            exp.string.toString(exp.binStr('text')),
            exp.expWriteFlags.DEFAULT),
          op.read('text')
        ]
        const result: AerospikeRecord = await client.operate(key, ops, {})
        expect(result.bins.text).to.eql('quoted')
        expect(result.bins.ExpVar).to.eql('quoted')
      })

      it('toBlob', async function () {
        const key = await createRecord({ text: 'ab' })
        const ops = [
          exp.operations.read(tempBin,
            exp.string.toBlob(exp.binStr('text')),
            exp.expWriteFlags.DEFAULT),
          op.read('text')
        ]
        const result: AerospikeRecord = await client.operate(key, ops, {})
        expect(result.bins.ExpVar).to.eql(Buffer.from('ab', 'utf8'))
      })
    })

    describe('string modify expressions (local; stored bin unchanged)', function () {
      it('upper leaves source bin unchanged', async function () {
        const key = await createRecord({ text: 'ab' })
        const ops = [
          exp.operations.read(tempBin,
            exp.string.upper(null, exp.binStr('text')),
            exp.expWriteFlags.DEFAULT),
          op.read('text')
        ]
        const result: AerospikeRecord = await client.operate(key, ops, {})
        expect(result.bins.text).to.eql('ab')
        expect(result.bins.ExpVar).to.eql('AB')
      })

      it('snip local result', async function () {
        const key = await createRecord({ text: 'abcde' })
        const ops = [
          exp.operations.read(tempBin,
            exp.string.snip(null, 1, 4, exp.binStr('text')),
            exp.expWriteFlags.DEFAULT),
          op.read('text')
        ]
        const result: AerospikeRecord = await client.operate(key, ops, {})
        expect(result.bins.text).to.eql('abcde')
        expect(result.bins.ExpVar).to.eql('ae')
      })

      it('append vs concat literal wire', async function () {
        await helper.skipUnlessStringAppendPrepend.call(this)
        const key = await createRecord({ text: 'x' })
        const opsAppend = [
          exp.operations.read(tempBin,
            exp.string.append(null, 'y', exp.binStr('text')),
            exp.expWriteFlags.DEFAULT),
          op.read('text')
        ]
        const ra: AerospikeRecord = await client.operate(key, opsAppend)
        expect(ra.bins.text).to.eql('x')
        expect(ra.bins.ExpVar).to.eql('xy')

        const opsConcat = [
          exp.operations.read(tempBin,
            exp.string.concat(null, 'z', exp.binStr('text')),
            exp.expWriteFlags.DEFAULT),
          op.read('text')
        ]
        const rb: AerospikeRecord = await client.operate(key, opsConcat)
        expect(rb.bins.text).to.eql('x')
        expect(rb.bins.ExpVar).to.eql('xz')
      })

      it('concatList', async function () {
        const key = await createRecord({ text: 'a' })
        const ops = [
          exp.operations.read(tempBin,
            exp.string.concatList(null, exp.list(['b', 'c']), exp.binStr('text')),
            exp.expWriteFlags.DEFAULT),
          op.read('text')
        ]
        const result: AerospikeRecord = await client.operate(key, ops, {})
        expect(result.bins.text).to.eql('a')
        expect(result.bins.ExpVar).to.eql('abc')
      })

      it('prepend local result', async function () {
        await helper.skipUnlessStringAppendPrepend.call(this)
        const key = await createRecord({ text: 'end' })
        const ops = [
          exp.operations.read(tempBin,
            exp.string.prepend(null, 'pre-', exp.binStr('text')),
            exp.expWriteFlags.DEFAULT),
          op.read('text')
        ]
        const result: AerospikeRecord = await client.operate(key, ops, {})
        expect(result.bins.text).to.eql('end')
        expect(result.bins.ExpVar).to.eql('pre-end')
      })

      it('lower', async function () {
        const key = await createRecord({ text: 'AbC' })
        const ops = [
          exp.operations.read(tempBin,
            exp.string.lower(null, exp.binStr('text')),
            exp.expWriteFlags.DEFAULT),
          op.read('text')
        ]
        const result: AerospikeRecord = await client.operate(key, ops, {})
        expect(result.bins.text).to.eql('AbC')
        expect(result.bins.ExpVar).to.eql('abc')
      })

      it('replace', async function () {
        const key = await createRecord({ text: 'fooXfoo' })
        const ops = [
          exp.operations.read(tempBin,
            exp.string.replace(null, 'foo', 'bar', exp.binStr('text')),
            exp.expWriteFlags.DEFAULT),
          op.read('text')
        ]
        const result: AerospikeRecord = await client.operate(key, ops, {})
        expect(result.bins.text).to.eql('fooXfoo')
        expect(result.bins.ExpVar).to.eql('barXfoo')
      })

      it('replaceAll', async function () {
        const key = await createRecord({ text: 'foofoo' })
        const ops = [
          exp.operations.read(tempBin,
            exp.string.replaceAll(null, 'foo', 'z', exp.binStr('text')),
            exp.expWriteFlags.DEFAULT),
          op.read('text')
        ]
        const result: AerospikeRecord = await client.operate(key, ops, {})
        expect(result.bins.text).to.eql('foofoo')
        expect(result.bins.ExpVar).to.eql('zz')
      })

      it('trimStart and trimEnd', async function () {
        const key = await createRecord({ text: '  mid  ' })
        const opsL = [
          exp.operations.read(tempBin,
            exp.string.trimStart(null, exp.binStr('text')),
            exp.expWriteFlags.DEFAULT),
          op.read('text')
        ]
        const rL: AerospikeRecord = await client.operate(key, opsL, {})
        expect(rL.bins.ExpVar).to.eql('mid  ')
        const opsR = [
          exp.operations.read(tempBin,
            exp.string.trimEnd(null, exp.binStr('text')),
            exp.expWriteFlags.DEFAULT),
          op.read('text')
        ]
        const rR: AerospikeRecord = await client.operate(key, opsR, {})
        expect(rR.bins.ExpVar).to.eql('  mid')
      })

      it('caseFold', async function () {
        const key = await createRecord({ text: 'Straße' })
        const ops = [
          exp.operations.read(tempBin,
            exp.string.caseFold(null, exp.binStr('text')),
            exp.expWriteFlags.DEFAULT),
          op.read('text')
        ]
        const result: AerospikeRecord = await client.operate(key, ops, {})
        expect(result.bins.text).to.eql('Straße')
        const folded = result.bins.ExpVar as string
        expect(folded).to.be.a('string')
        expect(folded.length).to.be.at.least(6)
      })

      it('normalizeNfc', async function () {
        const key = await createRecord({ text: 'caf\u0065\u0301' })
        const ops = [
          exp.operations.read(tempBin,
            exp.string.normalizeNfc(null, exp.binStr('text')),
            exp.expWriteFlags.DEFAULT),
          op.read('text')
        ]
        const result: AerospikeRecord = await client.operate(key, ops, {})
        expect(result.bins.text).to.eql('caf\u0065\u0301')
        expect(result.bins.ExpVar).to.eql('caf\u00e9')
      })

      it('padStart', async function () {
        const key = await createRecord({ text: '7' })
        const ops = [
          exp.operations.read(tempBin,
            exp.string.padStart(null, 4, '0', exp.binStr('text')),
            exp.expWriteFlags.DEFAULT),
          op.read('text')
        ]
        const result: AerospikeRecord = await client.operate(key, ops, {})
        expect(result.bins.text).to.eql('7')
        expect(result.bins.ExpVar).to.eql('0007')
      })

      it('padEnd', async function () {
        const key = await createRecord({ text: 'x' })
        const ops = [
          exp.operations.read(tempBin,
            exp.string.padEnd(null, 3, '.', exp.binStr('text')),
            exp.expWriteFlags.DEFAULT),
          op.read('text')
        ]
        const result: AerospikeRecord = await client.operate(key, ops, {})
        expect(result.bins.text).to.eql('x')
        expect(result.bins.ExpVar).to.eql('x..')
      })

      it('repeat', async function () {
        const key = await createRecord({ text: 'ab' })
        const ops = [
          exp.operations.read(tempBin,
            exp.string.repeat(null, 3, exp.binStr('text')),
            exp.expWriteFlags.DEFAULT),
          op.read('text')
        ]
        const result: AerospikeRecord = await client.operate(key, ops, {})
        expect(result.bins.text).to.eql('ab')
        expect(result.bins.ExpVar).to.eql('ababab')
      })

      it('insert', async function () {
        const key = await createRecord({ text: 'hello' })
        const ops = [
          exp.operations.read(tempBin,
            exp.string.insert(null, 1, 'XX', exp.binStr('text')),
            exp.expWriteFlags.DEFAULT),
          op.read('text')
        ]
        const result: AerospikeRecord = await client.operate(key, ops, {})
        expect(result.bins.text).to.eql('hello')
        expect(result.bins.ExpVar).to.eql('hXXello')
      })

      it('overwrite', async function () {
        const key = await createRecord({ text: 'abcde' })
        const ops = [
          exp.operations.read(tempBin,
            exp.string.overwrite(null, 1, 'Z', exp.binStr('text')),
            exp.expWriteFlags.DEFAULT),
          op.read('text')
        ]
        const result: AerospikeRecord = await client.operate(key, ops, {})
        expect(result.bins.text).to.eql('abcde')
        expect(result.bins.ExpVar).to.eql('aZcde')
      })

      it('regexReplace local (wire per C macro)', async function () {
        const key = await createRecord({ text: 'axa' })
        const ops = [
          exp.operations.read(tempBin,
            exp.string.regexReplace(null, 'a', 'b', strings.regexFlags.NONE, exp.binStr('text')),
            exp.expWriteFlags.DEFAULT),
          op.read('text')
        ]
        const result: AerospikeRecord = await client.operate(key, ops, {})
        expect(result.bins.text).to.eql('axa')
        expect(result.bins.ExpVar).to.be.a('string')
      })

      it('snipRange alias matches snip', async function () {
        const key = await createRecord({ text: 'vwxyz' })
        const ops = [
          exp.operations.read(tempBin,
            exp.string.snipRange(null, 1, 4, exp.binStr('text')),
            exp.expWriteFlags.DEFAULT),
          op.read('text')
        ]
        const result: AerospikeRecord = await client.operate(key, ops, {})
        expect(result.bins.text).to.eql('vwxyz')
        expect(result.bins.ExpVar).to.eql('vz')
      })
    })

    describe('string expression write (persist evaluated string)', function () {
      it('writes upper into another bin', async function () {
        const key = await createRecord({ text: '  mixed  ', out: '' })
        const ops = [
          exp.operations.write('out',
            exp.string.upper(null, exp.string.trim(null, exp.binStr('text'))),
            exp.expWriteFlags.DEFAULT),
          op.read('text'),
          op.read('out')
        ]
        const result: AerospikeRecord = await client.operate(key, ops, {})
        expect(result.bins.text).to.eql('  mixed  ')
        expect(result.bins.out).to.eql('MIXED')
      })

      it('writes replaceAll into target bin', async function () {
        const key = await createRecord({ text: 'aa-bb', out: '' })
        const ops = [
          exp.operations.write('out',
            exp.string.replaceAll(null, 'a', 'z', exp.binStr('text')),
            exp.expWriteFlags.DEFAULT),
          op.read('text'),
          op.read('out')
        ]
        const result: AerospikeRecord = await client.operate(key, ops, {})
        expect(result.bins.text).to.eql('aa-bb')
        expect(result.bins.out).to.eql('zz-bb')
      })
    })

    describe('chained string modify expressions', function () {
      it('upper(trim(...))', async function () {
        const key = await createRecord({ text: '  hi  ' })
        const ops = [
          exp.operations.read(tempBin,
            exp.string.upper(null, exp.string.trim(null, exp.binStr('text'))),
            exp.expWriteFlags.DEFAULT),
          op.read('text')
        ]
        const result: AerospikeRecord = await client.operate(key, ops, {})
        expect(result.bins.text).to.eql('  hi  ')
        expect(result.bins.ExpVar).to.eql('HI')
      })
    })

    it('uses contains in a filter expression', async function () {
      const key = await createRecord({ text: 'foobar' })
      await testNoMatch(key, exp.eq(exp.string.contains('baz', exp.binStr('text')), exp.bool(true)))
      await testMatch(key, exp.eq(exp.string.contains('foo', exp.binStr('text')), exp.bool(true)))
    })
  })


  describe('expressionToBase64', function () {
    const filterExpression = exp.eq(exp.int(2), exp.int(1))
    const exp_b64 = client.expressionToBase64(filterExpression)
    const exp_b64_exp_ops = client.expressionToBase64(exp.add(exp.binInt('intVal'), exp.binInt('intVal')))

    const filterExpressionMatch = exp.binStr('ace')
    const exp_b64_match = client.expressionToBase64(filterExpressionMatch)

    describe('postive tests', function () {
      it('works with expression operations', async function () {


        const key = await createRecord({ intVal: 2 })

        const exp_op = exp.operations.read(tempBin,
          exp_b64_exp_ops,
          exp.expWriteFlags.DEFAULT
        )

        const ops = [
          exp_op,
          op.read('intVal')
        ]

        const result = await client.operate(key, ops, {})
        const bins: AerospikeBins = result.bins
        // console.log(result)
        expect(bins.intVal).to.eql(2)
        expect(bins.ExpVar).to.eql(4)
      })

      it('works with BasePolicy', async function () {

        const readPolicy: ReadPolicy = new Aerospike.policy.ReadPolicy({
          filterExpression: exp_b64
        })

        const key = keygen.integer(helper.namespace, helper.set)()
        await client.put(key, {example: 'record'})
        try{
          await client.get(key, readPolicy)
          assert.fail("An error should have been caught!")
        }
        catch(error: any){
          const trimmed = error.message.split(" ").slice(1).join(" ");
          expect(trimmed).to.eql("The command was not performed because the filter expression was false.")
          expect(error.code).to.eql(Aerospike.status.AEROSPIKE_FILTERED_OUT)
        }
      })

      it('works with BatchPolicy', async function () {

        await helper.udf.register('udf.lua')

        const batchRecords: K[] = [
          new Key(helper.namespace, helper.set, 'test/batch_apply/1'),
          new Key(helper.namespace, helper.set, 'test/batch_apply/2'),
          new Key(helper.namespace, helper.set, 'test/batch_apply/3'),
          new Key(helper.namespace, helper.set, 'test/batch_apply/4'),
          new Key(helper.namespace, helper.set, 'test/batch_apply/5')
        ]


        const policy: BatchPolicy = new Aerospike.BatchPolicy({
          filterExpression: exp_b64
        })

        const udf: UDF = {
          module: 'udf',
          funcname: 'withArguments',
          args: [[1, 2, 3]]
        }

        await client.batchApply(batchRecords, udf, policy)
      })

      it('works with BatchApplyPolicy', async function () {

        await helper.udf.register('udf.lua')

        const batchRecords: K[] = [
          new Key(helper.namespace, helper.set, 'test/batch_apply/1'),
          new Key(helper.namespace, helper.set, 'test/batch_apply/2'),
          new Key(helper.namespace, helper.set, 'test/batch_apply/3'),
          new Key(helper.namespace, helper.set, 'test/batch_apply/4'),
          new Key(helper.namespace, helper.set, 'test/batch_apply/5')
        ]


        const policy: BatchApplyPolicy = new Aerospike.BatchApplyPolicy({
          filterExpression: exp_b64
        })

        const udf: UDF = {
          module: 'udf',
          funcname: 'withArguments',
          args: [[1, 2, 3]]
        }

        await client.batchApply(batchRecords, udf, null, policy)
      })


      it('works with BatchWritePolicy', async function () {


        const policy: BatchWritePolicy = new Aerospike.BatchWritePolicy({
            filterExpression: exp_b64
        })

        const batchRecords: BatchWriteRecord[] = [
          {
            type: Aerospike.batchType.BATCH_WRITE,
            key: new Key(helper.namespace, helper.set, 'test/batch_write/1'),
            ops: [Aerospike.operations.write('exampleBin', 1)],
            policy
          },
          {
            type: batchType.BATCH_WRITE,
            key: new Key(helper.namespace, helper.set, 'test/batch_write/2'),
            ops: [Aerospike.operations.write('exampleBin', 1)],
            policy
          }
        ]


        await client.batchWrite(batchRecords)
      })

      it('works with BatchReadPolicy', async function () {

        const policy: BatchReadPolicy = new Aerospike.BatchReadPolicy({
          filterExpression: exp_b64
        })

        await client.put(new Aerospike.Key('test', 'demo', 'batchTtl3'), { i: 2 }, { ttl: 10 })

        const batch = [{
          key: new Aerospike.Key('test', 'demo', 'batchTtl3'),
          readAllBins: true,
          policy
        }]

        const batchResult = await client.batchRead(batch, policy)

      })

      it('works with BatchRemovePolicy', async function () {

        const policy: BatchRemovePolicy = new Aerospike.BatchReadPolicy({
          filterExpression: exp_b64
        })


        const batchRecords: K[] = [
          new Key(helper.namespace, helper.set, 'test/batch_remove/1'),
        ]

        await client.put(batchRecords[0], { i: 2 })

        await client.batchRemove(batchRecords, null, policy)

      })

      it('works with expression indexes', async function () {
        this.timeout(10000)
        const query: Query = client.query(helper.namespace, helper.set)

        const key: Key = new Aerospike.Key(helper.namespace, helper.set, "example")
        const record: any = {ace: 'clive'}

        await client.put(key, record)

        const options: IndexOptions = {
          ns: helper.namespace,
          set: helper.set,
          exp: exp_b64_match,
          index: "example_name_whereWithExp",
          datatype: Aerospike.indexDataType.STRING
        }

        await client.createExpIndex(options)

        await new Promise(resolve => setTimeout(resolve, 5000))
        
        query.whereWithExp(Aerospike.filter.equal(null, 'clive'), exp_b64_match)

        const results: any = await query.results()

        expect(results.length).to.eql(1)

        return client.indexRemove(helper.namespace, 'example_name_whereWithExp')
      })



    })

    describe('negative tests', function () {

      it('fails on anything other than string or array type', async function () {

        try{
          client.expressionToBase64(10 as any)
          assert.fail("An error should have been caught!")
        }
        catch(error: any){
          expect(error.message).to.eql("Expression must be an array")
          expect(error instanceof TypeError).to.eql(true)
        }

      })

    })

  })

})
