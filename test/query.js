// *****************************************************************************
// Copyright 2013-2023 Aerospike, Inc.
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
/* eslint-disable no-unused-expressions */

const Aerospike = require('../lib/aerospike')
const Query = require('../lib/query')
const Job = require('../lib/job')
const helper = require('./test_helper')
const exp = Aerospike.exp
const Context = Aerospike.cdt.Context

const AerospikeError = Aerospike.AerospikeError
const GeoJSON = Aerospike.GeoJSON
const Key = Aerospike.Key
const filter = Aerospike.filter
const op = Aerospike.operations

const NUMERIC = Aerospike.indexDataType.NUMERIC
const STRING = Aerospike.indexDataType.STRING
const GEO2DSPHERE = Aerospike.indexDataType.GEO2DSPHERE
const BLOB = Aerospike.indexDataType.BLOB

const LIST = Aerospike.indexType.LIST
const MAPVALUES = Aerospike.indexType.MAPVALUES
const MAPKEYS = Aerospike.indexType.MAPKEYS

const keygen = helper.keygen
const metagen = helper.metagen
const putgen = helper.putgen
let samples

describe('Queries', function () {
  const client = helper.client

  const testSet = 'test/query-' + Math.floor(Math.random() * 100000)
  samples = [
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
    const query = client.query(helper.namespace, testSet, queryOptions)
    let matches = 0
    const stream = query.foreach()
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

    if (helper.cluster.isVersionInRange('>= 7.0.0')) {
      samples.push({ name: 'blob match', blob: Buffer.from('guava') })
      samples.push({ name: 'blob non-match', blob: Buffer.from('pumpkin') })
      samples.push({ name: 'blob list match', lblob: [Buffer.from('guava'), Buffer.from('papaya')] })
      samples.push({ name: 'blob list non-match', lblob: [Buffer.from('pumpkin'), Buffer.from('turnip')] })
      samples.push({ name: 'blob map match', mblob: { a: Buffer.from('guava'), b: Buffer.from('papaya') } })
      samples.push({ name: 'blob map non-match', mblob: { a: Buffer.from('pumpkin'), b: Buffer.from('turnip') } })
      samples.push({ name: 'blob mapkeys match', mkblob: new Map([[Buffer.from('guava'), 1], [Buffer.from('papaya'), 2]]) })
      samples.push({ name: 'blob mapkeys non-match', mkblob: new Map([[Buffer.from('pumpkin'), 3], [Buffer.from('turnip'), 4]]) })
      samples.push({ name: 'nested blob match', blob: { nested: Buffer.from('guava') } })
      samples.push({ name: 'nested blob non-match', blob: { nested: Buffer.from('pumpkin') } })
      samples.push({ name: 'nested blob list match', lblob: { nested: [Buffer.from('guava'), Buffer.from('papaya')] } })
      samples.push({ name: 'nested blob list non-match', lblob: { nested: [Buffer.from('pumpkin'), Buffer.from('turnip')] } })
      samples.push({ name: 'nested blob map match', mblob: { nested: { a: Buffer.from('guava'), b: Buffer.from('papaya') } } })
      samples.push({ name: 'nested blob map non-match', mblob: { nested: { a: Buffer.from('pumpkin'), b: Buffer.from('turnip') } } })
      samples.push({ name: 'nested blob mapkeys match', mkblob: { nested: new Map([[Buffer.from('guava'), 1], [Buffer.from('papaya'), 2]]) } })
      samples.push({ name: 'nested blob mapkeys non-match', mkblob: { nested: new Map([[Buffer.from('pumpkin'), 3], [Buffer.from('turnip'), 4]]) } })

      indexes.push(['qidxBlob', 'blob', BLOB])
      indexes.push(['qidxBlobList', 'lblob', BLOB, LIST])
      indexes.push(['qidxBlobMap', 'mblob', BLOB, MAPVALUES])
      indexes.push(['qidxBlobMapKeys', 'mkblob', BLOB, MAPKEYS])
      indexes.push(['qidxBlobListNested', 'lblob', BLOB, LIST, new Context().addMapKey('nested')])
      indexes.push(['qidxBlobMapNested', 'mblob', BLOB, MAPVALUES, new Context().addMapKey('nested')])
      indexes.push(['qidxBlobMapKeysNested', 'mkblob', BLOB, MAPKEYS, new Context().addMapKey('nested')])
    }

    if (helper.cluster.isVersionInRange('>= 6.1.0')) {
      samples.push({ name: 'nested int list match', li: { nested: [1, 5, 9] } })
      samples.push({ name: 'nested int list non-match', li: { nested: [500, 501, 502] } })
      samples.push({ name: 'nested int map match', mi: { nested: { a: 1, b: 5, c: 9 } } })
      samples.push({ name: 'nested int map non-match', mi: { nested: { a: 500, b: 501, c: 502 } } })
      samples.push({ name: 'nested string list match', ls: { nested: ['banana', 'blueberry'] } })
      samples.push({ name: 'nested string list non-match', ls: { nested: ['tomato', 'cuccumber'] } })
      samples.push({ name: 'nested string map match', ms: { nested: { a: 'banana', b: 'blueberry' } } })
      samples.push({ name: 'nested string map non-match', ms: { nested: { a: 'tomato', b: 'cuccumber' } } })
      samples.push({ name: 'nested string mapkeys match', mks: { nested: { banana: 1, blueberry: 2 } } })
      samples.push({ name: 'nested string mapkeys non-match', mks: { nested: { tomato: 3, cuccumber: 4 } } })
      samples.push({ name: 'nested point match', g: { nested: GeoJSON.Point(103.913, 1.308) } })
      samples.push({ name: 'nested point non-match', g: { nested: GeoJSON.Point(-122.101, 37.421) } })
      samples.push({ name: 'nested point list match', lg: { nested: [GeoJSON.Point(103.913, 1.308), GeoJSON.Point(105.913, 3.308)] } })
      samples.push({ name: 'nested point list non-match', lg: { nested: [GeoJSON.Point(-122.101, 37.421), GeoJSON.Point(-120.101, 39.421)] } })
      samples.push({ name: 'nested point map match', mg: { nested: { a: GeoJSON.Point(103.913, 1.308), b: GeoJSON.Point(105.913, 3.308) } } })
      samples.push({ name: 'nested point map non-match', mg: { nested: { a: GeoJSON.Point(-122.101, 37.421), b: GeoJSON.Point(-120.101, 39.421) } } })
      samples.push({ name: 'nested region match', g: { nested: GeoJSON.Polygon([102.913, 0.308], [102.913, 2.308], [104.913, 2.308], [104.913, 0.308], [102.913, 0.308]) } })
      samples.push({ name: 'nested region non-match', g: { nested: GeoJSON.Polygon([-121.101, 36.421], [-121.101, 38.421], [-123.101, 38.421], [-123.101, 36.421], [-121.101, 36.421]) } })
      samples.push({ name: 'nested region list match', lg: { nested: [GeoJSON.Polygon([102.913, 0.308], [102.913, 2.308], [104.913, 2.308], [104.913, 0.308], [102.913, 0.308])] } })
      samples.push({ name: 'nested region list non-match', lg: { nested: [GeoJSON.Polygon([-121.101, 36.421], [-121.101, 38.421], [-123.101, 38.421], [-123.101, 36.421], [-121.101, 36.421])] } })
      samples.push({ name: 'nested region map match', mg: { nested: { a: GeoJSON.Polygon([102.913, 0.308], [102.913, 2.308], [104.913, 2.308], [104.913, 0.308], [102.913, 0.308]) } } })
      samples.push({ name: 'nested region map non-match', mg: { nested: [GeoJSON.Polygon([-121.101, 36.421], [-121.101, 38.421], [-123.101, 38.421], [-123.101, 36.421], [-121.101, 36.421])] } })
      samples.push({ name: 'nested aggregate', nested: { value: 10 } })
      samples.push({ name: 'nested aggregate', nested: { value: 20 } })
      samples.push({ name: 'nested aggregate', nested: { value: 30 } })
      samples.push({ name: 'nested aggregate', nested: { doubleNested: { value: 10 } } })
      samples.push({ name: 'nested aggregate', nested: { doubleNested: { value: 20 } } })
      samples.push({ name: 'nested aggregate', nested: { doubleNested: { value: 30 } } })

      indexes.push(['qidxNameNested', 'name', STRING, MAPKEYS, new Context().addMapKey('nested')])
      indexes.push(['qidxIntListNested', 'li', NUMERIC, LIST, new Context().addMapKey('nested')])
      indexes.push(['qidxIntMapNested', 'mi', NUMERIC, MAPVALUES, new Context().addMapKey('nested')])
      indexes.push(['qidxStrListNested', 'ls', STRING, LIST, new Context().addMapKey('nested')])
      indexes.push(['qidxStrMapNested', 'ms', STRING, MAPVALUES, new Context().addMapKey('nested')])
      indexes.push(['qidxStrMapKeysNested', 'mks', STRING, MAPKEYS, new Context().addMapKey('nested')])
      indexes.push(['qidxGeoListNested', 'lg', GEO2DSPHERE, LIST, new Context().addMapKey('nested')])
      indexes.push(['qidxGeoMapNested', 'mg', GEO2DSPHERE, MAPVALUES, new Context().addMapKey('nested')])
      indexes.push(['qidxAggregateMapNested', 'nested', STRING, MAPKEYS])
      indexes.push(['qidxAggregateMapDoubleNested', 'nested', STRING, MAPKEYS, new Context().addMapKey('doubleNested')])
    }

    const numberOfSamples = samples.length
    return Promise.all([
      putgen.put(numberOfSamples, generators)
        .then((records) => { keys = records.map((rec) => rec.key) })
        .then(() => Promise.all(indexes.map(idx =>
          helper.index.create(idx[0], testSet, idx[1], idx[2], idx[3], idx[4])))),
      helper.udf.register('udf.lua')
    ])
  })

  after(() => helper.udf.remove('udf.lua')
    .then(() => Promise.all(indexes.map(idx =>
      helper.index.remove(idx[0])))))

  describe('client.query()', function () {
    it('creates a new Query instance and sets up it\'s properties', function () {
      const namespace = helper.namespace
      const set = 'demo'
      const options = {
        select: ['a', 'b', 'c'],
        nobins: false,
        filters: [Aerospike.filter.equal('a', 9)]
      }
      const query = client.query(namespace, set, options)

      expect(query).to.be.instanceof(Query)
      expect(query.ns).to.equal(helper.namespace)
      expect(query.set).to.equal('demo')
      expect(query.selected).to.eql(['a', 'b', 'c'])
      expect(query.nobins).to.be.false
      expect(query.filters).to.be.instanceof(Array)
      expect(query.filters.length).to.equal(1)
    })

    it('creates a query without specifying the set', function () {
      const namespace = helper.namespace
      const query = client.query(namespace, { select: ['i'] })
      expect(query).to.be.instanceof(Query)
      expect(query.ns).to.equal(helper.namespace)
      expect(query.set).to.be.null
      expect(query.selected).to.eql(['i'])
    })
  })

  describe('query.select()', function () {
    it('sets the selected bins from an argument list', function () {
      const query = client.query(helper.namespace, helper.set)
      query.select('a', 'b', 'c')
      expect(query.selected).to.eql(['a', 'b', 'c'])
    })

    it('sets the selected bins from an array', function () {
      const query = client.query(helper.namespace, helper.set)
      query.select(['a', 'b', 'c'])
      expect(query.selected).to.eql(['a', 'b', 'c'])
    })
  })

  describe('query.where()', function () {
    it('adds a filter predicate to the query', function () {
      const query = client.query(helper.namespace, helper.set)
      query.where(Aerospike.filter.equal('a', 9))
      expect(query.filters.length).to.equal(1)
    })
  })

  describe('query.foreach() #slow', function () {
    it('Should run a regular primary index query', function (done) {
      const query = client.query(helper.namespace, testSet)
      const stream = query.foreach()
      const results = []
      stream.on('error', error => { throw error })
      stream.on('data', record => results.push(record.bins))
      stream.on('end', () => {
        expect(results.length).to.be.above(samples.length)
        done()
      })
    })
    context('expectedDuration', function () {
      helper.skipUnlessVersion('>= 7.1.0', this)

      it('Should run a regular primary index query with expectedDuration=LONG', function (done) {
        const query = client.query(helper.namespace, testSet)
        const stream = query.foreach({ expectedDuration: Aerospike.policy.queryDuration.LONG })
        const results = []
        stream.on('error', error => { throw error })
        stream.on('data', record => results.push(record.bins))
        stream.on('end', () => {
          expect(results.length).to.be.above(samples.length)
          done()
        })
      })

      it('Should run a regular primary index query with expectedDuration=SHORT', function (done) {
        const query = client.query(helper.namespace, testSet)
        const stream = query.foreach({ expectedDuration: Aerospike.policy.queryDuration.SHORT })
        const results = []
        stream.on('error', error => { throw error })
        stream.on('data', record => results.push(record.bins))
        stream.on('end', () => {
          expect(results.length).to.be.above(samples.length)
          done()
        })
      })

      it('Should run a regular primary index query with expectedDuration=LONG_RELAX_AP', function (done) {
        const query = client.query(helper.namespace, testSet)
        const stream = query.foreach({ expectedDuration: Aerospike.policy.queryDuration.LONG_RELAX_AP })
        const results = []
        stream.on('error', error => { throw error })
        stream.on('data', record => results.push(record.bins))
        stream.on('end', () => {
          expect(results.length).to.be.above(samples.length)
          done()
        })
      })
    })

    it('Should run a paginated primary index query', async function () {
      let recordTotal = 0
      let recordsReceived = 0
      const maxRecs = 8
      const query = client.query(helper.namespace, testSet, { paginate: true, maxRecords: maxRecs })
      let results = []
      while (1) {
        results = await query.results()
        recordsReceived += results.length
        expect(results.length).to.be.below(9)
        results = []
        recordTotal += recordsReceived
        if (recordsReceived !== maxRecs) {
          expect(query.hasNextPage()).to.equal(false)
          expect(recordTotal).to.be.above(samples.length)
          break
        }
        recordsReceived = 0
      }
    })

    it('should apply a stream UDF to filter the results', function (done) {
      const args = {
        filters: [filter.equal('name', 'filter')]
      }
      const query = client.query(helper.namespace, testSet, args)
      query.setUdf('udf', 'even')
      const stream = query.foreach()
      const results = []
      stream.on('error', error => { throw error })
      stream.on('data', record => results.push(record.bins))
      stream.on('end', () => {
        expect(results.sort()).to.eql([2, 4])
        done()
      })
    })

    describe('index with cdt context', function () {
      helper.skipUnlessVersion('>= 6.1.0', this)
      it('should apply a stream UDF to the nested context', function (done) {
        const args = {
          filters: [filter.contains('name', 'value', MAPKEYS, new Context().addMapKey('nested'))]
        }
        const query = client.query(helper.namespace, testSet, args)
        query.setUdf('udf', 'even')
        const stream = query.foreach()
        const results = []
        stream.on('error', error => { throw error })
        stream.on('data', record => results.push(record.bins))
        stream.on('end', () => {
          expect(results.sort()).to.eql([])
          done()
        })
      })
    })

    describe('query.paginate()', function () {
      it('paginates with the correct amount of keys and pages', async function () {
        let recordsReceived = 0
        let recordTotal = 0
        let pageTotal = 0
        const lastPage = 3
        const maxRecs = 2
        const query = client.query(helper.namespace, testSet, { paginate: true, maxRecords: maxRecs, filters: [filter.equal('name', 'filter')] })
        while (1) {
          const stream = query.foreach()
          stream.on('error', (error) => { throw error })
          stream.on('data', (record) => {
            recordsReceived++
          })
          await new Promise(resolve => {
            stream.on('end', (queryState) => {
              query.queryState = queryState
              resolve()
            })
          })
          pageTotal += 1
          if (recordsReceived !== maxRecs) {
            recordTotal += recordsReceived
            expect(query.queryState).to.equal(undefined)
            expect(pageTotal).to.equal(lastPage)
            expect(recordTotal).to.equal(4)
            break
          } else {
            recordTotal += recordsReceived
            recordsReceived = 0
          }
        }
      })

      it('Paginates correctly using query.hasNextPage() and query.nextPage()', async function () {
        let recordsReceived = 0
        let recordTotal = 0
        let pageTotal = 0
        const lastPage = 3
        const maxRecs = 2
        const query = client.query(helper.namespace, testSet, { paginate: true, maxRecords: maxRecs, filters: [filter.equal('name', 'filter')] })
        while (1) {
          const stream = query.foreach()
          stream.on('error', (error) => { throw error })
          stream.on('data', (record) => {
            recordsReceived++
          })
          await new Promise(resolve => {
            stream.on('end', (queryState) => {
              query.nextPage(queryState)
              resolve()
            })
          })
          pageTotal += 1
          if (recordsReceived !== maxRecs) {
            recordTotal += recordsReceived
            expect(query.hasNextPage()).to.equal(false)
            expect(pageTotal).to.equal(lastPage)
            expect(recordTotal).to.equal(4)
            break
          } else {
            recordTotal += recordsReceived
            recordsReceived = 0
          }
        }
      })

      it('Paginates correctly using query.results()', async function () {
        let recordTotal = 0
        let recordsReceived = 0
        let pageTotal = 0
        const lastPage = 3
        const maxRecs = 2
        const query = client.query(helper.namespace, testSet, { paginate: true, maxRecords: maxRecs, filters: [filter.equal('name', 'filter')] })
        let results = []
        while (1) {
          results = await query.results()
          recordsReceived += results.length
          results = []

          pageTotal += 1
          recordTotal += recordsReceived
          if (recordsReceived !== maxRecs) {
            expect(query.hasNextPage()).to.equal(false)
            expect(pageTotal).to.equal(lastPage)
            expect(recordTotal).to.equal(4)
            break
          }
          recordsReceived = 0
        }
      })
      describe('index with cdt context', function () {
        helper.skipUnlessVersion('>= 6.1.0', this)
        it('Paginates correctly using query.results() on an index with a cdt context', async function () {
          let recordTotal = 0
          let recordsReceived = 0
          let pageTotal = 0
          const lastPage = 1
          const maxRecs = 5
          const query = client.query(helper.namespace, testSet, { paginate: true, maxRecords: maxRecs, filters: [filter.contains('nested', 'value', MAPKEYS, new Context().addMapKey('doubleNested'))] })
          let results = []
          while (1) {
            results = await query.results()
            recordsReceived += results.length
            results = []
            pageTotal += 1
            recordTotal += recordsReceived
            if (recordsReceived !== maxRecs) {
              expect(query.hasNextPage()).to.equal(false)
              expect(pageTotal).to.equal(lastPage)
              expect(recordTotal).to.equal(3)
              break
            }
            recordsReceived = 0
          }
        })
      })

      it('Throw error when query.UDF is set and query.paginate is true', async function () {
        const maxRecs = 2
        const query = client.query(helper.namespace, testSet, { paginate: true, maxRecords: maxRecs, filters: [filter.equal('name', 'filter')] })
        query.setUdf('ANYVALUE')
        try {
          await query.results()
          expect(1).to.equal(2)
        } catch (error) {
          expect(error.message).to.equal('Stream UDF cannot be applied using a paginated stream. Please disable pagination or UDF.')
        }
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

        const query = client.query(helper.namespace, testSet)
        query.where(Aerospike.filter.equal('name', uniqueKey))
        const stream = query.foreach()
        let count = 0
        stream.on('data', record => {
          expect(++count).to.equal(1)
          expect(record.key).to.be.instanceof(Key)
          expect(record.key.key).to.equal(uniqueKey)
        })
        stream.on('end', done)
      })
    })

    context('with partitions settings', function () {
      helper.skipUnlessVersion('>= 6.0.0', this)
      it('returns the key if it was stored on the given partitions', function (done) {
        const uniqueKey = 'test/query/record_with_stored_key'
        const key = new Aerospike.Key(helper.namespace, testSet, uniqueKey)
        const record = { name: uniqueKey }
        const meta = { ttl: 300 }
        const policy = new Aerospike.WritePolicy({
          key: Aerospike.policy.key.SEND
        })

        client.put(key, record, meta, policy, function (err) {
          if (err) throw err
          const query = client.query(helper.namespace, testSet)
          query.where(Aerospike.filter.equal('name', uniqueKey))
          query.partitions(0, 4096)
          const stream = query.foreach()
          let count = 0
          stream.on('data', record => {
            expect(++count).to.equal(1)
            expect(record.key).to.be.instanceof(Key)
            expect(record.key.key).to.equal(uniqueKey)
          })
          stream.on('end', done)
        })
      })
    })

    it('returns the key matching the expression', function (done) {
      const uniqueExpKey = 'test/query/record_with_stored_key'
      const key = new Aerospike.Key(helper.namespace, testSet, uniqueExpKey)
      const record = { name: uniqueExpKey }
      const meta = { ttl: 300 }
      const policy = new Aerospike.WritePolicy({
        key: Aerospike.policy.key.SEND
      })

      client.put(key, record, meta, policy, function (err) {
        if (err) throw err
        const query = client.query(helper.namespace, testSet)
        const queryPolicy = { filterExpression: exp.keyExist(uniqueExpKey) }
        const stream = query.foreach(queryPolicy)
        let count = 0
        stream.on('data', record => {
          expect(++count).to.equal(1)
          expect(record.key).to.be.instanceof(Key)
          expect(record.key.key).to.equal(uniqueExpKey)
        })
        stream.on('end', done)
      })
    })

    context('with nobins set to true', function () {
      helper.skipUnlessVersion('>= 3.15.0', this)

      it('should return only meta data', function (done) {
        const query = client.query(helper.namespace, testSet)
        const queryPolicy = { filterExpression: exp.eq(exp.binInt('i'), exp.int(5)) }
        query.nobins = true
        let received = null
        const stream = query.foreach(queryPolicy)
        stream.on('error', error => { throw error })
        stream.on('data', record => {
          received = record
          stream.abort()
        })
        stream.on('end', () => {
          expect(received.bins).to.be.empty
          expect(received.gen).to.be.ok
          expect(received.ttl).to.be.ok
          done()
        })
      })

      it('should return only meta data', function (done) {
        const query = client.query(helper.namespace, testSet)
        query.where(Aerospike.filter.equal('i', 5))
        query.nobins = true
        let received = null
        const stream = query.foreach()
        stream.on('error', error => { throw error })
        stream.on('data', record => {
          received = record
          stream.abort()
        })
        stream.on('end', () => {
          expect(received.bins).to.be.empty
          expect(received.gen).to.be.ok
          expect(received.ttl).to.be.ok
          done()
        })
      })
    })

    it('should raise client errors asynchronously', function () {
      const invalidPolicy = new Aerospike.QueryPolicy({
        timeout: 'not a valid timeout'
      })

      const query = client.query(helper.namespace)
      const stream = query.foreach(invalidPolicy)
      // if error is raised synchronously we will never reach here
      stream.on('error', error => {
        expect(error).to.be.instanceof(AerospikeError).with.property('code', Aerospike.status.ERR_PARAM)
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
          expect(dataHandlerCalled).to.be.true
          done()
        })
    })

    context('filter predicates', function () {
      describe('filter.equal()', function () {
        it('should match equal integer values', function (done) {
          const args = { filters: [filter.equal('i', 5)] }
          verifyQueryResults(args, 'int match', done)
        })
        context('Uses blob Secondary indexes', function () {
          helper.skipUnlessVersion('>= 7.0.0', this)
          it('should match equal blob values', function (done) {
            const args = { filters: [filter.equal('blob', Buffer.from('guava'))] }
            verifyQueryResults(args, 'blob match', done)
          })
        })
        it('should match equal string values', function (done) {
          const args = { filters: [filter.equal('s', 'banana')] }
          verifyQueryResults(args, 'string match', done)
        })

        it('throws a type error if the comparison value is of invalid type', function () {
          const fn = () => filter.equal('str', { foo: 'bar' })
          expect(fn).to.throw(TypeError)
        })
      })

      describe('filter.range()', function () {
        it('should match integers within a range', function (done) {
          const args = { filters: [filter.range('i', 3, 7)] }
          verifyQueryResults(args, 'int match', done)
        })

        it('should match integers in a list within a range', function (done) {
          const args = { filters: [filter.range('li', 3, 7, LIST)] }
          verifyQueryResults(args, 'int list match', done)
        })

        describe('index with cdt context', function () {
          helper.skipUnlessVersion('>= 6.1.0', this)
          it('should match integers in a list within a range in a nested context', function (done) {
            const args = { filters: [filter.range('li', 3, 7, LIST, new Context().addMapKey('nested'))] }
            verifyQueryResults(args, 'nested int list match', done)
          })
        })

        it('should match integers in a map within a range', function (done) {
          const args = { filters: [filter.range('mi', 3, 7, MAPVALUES)] }
          verifyQueryResults(args, 'int map match', done)
        })

        describe('index with cdt context', function () {
          helper.skipUnlessVersion('>= 6.1.0', this)
          it('should match integers in a map within a range in a nested context', function (done) {
            const args = { filters: [filter.range('mi', 3, 7, MAPVALUES, new Context().addMapKey('nested'))] }
            verifyQueryResults(args, 'nested int map match', done)
          })
        })
      })

      describe('filter.contains()', function () {
        it('should match lists containing an integer', function (done) {
          const args = { filters: [filter.contains('li', 5, LIST)] }
          verifyQueryResults(args, 'int list match', done)
        })

        describe('index with cdt context', function () {
          helper.skipUnlessVersion('>= 6.1.0', this)
          it('should match lists containing an integer in a nested context', function (done) {
            const args = { filters: [filter.contains('li', 5, LIST, new Context().addMapKey('nested'))] }
            verifyQueryResults(args, 'nested int list match', done)
          })
        })

        it('should match maps containing an integer value', function (done) {
          const args = { filters: [filter.contains('mi', 5, MAPVALUES)] }
          verifyQueryResults(args, 'int map match', done)
        })

        describe('index with cdt context', function () {
          helper.skipUnlessVersion('>= 6.1.0', this)
          it('should match maps containing an integer value in a nested context', function (done) {
            const args = { filters: [filter.contains('mi', 5, MAPVALUES, new Context().addMapKey('nested'))] }
            verifyQueryResults(args, 'nested int map match', done)
          })
        })

        it('should match lists containing a string', function (done) {
          const args = { filters: [filter.contains('ls', 'banana', LIST)] }
          verifyQueryResults(args, 'string list match', done)
        })

        describe('index with cdt context', function () {
          helper.skipUnlessVersion('>= 6.1.0', this)
          it('should match lists containing a string in a nested context', function (done) {
            const args = { filters: [filter.contains('ls', 'banana', LIST, new Context().addMapKey('nested'))] }
            verifyQueryResults(args, 'nested string list match', done)
          })
        })

        it('should match maps containing a string value', function (done) {
          const args = { filters: [filter.contains('ms', 'banana', MAPVALUES)] }
          verifyQueryResults(args, 'string map match', done)
        })

        describe('index with cdt context', function () {
          helper.skipUnlessVersion('>= 6.1.0', this)
          it('should match maps containing a string value in a nested context', function (done) {
            const args = { filters: [filter.contains('ms', 'banana', MAPVALUES, new Context().addMapKey('nested'))] }
            verifyQueryResults(args, 'nested string map match', done)
          })
        })

        it('should match maps containing a string key', function (done) {
          const args = { filters: [filter.contains('mks', 'banana', MAPKEYS)] }
          verifyQueryResults(args, 'string mapkeys match', done)
        })

        describe('index with cdt context', function () {
          helper.skipUnlessVersion('>= 6.1.0', this)
          it('should match maps containing a string key in a nested context', function (done) {
            const args = { filters: [filter.contains('mks', 'banana', MAPKEYS, new Context().addMapKey('nested'))] }
            verifyQueryResults(args, 'nested string mapkeys match', done)
          })
        })

        context('Uses blob Secondary indexes', function () {
          helper.skipUnlessVersion('>= 7.0.0', this)
          it('should match lists containing a blob', function (done) {
            const args = { filters: [filter.contains('lblob', Buffer.from('guava'), LIST)] }
            verifyQueryResults(args, 'blob list match', done)
          })

          it('should match lists containing a blob in a nested context', function (done) {
            const args = { filters: [filter.contains('lblob', Buffer.from('guava'), LIST, new Context().addMapKey('nested'))] }
            verifyQueryResults(args, 'nested blob list match', done)
          })

          it('should match maps containing a blob value', function (done) {
            const args = { filters: [filter.contains('mblob', Buffer.from('guava'), MAPVALUES)] }
            verifyQueryResults(args, 'blob map match', done)
          })

          it('should match maps containing a blob value in a nested context', function (done) {
            const args = { filters: [filter.contains('mblob', Buffer.from('guava'), MAPVALUES, new Context().addMapKey('nested'))] }
            verifyQueryResults(args, 'nested blob map match', done)
          })

          it('should match maps containing a blob key', function (done) {
            const args = { filters: [filter.contains('mkblob', Buffer.from('guava'), MAPKEYS)] }
            verifyQueryResults(args, 'blob mapkeys match', done)
          })

          it('should match maps containing a blob key in a nested context', function (done) {
            const args = { filters: [filter.contains('mkblob', Buffer.from('guava'), MAPKEYS, new Context().addMapKey('nested'))] }
            verifyQueryResults(args, 'nested blob mapkeys match', done)
          })
        })
        it('throws a type error if the comparison value is of invalid type', function () {
          const fn = () => filter.contains('list', { foo: 'bar' }, LIST)
          expect(fn).to.throw(TypeError)
        })
      })

      describe('filter.geoWithinGeoJSONRegion()', function () {
        it('should match locations within a GeoJSON region', function (done) {
          const region = new GeoJSON({ type: 'Polygon', coordinates: [[[103, 1.3], [104, 1.3], [104, 1.4], [103, 1.4], [103, 1.3]]] })
          const args = { filters: [filter.geoWithinGeoJSONRegion('g', region)] }
          verifyQueryResults(args, 'point match', done)
        })

        it('should match locations in a list within a GeoJSON region', function (done) {
          const region = new GeoJSON({ type: 'Polygon', coordinates: [[[103, 1.3], [104, 1.3], [104, 1.4], [103, 1.4], [103, 1.3]]] })
          const args = { filters: [filter.geoWithinGeoJSONRegion('lg', region, LIST)] }
          verifyQueryResults(args, 'point list match', done)
        })

        describe('index with cdt context', function () {
          helper.skipUnlessVersion('>= 6.1.0', this)
          it('should match locations in a list within a GeoJSON region in a nested context', function (done) {
            const region = new GeoJSON({ type: 'Polygon', coordinates: [[[103, 1.3], [104, 1.3], [104, 1.4], [103, 1.4], [103, 1.3]]] })
            const args = { filters: [filter.geoWithinGeoJSONRegion('lg', region, LIST, new Context().addMapKey('nested'))] }
            verifyQueryResults(args, 'nested point list match', done)
          })
        })

        it('should match locations in a map within a GeoJSON region', function (done) {
          const region = new GeoJSON({ type: 'Polygon', coordinates: [[[103, 1.3], [104, 1.3], [104, 1.4], [103, 1.4], [103, 1.3]]] })
          const args = { filters: [filter.geoWithinGeoJSONRegion('mg', region, MAPVALUES)] }
          verifyQueryResults(args, 'point map match', done)
        })
        describe('index with cdt context', function () {
          helper.skipUnlessVersion('>= 6.1.0', this)
          it('should match locations in a map within a GeoJSON region in a nested context', function (done) {
            const region = new GeoJSON({ type: 'Polygon', coordinates: [[[103, 1.3], [104, 1.3], [104, 1.4], [103, 1.4], [103, 1.3]]] })
            const args = { filters: [filter.geoWithinGeoJSONRegion('mg', region, MAPVALUES, new Context().addMapKey('nested'))] }
            verifyQueryResults(args, 'nested point map match', done)
          })
        })

        it('accepts a plain object as GeoJSON', function (done) {
          const region = { type: 'Polygon', coordinates: [[[103, 1.3], [104, 1.3], [104, 1.4], [103, 1.4], [103, 1.3]]] }
          const args = { filters: [filter.geoWithinGeoJSONRegion('g', region)] }
          verifyQueryResults(args, 'point match', done)
        })
      })

      describe('filter.geoWithinRadius()', function () {
        it('should match locations within a radius from another location', function (done) {
          const args = { filters: [filter.geoWithinRadius('g', 103.9135, 1.3085, 15000)] }
          verifyQueryResults(args, 'point match', done)
        })

        it('should match locations in a list within a radius from another location', function (done) {
          const args = { filters: [filter.geoWithinRadius('lg', 103.9135, 1.3085, 15000, LIST)] }
          verifyQueryResults(args, 'point list match', done)
        })

        describe('index with cdt context', function () {
          helper.skipUnlessVersion('>= 6.1.0', this)
          it('should match locations in a list within a radius from another location in a nested context', function (done) {
            const args = { filters: [filter.geoWithinRadius('lg', 103.9135, 1.3085, 15000, LIST, new Context().addMapKey('nested'))] }
            verifyQueryResults(args, 'nested point list match', done)
          })
        })

        it('should match locations in a map within a radius from another location', function (done) {
          const args = { filters: [filter.geoWithinRadius('mg', 103.9135, 1.3085, 15000, MAPVALUES)] }
          verifyQueryResults(args, 'point map match', done)
        })

        describe('index with cdt context', function () {
          helper.skipUnlessVersion('>= 6.1.0', this)
          it('should match locations in a map within a radius from another location in a nested context', function (done) {
            const args = { filters: [filter.geoWithinRadius('mg', 103.9135, 1.3085, 15000, MAPVALUES, new Context().addMapKey('nested'))] }
            verifyQueryResults(args, 'nested point map match', done)
          })
        })
      })

      describe('filter.geoContainsGeoJSONPoint()', function () {
        it('should match regions that contain a GeoJSON point', function (done) {
          const point = new GeoJSON({ type: 'Point', coordinates: [103.913, 1.308] })
          const args = { filters: [filter.geoContainsGeoJSONPoint('g', point)] }
          verifyQueryResults(args, 'region match', done)
        })

        it('should match regions in a list that contain a GeoJSON point', function (done) {
          const point = new GeoJSON({ type: 'Point', coordinates: [103.913, 1.308] })
          const args = { filters: [filter.geoContainsGeoJSONPoint('lg', point, LIST)] }
          verifyQueryResults(args, 'region list match', done)
        })

        describe('index with cdt context', function () {
          helper.skipUnlessVersion('>= 6.1.0', this)
          it('should match regions in a list that contain a GeoJSON point in a nested context', function (done) {
            const point = new GeoJSON({ type: 'Point', coordinates: [103.913, 1.308] })
            const args = { filters: [filter.geoContainsGeoJSONPoint('lg', point, LIST, new Context().addMapKey('nested'))] }
            verifyQueryResults(args, 'nested region list match', done)
          })
        })

        it('should match regions in a map that contain a GeoJSON point', function (done) {
          const point = new GeoJSON({ type: 'Point', coordinates: [103.913, 1.308] })
          const args = { filters: [filter.geoContainsGeoJSONPoint('mg', point, MAPVALUES)] }
          verifyQueryResults(args, 'region map match', done)
        })

        describe('index with cdt context', function () {
          helper.skipUnlessVersion('>= 6.1.0', this)
          it('should match regions in a map that contain a GeoJSON point in a nested context', function (done) {
            const point = new GeoJSON({ type: 'Point', coordinates: [103.913, 1.308] })
            const args = { filters: [filter.geoContainsGeoJSONPoint('mg', point, MAPVALUES, new Context().addMapKey('nested'))] }
            verifyQueryResults(args, 'nested region map match', done)
          })
        })

        it('accepts a plain object as GeoJSON', function (done) {
          const point = { type: 'Point', coordinates: [103.913, 1.308] }
          const args = { filters: [filter.geoContainsGeoJSONPoint('g', point)] }
          verifyQueryResults(args, 'region match', done)
        })
      })

      describe('filter.geoContainsPoint()', function () {
        it('should match regions that contain a lng/lat coordinate pair', function (done) {
          const args = { filters: [filter.geoContainsPoint('g', 103.913, 1.308)] }
          verifyQueryResults(args, 'region match', done)
        })

        it('should match regions in a list that contain a lng/lat coordinate pair', function (done) {
          const args = { filters: [filter.geoContainsPoint('lg', 103.913, 1.308, LIST)] }
          verifyQueryResults(args, 'region list match', done)
        })

        describe('index with cdt context', function () {
          helper.skipUnlessVersion('>= 6.1.0', this)
          it('should match regions in a list that contain a lng/lat coordinate pair in a nested context', function (done) {
            const args = { filters: [filter.geoContainsPoint('lg', 103.913, 1.308, LIST, new Context().addMapKey('nested'))] }
            verifyQueryResults(args, 'nested region list match', done)
          })
        })

        it('should match regions in a map that contain a lng/lat coordinate pair', function (done) {
          const args = { filters: [filter.geoContainsPoint('mg', 103.913, 1.308, MAPVALUES)] }
          verifyQueryResults(args, 'region map match', done)
        })

        describe('index with cdt context', function () {
          helper.skipUnlessVersion('>= 6.1.0', this)
          it('should match regions in a map that contain a lng/lat coordinate pair in a nested context', function (done) {
            const args = { filters: [filter.geoContainsPoint('mg', 103.913, 1.308, MAPVALUES, new Context().addMapKey('nested'))] }
            verifyQueryResults(args, 'nested region map match', done)
          })
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
      const args = {
        filters: [filter.equal('name', 'aggregate')]
      }
      const query = client.query(helper.namespace, testSet, args)
      query.apply('udf', 'count', function (error, result) {
        if (error) throw error
        expect(result).to.equal(3)
        done()
      })
    })
    describe('index with cdt context', function () {
      helper.skipUnlessVersion('>= 6.1.0', this)
      it('should apply a user defined function and aggregate the results from a map', function (done) {
        const args = {
          filters: [filter.contains('nested', 'value', MAPKEYS)]
        }
        const query = client.query(helper.namespace, testSet, args)
        query.apply('udf', 'count', function (error, result) {
          if (error) throw error
          expect(result).to.equal(3)
          done()
        })
      })
    })

    describe('index with cdt context', function () {
      helper.skipUnlessVersion('>= 6.1.0', this)
      it('should apply a user defined function and aggregate the results from a nested map', function (done) {
        const args = {
          filters: [filter.contains('nested', 'value', MAPKEYS, new Context().addMapKey('doubleNested'))]
        }
        const query = client.query(helper.namespace, testSet, args)
        query.apply('udf', 'count', function (error, result) {
          if (error) throw error
          expect(result).to.equal(3)
          done()
        })
      })
    })

    it('should apply a user defined function with arguments and aggregate the results', function (done) {
      const args = {
        filters: [filter.equal('name', 'aggregate')]
      }
      const query = client.query(helper.namespace, testSet, args)
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
      const args = {
        filters: [filter.equal('name', 'aggregate')]
      }
      const query = client.query(helper.namespace, testSet, args)
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
    describe('index with cdt context', function () {
      helper.skipUnlessVersion('>= 6.1.0', this)
      it('returns a Promise that resolves to a Job with a filter containing a CDT context', function () {
        const args = {
          filters: [filter.contains('nested', 'value', MAPKEYS, new Context().addMapKey('doubleNested'))]
        }
        const query = client.query(helper.namespace, testSet, args)
        return query.background('udf', 'noop')
          .then(job => {
            expect(job).to.be.instanceof(Job)
          })
      })
    })
  })

  describe('query.operate()', function () {
    helper.skipUnlessVersion('>= 4.7.0', this)

    it('should perform a background query that executes the operations #slow', async function () {
      const query = client.query(helper.namespace, testSet)
      const ops = [op.write('backgroundOps', 4)]
      const job = await query.operate(ops)
      await job.waitUntilDone()

      const key = keys[Math.floor(Math.random() * keys.length)]
      const record = await client.get(key)
      expect(record.bins.backgroundOps).to.equal(4)
    })

    it('should set TTL to the specified value #slow', async function () {
      const query = client.query(helper.namespace, testSet)
      query.ttl = 3600
      const ops = [op.incr('backgroundOps', 1)]
      const job = await query.operate(ops)
      await job.waitUntilDone()

      const key = keys[Math.floor(Math.random() * keys.length)]
      const record = await client.get(key)
      expect(record.ttl).to.equal(3599)
    })

    it('should set TTL to the specified value using query options #slow', async function () {
      const query = client.query(helper.namespace, testSet, { ttl: 7200 })
      const ops = [op.incr('backgroundOps', 1)]
      const job = await query.operate(ops)
      await job.waitUntilDone()

      const key = keys[Math.floor(Math.random() * keys.length)]
      const record = await client.get(key)
      expect(record.ttl).to.equal(7199)
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
        const args = {}
        args[key] = 'foo'
        expect(() => client.query(helper.namespace, testSet, args)).to.throw('Invalid query arguments')
      })
    })
  })
})
