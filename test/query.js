// *****************************************************************************
// Copyright 2013-2016 Aerospike, Inc.
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

/* global expect, describe, it, before, after, context */

const Aerospike = require('../lib/aerospike')
const helper = require('./test_helper')

const GeoJSON = Aerospike.GeoJSON
const filter = Aerospike.filter

const NUMERIC = Aerospike.indexDataType.NUMERIC
const STRING = Aerospike.indexDataType.STRING
const GEO2DSPHERE = Aerospike.indexDataType.GEO2DSPHERE
const LIST = Aerospike.indexType.LIST
const MAPVALUES = Aerospike.indexType.MAPVALUES
const MAPKEYS = Aerospike.indexType.MAPKEYS

const keygen = helper.keygen
const metagen = helper.metagen
const putgen = helper.putgen

describe('client.query()', function () {
  const client = helper.client

  const testSet = 'test/query-' + Math.floor(Math.random() * 100000)
  const samples = [
    { name: 'int match', i: 5 },
    { name: 'int non-match', i: 500 },
    { name: 'int list match', li: [1, 5, 9] },
    { name: 'int list non-match', li: [500, 501, 502] },
    { name: 'int map match', mi: {a: 1, b: 5, c: 9} },
    { name: 'int map non-match', mi: {a: 500, b: 501, c: 502} },
    { name: 'string match', s: 'banana' },
    { name: 'string non-match', s: 'tomato' },
    { name: 'string list match', ls: ['banana', 'blueberry'] },
    { name: 'string list non-match', ls: ['tomato', 'cuccumber'] },
    { name: 'string map match', ms: {a: 'banana', b: 'blueberry'} },
    { name: 'string map non-match', ms: {a: 'tomato', b: 'cuccumber'} },
    { name: 'string mapkeys match', mks: {'banana': 1, 'blueberry': 2} },
    { name: 'string mapkeys non-match', mks: {'tomato': 3, 'cuccumber': 4} },
    { name: 'point match', g: GeoJSON.Point(103.913, 1.308) },
    { name: 'point non-match', g: GeoJSON.Point(-122.101, 37.421) },
    { name: 'point list match', lg: [GeoJSON.Point(103.913, 1.308), GeoJSON.Point(105.913, 3.308)] },
    { name: 'point list non-match', lg: [GeoJSON.Point(-122.101, 37.421), GeoJSON.Point(-120.101, 39.421)] },
    { name: 'point map match', mg: {a: GeoJSON.Point(103.913, 1.308), b: GeoJSON.Point(105.913, 3.308)} },
    { name: 'point map non-match', mg: {a: GeoJSON.Point(-122.101, 37.421), b: GeoJSON.Point(-120.101, 39.421)} },
    { name: 'region match', g: GeoJSON.Polygon([102.913, 0.308], [102.913, 2.308], [104.913, 2.308], [104.913, 0.308], [102.913, 0.308]) },
    { name: 'region non-match', g: GeoJSON.Polygon([-121.101, 36.421], [-121.101, 38.421], [-123.101, 38.421], [-123.101, 36.421], [-121.101, 36.421]) },
    { name: 'region list match', lg: [GeoJSON.Polygon([102.913, 0.308], [102.913, 2.308], [104.913, 2.308], [104.913, 0.308], [102.913, 0.308])] },
    { name: 'region list non-match', lg: [GeoJSON.Polygon([-121.101, 36.421], [-121.101, 38.421], [-123.101, 38.421], [-123.101, 36.421], [-121.101, 36.421])] },
    { name: 'region map match', mg: {a: GeoJSON.Polygon([102.913, 0.308], [102.913, 2.308], [104.913, 2.308], [104.913, 0.308], [102.913, 0.308])} },
    { name: 'region map non-match', mg: [GeoJSON.Polygon([-121.101, 36.421], [-121.101, 38.421], [-123.101, 38.421], [-123.101, 36.421], [-121.101, 36.421])] },
    { name: 'aggregate', value: 10 },
    { name: 'aggregate', value: 20 },
    { name: 'aggregate', value: 30 }
  ]
  const numberOfSamples = samples.length
  const indexes = [
    ['qidxName', 'name', STRING],
    ['qidxInt', 'i', NUMERIC],
    ['qidxIntList', 'li', NUMERIC, LIST],
    ['qidxIntMap', 'mi', NUMERIC, MAPVALUES],
    ['qidxStr', 's', STRING],
    ['qidxStrList', 'ls', STRING, LIST],
    ['qidxStrMap', 'ms', STRING, MAPVALUES],
    ['qidxStrMapKeys', 'mks', STRING, MAPKEYS],
    ['qidxGeo', 'g', GEO2DSPHERE],
    ['qidxGeoList', 'lg', GEO2DSPHERE, LIST],
    ['qidxGeoMap', 'mg', GEO2DSPHERE, MAPVALUES]
  ]

  function verifyQueryResults (queryOptions, matchName, done) {
    var query = client.query(helper.namespace, testSet, queryOptions)
    var matches = 0
    var stream = query.execute()
    stream.on('error', function (error) { throw error })
    stream.on('data', function (rec) {
      expect(rec.bins).to.have.property('name', matchName)
      matches++
    })
    stream.on('end', function () {
      expect(matches).to.equal(1)
      done()
    })
  }

  before(function (done) {
    var sampleGen = function () {
      return samples.pop()
    }
    var kgen = keygen.string(helper.namespace, testSet, {prefix: 'test/query/'})
    var mgen = metagen.constant({ ttl: 300 })
    putgen.put(numberOfSamples, kgen, sampleGen, mgen, function (key, record) {
      if (!key) {
        helper.udf.register('aggregate.lua')
        helper.udf.register('scan.lua')
        indexes.forEach(function (idx) {
          helper.index.create(idx[0], testSet, idx[1], idx[2], idx[3])
        })
        done()
      }
    })
  })

  after(function (done) {
    helper.udf.remove('aggregate.lua')
    helper.udf.remove('scan.lua')
    indexes.forEach(function (idx) {
      helper.index.remove(idx[0])
    })
    done()
  })

  context('with filter predicate (query)', function () {
    describe('filter.equal()', function () {
      it('should match equal integer values', function (done) {
        var args = { filters: [filter.equal('i', 5)] }
        verifyQueryResults(args, 'int match', done)
      })

      it('should match equal string values', function (done) {
        var args = { filters: [filter.equal('s', 'banana')] }
        verifyQueryResults(args, 'string match', done)
      })
    })

    describe('filter.range()', function () {
      it('should match integers within a range', function (done) {
        var args = { filters: [filter.range('i', 3, 7)] }
        verifyQueryResults(args, 'int match', done)
      })

      it('should match integers in a list within a range', function (done) {
        var args = { filters: [filter.range('li', 3, 7, LIST)] }
        verifyQueryResults(args, 'int list match', done)
      })

      it('should match integers in a map within a range', function (done) {
        var args = { filters: [filter.range('mi', 3, 7, MAPVALUES)] }
        verifyQueryResults(args, 'int map match', done)
      })
    })

    describe('filter.contains()', function () {
      it('should match lists containing an integer', function (done) {
        var args = { filters: [filter.contains('li', 5, LIST)] }
        verifyQueryResults(args, 'int list match', done)
      })

      it('should match maps containing an integer value', function (done) {
        var args = { filters: [filter.contains('mi', 5, MAPVALUES)] }
        verifyQueryResults(args, 'int map match', done)
      })

      it('should match lists containing a string', function (done) {
        var args = { filters: [filter.contains('ls', 'banana', LIST)] }
        verifyQueryResults(args, 'string list match', done)
      })

      it('should match maps containing a string value', function (done) {
        var args = { filters: [filter.contains('ms', 'banana', MAPVALUES)] }
        verifyQueryResults(args, 'string map match', done)
      })

      it('should match maps containing a string key', function (done) {
        var args = { filters: [filter.contains('mks', 'banana', MAPKEYS)] }
        verifyQueryResults(args, 'string mapkeys match', done)
      })
    })

    describe('filter.geoWithinGeoJSONRegion()', function () {
      it('should match locations within a GeoJSON region', function (done) {
        var region = new GeoJSON({type: 'Polygon', coordinates: [[[103, 1.3], [104, 1.3], [104, 1.4], [103, 1.4], [103, 1.3]]]})
        var args = { filters: [filter.geoWithinGeoJSONRegion('g', region)] }
        verifyQueryResults(args, 'point match', done)
      })

      it('should match locations in a list within a GeoJSON region', function (done) {
        var region = new GeoJSON({type: 'Polygon', coordinates: [[[103, 1.3], [104, 1.3], [104, 1.4], [103, 1.4], [103, 1.3]]]})
        var args = { filters: [filter.geoWithinGeoJSONRegion('lg', region, LIST)] }
        verifyQueryResults(args, 'point list match', done)
      })

      it('should match locations in a map within a GeoJSON region', function (done) {
        var region = new GeoJSON({type: 'Polygon', coordinates: [[[103, 1.3], [104, 1.3], [104, 1.4], [103, 1.4], [103, 1.3]]]})
        var args = { filters: [filter.geoWithinGeoJSONRegion('mg', region, MAPVALUES)] }
        verifyQueryResults(args, 'point map match', done)
      })
    })

    describe('filter.geoWithinRadius()', function () {
      it('should match locations within a radius from another location', function (done) {
        var args = { filters: [filter.geoWithinRadius('g', 103.9135, 1.3085, 15000)] }
        verifyQueryResults(args, 'point match', done)
      })

      it('should match locations in a list within a radius from another location', function (done) {
        var args = { filters: [filter.geoWithinRadius('lg', 103.9135, 1.3085, 15000, LIST)] }
        verifyQueryResults(args, 'point list match', done)
      })

      it('should match locations in a map within a radius from another location', function (done) {
        var args = { filters: [filter.geoWithinRadius('mg', 103.9135, 1.3085, 15000, MAPVALUES)] }
        verifyQueryResults(args, 'point map match', done)
      })
    })

    describe('filter.geoContainsGeoJSONPoint()', function () {
      it('should match regions that contain a GeoJSON point', function (done) {
        var point = new GeoJSON({type: 'Point', coordinates: [103.913, 1.308]})
        var args = { filters: [filter.geoContainsGeoJSONPoint('g', point)] }
        verifyQueryResults(args, 'region match', done)
      })

      it('should match regions in a list that contain a GeoJSON point', function (done) {
        var point = new GeoJSON({type: 'Point', coordinates: [103.913, 1.308]})
        var args = { filters: [filter.geoContainsGeoJSONPoint('lg', point, LIST)] }
        verifyQueryResults(args, 'region list match', done)
      })

      it('should match regions in a map that contain a GeoJSON point', function (done) {
        var point = new GeoJSON({type: 'Point', coordinates: [103.913, 1.308]})
        var args = { filters: [filter.geoContainsGeoJSONPoint('mg', point, MAPVALUES)] }
        verifyQueryResults(args, 'region map match', done)
      })
    })

    describe('filter.geoContainsPoint()', function () {
      it('should match regions that contain a lng/lat coordinate pair', function (done) {
        var args = { filters: [filter.geoContainsPoint('g', 103.913, 1.308)] }
        verifyQueryResults(args, 'region match', done)
      })

      it('should match regions in a list that contain a lng/lat coordinate pair', function (done) {
        var args = { filters: [filter.geoContainsPoint('lg', 103.913, 1.308, LIST)] }
        verifyQueryResults(args, 'region list match', done)
      })

      it('should match regions in a map that contain a lng/lat coordinate pair', function (done) {
        var args = { filters: [filter.geoContainsPoint('mg', 103.913, 1.308, MAPVALUES)] }
        verifyQueryResults(args, 'region map match', done)
      })
    })

    context('with UDF aggregation', function () {
      it('should query on an index and apply aggregation user defined function', function (done) {
        var args = {
          filters: [filter.equal('name', 'aggregate')],
          aggregationUDF: {module: 'aggregate', funcname: 'sum_test_bin'}
        }
        var query = client.query(helper.namespace, testSet, args)

        var count = 0
        var stream = query.execute()
        stream.on('error', function (error) { throw error })
        stream.on('data', function (result) {
          expect(result).to.equal(60)
          count++
        })
        stream.on('end', function () {
          expect(count).to.equal(1)
          done()
        })
      })
    })
  })

  context('without filter predicate (legacy scan interface)', function () {
    it('should scan all the records', function (done) {
      var query = client.query(helper.namespace, testSet)

      var count = 0
      var stream = query.execute()
      stream.on('error', function (error) { throw error })
      stream.on('data', function (rec) {
        count++
      })
      stream.on('end', function (end) {
        expect(count).to.equal(numberOfSamples)
        done()
      })
    })

    context('with nobins set to true', function () {
      it('should return only meta data', function (done) {
        var args = {nobins: true}
        var query = client.query(helper.namespace, testSet, args)

        var stream = query.execute()
        stream.on('error', function (error) { throw error })
        stream.on('data', function (rec) {
          expect(rec.bins).to.be.empty()
        })
        stream.on('end', function () {
          done()
        })
      })
    })

    context('with bin selection', function () {
      it('should return only selected bins', function (done) {
        var args = {select: ['name']}
        var query = client.query(helper.namespace, testSet, args)

        var stream = query.execute()
        stream.on('error', function (error) { throw error })
        stream.on('data', function (rec) {
          expect(rec.bins).to.only.have.keys('name')
        })
        stream.on('end', function () {
          done()
        })
      })
    })

    context('background scans', function () {
      it('should do a scan background and check for the status of scan job ', function (done) {
        var args = {UDF: {module: 'scan', funcname: 'createBin', args: ['x', 'x']}}
        var backgroundScan = client.query(helper.namespace, testSet, args)

        var stream = backgroundScan.execute()
        stream.on('error', function (error) { throw error })
        stream.on('end', function (scanId) {
          var interval = setInterval(function () {
            backgroundScan.info(scanId, function (scanJobStats) {
              if (scanJobStats.status === Aerospike.scanStatus.COMPLETED) {
                clearInterval(interval)
                done()
              }
            })
          }, 100)
        })
      })
    })
  })
})
