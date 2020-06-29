// *****************************************************************************
// Copyright 2013-2020 Aerospike, Inc.
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
const Query = require('../lib/query')
const Job = require('../lib/job')
const helper = require('./test_helper')

const AerospikeError = Aerospike.AerospikeError
const GeoJSON = Aerospike.GeoJSON
const Key = Aerospike.Key
const filter = Aerospike.filter
const op = Aerospike.operations

const NUMERIC = Aerospike.indexDataType.NUMERIC
const STRING = Aerospike.indexDataType.STRING
const GEO2DSPHERE = Aerospike.indexDataType.GEO2DSPHERE
const LIST = Aerospike.indexType.LIST
const MAPVALUES = Aerospike.indexType.MAPVALUES
const MAPKEYS = Aerospike.indexType.MAPKEYS

const keygen = helper.keygen
const metagen = helper.metagen
const putgen = helper.putgen

describe('Queries', function () {
  const client = helper.client

  const testSet = 'test/query-' + Math.floor(Math.random() * 100000)
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
    { name: 'point map match', mg: { a: GeoJSON.Point(103.913, 1.308), b: GeoJSON.Point(105.913, 3.308) } },
    { name: 'point map non-match', mg: { a: GeoJSON.Point(-122.101, 37.421), b: GeoJSON.Point(-120.101, 39.421) } },
    { name: 'region match', g: GeoJSON.Polygon([102.913, 0.308], [102.913, 2.308], [104.913, 2.308], [104.913, 0.308], [102.913, 0.308]) },
    { name: 'region non-match', g: GeoJSON.Polygon([-121.101, 36.421], [-121.101, 38.421], [-123.101, 38.421], [-123.101, 36.421], [-121.101, 36.421]) },
    { name: 'region list match', lg: [GeoJSON.Polygon([102.913, 0.308], [102.913, 2.308], [104.913, 2.308], [104.913, 0.308], [102.913, 0.308])] },
    { name: 'region list non-match', lg: [GeoJSON.Polygon([-121.101, 36.421], [-121.101, 38.421], [-123.101, 38.421], [-123.101, 36.421], [-121.101, 36.421])] },
    { name: 'region map match', mg: { a: GeoJSON.Polygon([102.913, 0.308], [102.913, 2.308], [104.913, 2.308], [104.913, 0.308], [102.913, 0.308]) } },
    { name: 'region map non-match', mg: [GeoJSON.Polygon([-121.101, 36.421], [-121.101, 38.421], [-123.101, 38.421], [-123.101, 36.421], [-121.101, 36.421])] },
    { name: 'aggregate', value: 10 },
    { name: 'aggregate', value: 20 },
    { name: 'aggregate', value: 30 },
    { name: 'filter', value: 1 },
    { name: 'filter', value: 2 },
    { name: 'filter', value: 3 },
    { name: 'filter', value: 4 }
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
  let keys = []

  function verifyQueryResults (queryOptions, matchName, done) {
    var query = client.query(helper.namespace, testSet, queryOptions)
    var matches = 0
    var stream = query.foreach()
    stream.on('error', error => { throw error })
    stream.on('data', record => {
      expect(record.bins).to.have.property('name', matchName)
      matches++
    })
    stream.on('end', function () {
      expect(matches).to.equal(1)
      done()
    })
  }

  before(() => {
    const generators = {
      keygen: keygen.string(helper.namespace, testSet, { prefix: 'test/query/', random: false }),
      recgen: () => samples.pop(),
      metagen: metagen.constant({ ttl: 300 })
    }
    return Promise.all([
      putgen.put(numberOfSamples, generators)
        .then((records) => { keys = records.map((rec) => rec.key) })
        .then(() => Promise.all(indexes.map(idx =>
          helper.index.create(idx[0], testSet, idx[1], idx[2], idx[3])))),
      helper.udf.register('udf.lua')
    ])
  })

  after(() => helper.udf.remove('udf.lua')
    .then(() => Promise.all(indexes.map(idx =>
      helper.index.remove(idx[0])))))

  describe('client.query()', function () {
    it('creates a new Query instance and sets up it\'s properties', function () {
      var namespace = 'test'
      var set = 'demo'
      var options = {
        select: ['a', 'b', 'c'],
        nobins: false,
        filters: [Aerospike.filter.equal('a', 9)]
      }
      var query = client.query(namespace, set, options)

      expect(query).to.be.instanceof(Query)
      expect(query.ns).to.equal('test')
      expect(query.set).to.equal('demo')
      expect(query.selected).to.eql(['a', 'b', 'c'])
      expect(query.nobins).to.be.false()
      expect(query.filters).to.be.instanceof(Array)
      expect(query.filters.length).to.equal(1)
    })

    it('creates a query without specifying the set', function () {
      var namespace = 'test'
      var query = client.query(namespace, { select: ['i'] })
      expect(query).to.be.instanceof(Query)
      expect(query.ns).to.equal('test')
      expect(query.set).to.be.null()
      expect(query.selected).to.eql(['i'])
    })
  })

  describe('query.select()', function () {
    it('sets the selected bins from an argument list', function () {
      var query = client.query('test', 'test')
      query.select('a', 'b', 'c')
      expect(query.selected).to.eql(['a', 'b', 'c'])
    })

    it('sets the selected bins from an array', function () {
      var query = client.query('test', 'test')
      query.select(['a', 'b', 'c'])
      expect(query.selected).to.eql(['a', 'b', 'c'])
    })
  })

  describe('query.where()', function () {
    it('adds a filter predicate to the query', function () {
      var query = client.query('test', 'test')
      query.where(Aerospike.filter.equal('a', 9))
      expect(query.filters.length).to.equal(1)
    })
  })

  describe('query.foreach() #slow', function () {
    it('should apply a stream UDF to filter the results', function (done) {
      var args = {
        filters: [filter.equal('name', 'filter')]
      }
      var query = client.query(helper.namespace, testSet, args)
      query.setUdf('udf', 'even')
      var stream = query.foreach()
      var results = []
      stream.on('error', error => { throw error })
      stream.on('data', record => results.push(record.bins))
      stream.on('end', () => {
        expect(results.sort()).to.eql([2, 4])
        done()
      })
    })

    it('returns the key if it was stored on the server', function (done) {
      const uniqueKey = 'test/query/record_with_stored_key'
      const key = new Aerospike.Key(helper.namespace, testSet, uniqueKey)
      const record = { name: uniqueKey }
      const meta = { ttl: 300 }
      const policy = new Aerospike.WritePolicy({
        key: Aerospike.policy.key.SEND
      })

      client.put(key, record, meta, policy, function (err) {
        if (err) throw err
        var query = client.query(helper.namespace, testSet)
        query.where(Aerospike.filter.equal('name', uniqueKey))
        var stream = query.foreach()
        var count = 0
        stream.on('data', record => {
          expect(++count).to.equal(1)
          expect(record.key).to.be.instanceof(Key)
          expect(record.key.key).to.equal(uniqueKey)
        })
        stream.on('end', done)
      })
    })

    context('with nobins set to true', function () {
      helper.skipUnlessVersion('>= 3.15.0', this)

      it('should return only meta data', function (done) {
        var query = client.query(helper.namespace, testSet)
        query.where(Aerospike.filter.equal('i', 5))
        query.nobins = true
        var received = null
        var stream = query.foreach()
        stream.on('error', error => { throw error })
        stream.on('data', record => {
          received = record
          stream.abort()
        })
        stream.on('end', () => {
          expect(received.bins).to.be.empty()
          expect(received.gen).to.be.ok()
          expect(received.ttl).to.be.ok()
          done()
        })
      })
    })

    it('should raise client errors asynchronously', function (done) {
      const invalidPolicy = new Aerospike.QueryPolicy({
        totalTimeout: 'not a valid timeout'
      })

      const query = client.query('test')
      const stream = query.foreach(invalidPolicy)
      // if error is raised synchronously we will never reach here
      stream.on('error', error => {
        expect(error).to.be.instanceof(AerospikeError).with.property('code', Aerospike.status.ERR_PARAM)
        done()
      })
    })

    it('attaches event handlers to the stream', function (done) {
      const query = client.query(helper.namespace, testSet)
      let dataHandlerCalled = false
      const stream = query.foreach(null,
        (_record) => {
          dataHandlerCalled = true
          stream.abort()
        },
        (error) => { throw error },
        () => {
          expect(dataHandlerCalled).to.be.true()
          done()
        })
    })

    context('filter predicates', function () {
      describe('filter.equal()', function () {
        it('should match equal integer values', function (done) {
          var args = { filters: [filter.equal('i', 5)] }
          verifyQueryResults(args, 'int match', done)
        })

        it('should match equal string values', function (done) {
          var args = { filters: [filter.equal('s', 'banana')] }
          verifyQueryResults(args, 'string match', done)
        })

        it('throws a type error if the comparison value is of invalid type', function () {
          const fn = () => filter.equal('str', { foo: 'bar' })
          expect(fn).to.throw(TypeError)
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

        it('throws a type error if the comparison value is of invalid type', function () {
          const fn = () => filter.contains('list', { foo: 'bar' }, LIST)
          expect(fn).to.throw(TypeError)
        })
      })

      describe('filter.geoWithinGeoJSONRegion()', function () {
        it('should match locations within a GeoJSON region', function (done) {
          var region = new GeoJSON({ type: 'Polygon', coordinates: [[[103, 1.3], [104, 1.3], [104, 1.4], [103, 1.4], [103, 1.3]]] })
          var args = { filters: [filter.geoWithinGeoJSONRegion('g', region)] }
          verifyQueryResults(args, 'point match', done)
        })

        it('should match locations in a list within a GeoJSON region', function (done) {
          var region = new GeoJSON({ type: 'Polygon', coordinates: [[[103, 1.3], [104, 1.3], [104, 1.4], [103, 1.4], [103, 1.3]]] })
          var args = { filters: [filter.geoWithinGeoJSONRegion('lg', region, LIST)] }
          verifyQueryResults(args, 'point list match', done)
        })

        it('should match locations in a map within a GeoJSON region', function (done) {
          var region = new GeoJSON({ type: 'Polygon', coordinates: [[[103, 1.3], [104, 1.3], [104, 1.4], [103, 1.4], [103, 1.3]]] })
          var args = { filters: [filter.geoWithinGeoJSONRegion('mg', region, MAPVALUES)] }
          verifyQueryResults(args, 'point map match', done)
        })

        it('accepts a plain object as GeoJSON', function (done) {
          var region = { type: 'Polygon', coordinates: [[[103, 1.3], [104, 1.3], [104, 1.4], [103, 1.4], [103, 1.3]]] }
          var args = { filters: [filter.geoWithinGeoJSONRegion('g', region)] }
          verifyQueryResults(args, 'point match', done)
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
          var point = new GeoJSON({ type: 'Point', coordinates: [103.913, 1.308] })
          var args = { filters: [filter.geoContainsGeoJSONPoint('g', point)] }
          verifyQueryResults(args, 'region match', done)
        })

        it('should match regions in a list that contain a GeoJSON point', function (done) {
          var point = new GeoJSON({ type: 'Point', coordinates: [103.913, 1.308] })
          var args = { filters: [filter.geoContainsGeoJSONPoint('lg', point, LIST)] }
          verifyQueryResults(args, 'region list match', done)
        })

        it('should match regions in a map that contain a GeoJSON point', function (done) {
          var point = new GeoJSON({ type: 'Point', coordinates: [103.913, 1.308] })
          var args = { filters: [filter.geoContainsGeoJSONPoint('mg', point, MAPVALUES)] }
          verifyQueryResults(args, 'region map match', done)
        })

        it('accepts a plain object as GeoJSON', function (done) {
          var point = { type: 'Point', coordinates: [103.913, 1.308] }
          var args = { filters: [filter.geoContainsGeoJSONPoint('g', point)] }
          verifyQueryResults(args, 'region match', done)
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
    })
  })

  describe('query.results()', function () {
    it('returns a Promise that resolves into the query results', function () {
      const query = client.query(helper.namespace, testSet)
      query.where(filter.equal('i', 5))

      return query.results().then(records => {
        expect(records.length).to.eq(1)
        expect(records[0].bins.name).to.eq('int match')
      })
    })

    context('with QueryPolicy', function () {
      context('with deserialize: false', function () {
        const policy = new Aerospike.QueryPolicy({
          deserialize: false
        })

        it('returns lists and maps as byte buffers', function () {
          const query = client.query(helper.namespace, testSet)
          query.where(filter.equal('name', 'int list match'))

          return query.results(policy)
            .then(records => {
              expect(records.length).to.eq(1)
              expect(records[0].bins.li).to.eql(Buffer.from([0x93, 0x01, 0x05, 0x09]))
            })
        })
      })
    })
  })

  describe('query.apply()', function () {
    it('should apply a user defined function and aggregate the results', function (done) {
      var args = {
        filters: [filter.equal('name', 'aggregate')]
      }
      var query = client.query(helper.namespace, testSet, args)
      query.apply('udf', 'count', function (error, result) {
        if (error) throw error
        expect(result).to.equal(3)
        done()
      })
    })

    it('should apply a user defined function with arguments and aggregate the results', function (done) {
      var args = {
        filters: [filter.equal('name', 'aggregate')]
      }
      var query = client.query(helper.namespace, testSet, args)
      query.apply('udf', 'countGreaterThan', ['value', 15], function (error, result) {
        if (error) throw error
        expect(result).to.equal(2)
        done()
      })
    })

    it('returns a Promise that resolves to the result of the aggregation', function () {
      const args = {
        filters: [filter.equal('name', 'aggregate')]
      }
      const query = client.query(helper.namespace, testSet, args)
      return query.apply('udf', 'count')
        .then(result => {
          expect(result).to.equal(3)
        })
    })
  })

  describe('query.background()', function () {
    it('should run a background query and return a job', function (done) {
      var args = {
        filters: [filter.equal('name', 'aggregate')]
      }
      var query = client.query(helper.namespace, testSet, args)
      query.background('udf', 'noop', function (error, job) {
        if (error) throw error
        expect(job).to.be.instanceof(Job)
        done()
      })
    })

    it('returns a Promise that resolves to a Job', function () {
      const args = {
        filters: [filter.equal('name', 'aggregate')]
      }
      const query = client.query(helper.namespace, testSet, args)
      return query.background('udf', 'noop')
        .then(job => {
          expect(job).to.be.instanceof(Job)
        })
    })
  })

  describe('query.operate()', function () {
    helper.skipUnlessVersion('>= 4.7.0', this)

    it('should perform a background query that executes the operations', async function () {
      const query = client.query(helper.namespace, testSet)
      const ops = [op.incr('backgroundOps', 1)]
      const job = await query.operate(ops)
      await job.waitUntilDone()

      const key = keys[Math.floor(Math.random() * keys.length)]
      const record = await client.get(key)
      expect(record.bins.backgroundOps).to.equal(1)
    })
  })

  describe('stream.abort()', function () {
    it('should stop the query when the stream is aborted', function (done) {
      const query = client.query(helper.namespace, testSet)
      const stream = query.foreach()
      let recordsReceived = 0
      stream.on('data', () => {
        recordsReceived++
        if (recordsReceived === 5) {
          stream.abort()
        }
      })
      stream.on('end', () => {
        expect(recordsReceived).to.equal(5)
        done()
      })
    })
  })

  context('legacy scan interface', function () {
    ;['UDF', 'concurrent', 'percentage', 'priority'].forEach(function (key) {
      it('should throw an exception if the query options contain key "' + key + '"', function () {
        var args = {}
        args[key] = 'foo'
        expect(() => client.query(helper.namespace, testSet, args)).to.throw('Invalid query arguments')
      })
    })
  })
})
