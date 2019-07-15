// *****************************************************************************
// Copyright 2018-2019 Aerospike, Inc.
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
const AerospikeError = Aerospike.AerospikeError
const GeoJSON = Aerospike.GeoJSON
const predexp = Aerospike.predexp

const helper = require('./test_helper')
const keygen = helper.keygen
const metagen = helper.metagen
const putgen = helper.putgen

describe('Aerospike.predexp #slow', function () {
  const client = helper.client

  const testSet = 'test/predexp-' + Math.floor(Math.random() * 100000)
  const samples = [
    { name: 'int match', i: 5 },
    { name: 'int non-match', i: 500 },
    { name: 'int list match', li: [1, 5, 9] },
    { name: 'int list non-match', li: [500, 501, 502] },
    { name: 'int map match', mi: { a: 1, b: 5, c: 9 } },
    { name: 'int map non-match', mi: { a: 500, b: 501, c: 502 } },
    { name: 'string match', s: 'banana' },
    { name: 'string non-match', s: 'tomato' },
    { name: 'string list match', ls: ['banana', 'blueberry'] },
    { name: 'string list non-match', ls: ['tomato', 'cuccumber'] },
    { name: 'string map match', ms: { a: 'banana', b: 'blueberry' } },
    { name: 'string map non-match', ms: { a: 'tomato', b: 'cuccumber' } },
    { name: 'string mapkeys match', mks: { banana: 1, blueberry: 2 } },
    { name: 'string mapkeys non-match', mks: { tomato: 3, cuccumber: 4 } },
    { name: 'point match', g: GeoJSON.Point(103.913, 1.308) },
    { name: 'point non-match', g: GeoJSON.Point(-122.101, 37.421) },
    { name: 'point list match', lg: [GeoJSON.Point(103.913, 1.308), GeoJSON.Point(105.913, 3.308)] },
    { name: 'point list non-match', lg: [GeoJSON.Point(-122.101, 37.421), GeoJSON.Point(-120.101, 39.421)] },
    { name: 'region match', g: GeoJSON.Polygon([102.913, 0.308], [102.913, 2.308], [104.913, 2.308], [104.913, 0.308], [102.913, 0.308]) },
    { name: 'region non-match', g: GeoJSON.Polygon([-121.101, 36.421], [-121.101, 38.421], [-123.101, 38.421], [-123.101, 36.421], [-121.101, 36.421]) }
  ]

  before(() => {
    const entries = samples.entries()
    const rgen = () => entries.next().value[1]
    const kgen = keygen.string(helper.namespace, testSet, { prefix: 'test/predexp/', random: false })
    const mgen = metagen.constant({ ttl: 300 })
    return putgen.put(samples.length, kgen, rgen, mgen)
  })

  function timeNanos (diff) {
    diff |= 0
    return (Date.now() + diff * 1e3) * 1e6
  }

  context('invalid predicate expressions', function () {
    it('raises a server error if passed multiple top-level predexps', function () {
      const query = client.query(helper.namespace, testSet)
      query.where([
        predexp.integerBin('i'),
        predexp.integerValue(5),
        predexp.integerEqual(),
        predexp.stringBin('s'),
        predexp.stringValue('banana'),
        predexp.stringEqual()
      ])

      return query.results()
        .then(() => 'no error raised')
        .catch(error => error)
        .then(error => {
          expect(error)
            .to.be.instanceof(AerospikeError)
            .with.property('code', Aerospike.status.ERR_REQUEST_INVALID)
        })
    })

    it('raises a server error if passed a top-level predexp value node', function () {
      const query = client.query(helper.namespace, testSet)
      query.where([
        predexp.integerBin('i')
      ])

      return query.results()
        .then(() => 'no error raised')
        .catch(error => error)
        .then(error => {
          expect(error)
            .to.be.instanceof(AerospikeError)
            .with.property('code', Aerospike.status.ERR_REQUEST_INVALID)
        })
    })

    it('raises a server error if passed a missed child predexp', function () {
      const query = client.query(helper.namespace, testSet)
      query.where([
        predexp.integerBin('i'),
        predexp.integerEqual()
      ])

      return query.results()
        .then(() => 'no error raised')
        .catch(error => error)
        .then(error => {
          expect(error)
            .to.be.instanceof(AerospikeError)
            .with.property('code', Aerospike.status.ERR_REQUEST_INVALID)
        })
    })
  })

  describe('.integerEqual', function () {
    it('matches an integer bin to an integer value', function () {
      const query = client.query(helper.namespace, testSet)
      query.where([
        predexp.integerBin('i'),
        predexp.integerValue(5),
        predexp.integerEqual()
      ])

      return query.results().then(results => {
        expect(results.length).to.eq(1)
        expect(results[0].bins.name).to.eq('int match')
      })
    })
  })

  describe('.integerUnequal', function () {
    it('matches an integer bin to an integer value', function () {
      const query = client.query(helper.namespace, testSet)
      query.where([
        predexp.integerBin('i'),
        predexp.integerValue(5),
        predexp.integerUnequal()
      ])

      return query.results().then(results => {
        expect(results).to.not.be.empty()
        expect(!results.some(rec => rec.bins.i === 5)).to.be.true()
      })
    })
  })

  describe('.integerGreater', function () {
    it('matches an integer bin to an integer value', function () {
      const query = client.query(helper.namespace, testSet)
      query.where([
        predexp.integerBin('i'),
        predexp.integerValue(5),
        predexp.integerGreater()
      ])

      return query.results().then(results => {
        expect(results).to.not.be.empty()
        expect(results.every(rec => rec.bins.i > 5)).to.be.true()
      })
    })
  })

  describe('.integerGreaterEq', function () {
    it('matches an integer bin to an integer value', function () {
      const query = client.query(helper.namespace, testSet)
      query.where([
        predexp.integerBin('i'),
        predexp.integerValue(5),
        predexp.integerGreaterEq()
      ])

      return query.results().then(results => {
        expect(results).to.not.be.empty()
        expect(results.every(rec => rec.bins.i >= 5)).to.be.true()
      })
    })
  })

  describe('.integerLess', function () {
    it('matches an integer bin to an integer value', function () {
      const query = client.query(helper.namespace, testSet)
      query.where([
        predexp.integerBin('i'),
        predexp.integerValue(500),
        predexp.integerLess()
      ])

      return query.results().then(results => {
        expect(results).to.not.be.empty()
        expect(results.every(rec => rec.bins.i < 500)).to.be.true()
      })
    })
  })

  describe('.integerLessEq', function () {
    it('matches an integer bin to an integer value', function () {
      const query = client.query(helper.namespace, testSet)
      query.where([
        predexp.integerBin('i'),
        predexp.integerValue(500),
        predexp.integerLessEq()
      ])

      return query.results().then(results => {
        expect(results).to.not.be.empty()
        expect(results.every(rec => rec.bins.i <= 500)).to.be.true()
      })
    })
  })

  describe('.stringEqual', function () {
    it('matches a string bin to a string value', function () {
      const query = client.query(helper.namespace, testSet)
      query.where([
        predexp.stringBin('s'),
        predexp.stringValue('banana'),
        predexp.stringEqual()
      ])

      return query.results().then(results => {
        expect(results.length).to.eq(1)
        expect(results[0].bins.name).to.eq('string match')
      })
    })
  })

  describe('.stringUnequal', function () {
    it('matches a string bin to a string value', function () {
      const query = client.query(helper.namespace, testSet)
      query.where([
        predexp.stringBin('s'),
        predexp.stringValue('banana'),
        predexp.stringUnequal()
      ])

      return query.results().then(results => {
        expect(results).to.not.be.empty()
        expect(!results.some(rec => rec.bins.s === 'banana')).to.true()
      })
    })
  })

  describe('.stringRegex', function () {
    it('matches a string bin against a regular expression', function () {
      const query = client.query(helper.namespace, testSet)
      query.where([
        predexp.stringBin('s'),
        predexp.stringValue('(AN){2,}'),
        predexp.stringRegex(Aerospike.regex.EXTENDED | Aerospike.regex.ICASE)
      ])

      return query.results().then(results => {
        expect(results.length).to.eq(1)
        expect(results[0].bins.s).to.eq('banana')
      })
    })
  })

  describe('.geojsonWithin', function () {
    it('matches a GeoJSON bin against a GeoJSON value', function () {
      const query = client.query(helper.namespace, testSet)
      query.where([
        predexp.geojsonBin('g'),
        predexp.geojsonValue(GeoJSON.Polygon([103, 1.3], [104, 1.3], [104, 1.4], [103, 1.4], [103, 1.3])),
        predexp.geojsonWithin()
      ])

      return query.results().then(results => {
        expect(results.length).to.eq(1)
        expect(results[0].bins.name).to.eq('point match')
      })
    })
  })

  describe('.geojsonContains', function () {
    it('matches a GeoJSON bin against a GeoJSON value', function () {
      const query = client.query(helper.namespace, testSet)
      query.where([
        predexp.geojsonBin('g'),
        predexp.geojsonValue(GeoJSON.Point(103.913, 1.308)),
        predexp.geojsonContains()
      ])

      return query.results().then(results => {
        expect(results.length).to.eq(1)
        expect(results[0].bins.name).to.eq('region match')
      })
    })
  })

  describe('.listIterateOr', function () {
    it('matches any list element using integer equality', function () {
      const query = client.query(helper.namespace, testSet)
      query.where([
        predexp.integerVar('element'),
        predexp.integerValue(5),
        predexp.integerEqual(),
        predexp.listBin('li'),
        predexp.listIterateOr('element')
      ])

      return query.results().then(results => {
        expect(results.length).to.eq(1)
        expect(results[0].bins.name).to.eq('int list match')
      })
    })

    it('matches any list element using point-in-region', function () {
      this.skip('AER-5867 - not supported by server')

      const query = client.query(helper.namespace, testSet)
      query.where([
        predexp.geojsonVar('point'),
        predexp.geojsonValue(GeoJSON.Circle(103.913, 1.308, 30000)),
        predexp.geojsonWithin(),
        predexp.listBin('lg'),
        predexp.listIterateOr('point')
      ])

      return query.results().then(results => {
        expect(results.length).to.eq(1)
        expect(results[0].bins.name).to.eq('point list match')
      })
    })
  })

  describe('.listIterateAnd', function () {
    it('matches all list element', function () {
      const query = client.query(helper.namespace, testSet)
      query.where([
        predexp.stringValue('tomato'),
        predexp.stringVar('item'),
        predexp.stringUnequal(),
        predexp.listBin('ls'),
        predexp.listIterateAnd('item')
      ])

      return query.results().then(results => {
        expect(results.length).to.eq(1)
        expect(results[0].bins.name).to.eq('string list match')
      })
    })
  })

  describe('.mapValIterateOr', function () {
    it('matches any map element by value', function () {
      const query = client.query(helper.namespace, testSet)
      query.where([
        predexp.integerValue(5),
        predexp.integerVar('item'),
        predexp.integerEqual(),
        predexp.mapBin('mi'),
        predexp.mapValIterateOr('item')
      ])

      return query.results().then(results => {
        expect(results.length).to.eq(1)
        expect(results[0].bins.name).to.eq('int map match')
      })
    })
  })

  describe('.mapValIterateAnd', function () {
    it('matches all map elements by value', function () {
      const query = client.query(helper.namespace, testSet)
      query.where([
        predexp.stringValue('tomato'),
        predexp.stringVar('item'),
        predexp.stringUnequal(),
        predexp.mapBin('ms'),
        predexp.mapValIterateAnd('item')
      ])

      return query.results().then(results => {
        expect(results.length).to.eq(1)
        expect(results[0].bins.name).to.eq('string map match')
      })
    })
  })

  describe('.mapKeyIterateOr', function () {
    it('matches any map element by key', function () {
      const query = client.query(helper.namespace, testSet)
      query.where([
        predexp.stringValue('banana'),
        predexp.stringVar('item'),
        predexp.stringEqual(),
        predexp.mapBin('mks'),
        predexp.mapKeyIterateOr('item')
      ])

      return query.results().then(results => {
        expect(results.length).to.eq(1)
        expect(results[0].bins.name).to.eq('string mapkeys match')
      })
    })
  })

  describe('.mapKeyIterateAnd', function () {
    it('matches all map elements by key', function () {
      const query = client.query(helper.namespace, testSet)
      query.where([
        predexp.stringValue('tomato'),
        predexp.stringVar('item'),
        predexp.stringUnequal(),
        predexp.mapBin('mks'),
        predexp.mapKeyIterateAnd('item')
      ])

      return query.results().then(results => {
        expect(results.length).to.eq(1)
        expect(results[0].bins.name).to.eq('string mapkeys match')
      })
    })
  })

  describe('.recDeviceSize', function () {
    it('matches the record storage size', function () {
      const query = client.query(helper.namespace, testSet)
      query.where([
        predexp.recDeviceSize(),
        predexp.integerValue(0),
        predexp.integerGreaterEq()
      ])

      return query.results().then(results => {
        expect(results).to.not.be.empty()
      })
    })
  })

  describe('.recLastUpdate', function () {
    it('matches the record last update time', function () {
      const t1 = timeNanos(300)
      const t2 = timeNanos(-300)

      const query = client.query(helper.namespace, testSet)
      query.where([
        predexp.recLastUpdate(),
        predexp.integerValue(t1),
        predexp.integerLess(),
        predexp.recLastUpdate(),
        predexp.integerValue(t2),
        predexp.integerGreater(),
        predexp.and(2)
      ])

      return query.results().then(results => {
        expect(results.length).to.eq(samples.length)
      })
    })
  })

  describe('.recVoidTime', function () {
    it('matches the record void time time', function () {
      const t1 = timeNanos()
      const t2 = timeNanos(600)

      const query = client.query(helper.namespace, testSet)
      query.where([
        predexp.recVoidTime(),
        predexp.integerValue(t1),
        predexp.integerGreater(),
        predexp.recVoidTime(),
        predexp.integerValue(t2),
        predexp.integerLess(),
        predexp.and(2)
      ])

      return query.results().then(results => {
        expect(results.length).to.eq(samples.length)
      })
    })
  })

  describe('.recDigestModulo', function () {
    it('matches the record void time time', function () {
      const mod = 5
      const rem = 3

      const query = client.query(helper.namespace, testSet)
      query.where([
        predexp.recDigestModulo(mod),
        predexp.integerValue(rem),
        predexp.integerEqual()
      ])

      return query.results().then(results => {
        const digests = results.map(rec => rec.key.digest)
        expect(digests.every(
          // modulo is calculated from the last 4 bytes of the digest
          digest => digest.readUIntLE(16, 4) % mod === rem
        )).to.be.true()
      })
    })
  })

  describe('.and', function () {
    it('combines two predexp with a logical AND', function () {
      const query = client.query(helper.namespace, testSet)
      query.where([
        predexp.integerBin('i'),
        predexp.integerValue(5),
        predexp.integerEqual(),
        predexp.stringBin('name'),
        predexp.stringValue('int match'),
        predexp.stringEqual(),
        predexp.and(2)
      ])

      return query.results().then(results => {
        expect(results.length).to.eq(1)
        expect(results[0].bins.name).to.eq('int match')
      })
    })
  })

  describe('.or', function () {
    it('combines two predexp with a logical OR', function () {
      const query = client.query(helper.namespace, testSet)
      query.where([
        predexp.integerBin('i'),
        predexp.integerValue(5),
        predexp.integerEqual(),
        predexp.stringBin('s'),
        predexp.stringValue('banana'),
        predexp.stringEqual(),
        predexp.or(2)
      ])

      return query.results().then(results => {
        expect(results.length).to.eq(2)
        expect(results.map(rec => rec.bins.name).sort()).to.eql(['int match', 'string match'])
      })
    })
  })

  describe('.not', function () {
    it('combines two predexp with a logical AND', function () {
      const query = client.query(helper.namespace, testSet)
      query.where([
        predexp.integerBin('i'),
        predexp.integerValue(5),
        predexp.integerEqual(),
        predexp.not()
      ])

      return query.results().then(results => {
        expect(results).to.not.be.empty()
        expect(!results.some(rec => rec.bins.i === 5)).to.be.true()
      })
    })
  })
})
