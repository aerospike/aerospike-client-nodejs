// *****************************************************************************
// Copyright 2013-2024 Aerospike, Inc.
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

import Aerospike, { Client, Query, Job as J, exp as expModule, cdt, AerospikeError as ASError, GeoJSON as GJ, GeoJSONType, RecordStream, Key as K, filter as filterModule, operations, indexDataType, indexType, QueryOptions, AerospikeRecord, AerospikeBins} from 'aerospike';

import { expect } from 'chai'; 
import * as helper from './test_helper';

const query: typeof Query = Aerospike.Query
const Job: typeof J = Aerospike.Job

const exp: typeof expModule = Aerospike.exp
const Context: typeof cdt.Context = Aerospike.cdt.Context

const AerospikeError: typeof ASError = Aerospike.AerospikeError
const GeoJSON: typeof GJ= Aerospike.GeoJSON
const Key: typeof K = Aerospike.Key
const filter: typeof filterModule = Aerospike.filter
const op: typeof operations = Aerospike.operations

const NUMERIC: indexDataType = Aerospike.indexDataType.NUMERIC
const STRING: indexDataType = Aerospike.indexDataType.STRING
const GEO2DSPHERE: indexDataType = Aerospike.indexDataType.GEO2DSPHERE
const BLOB: indexDataType = Aerospike.indexDataType.BLOB

const LIST: indexType = Aerospike.indexType.LIST
const MAPVALUES: indexType = Aerospike.indexType.MAPVALUES
const MAPKEYS: indexType = Aerospike.indexType.MAPKEYS

const keygen: any = helper.keygen
const metagen: any = helper.metagen
const putgen: any = helper.putgen
let samples: any;

describe('Queries', function () {
  const client: Client = helper.client

  const testSet = 'test/query-' + Math.floor(Math.random() * 100000)
  samples = [
    { name: 'filter', value: 1 },
    { name: 'filter', value: 2 },
    { name: 'filter', value: 3 },
    { name: 'filter', value: 4 },
    { name: 'nested aggregate', nested: { value: 10 } },
    { name: 'nested aggregate', nested: { value: 20 } },
    { name: 'nested aggregate', nested: { value: 30 } },
    { name: 'nested aggregate', nested: { doubleNested: { value: 10 } } },
    { name: 'nested aggregate', nested: { doubleNested: { value: 20 } } },
    { name: 'nested aggregate', nested: { doubleNested: { value: 30 } } },
    { name: 'aggregate', value: 10 },
    { name: 'aggregate', value: 20 },
    { name: 'aggregate', value: 30 },

    //{ name: 'nested int list match', li: { nested: [1, 5, 9] } },
    //{ name: 'nested int list non-match', li: { nested: [500, 501, 502] } },
    //{ name: 'nested int map match', mi: { nested: { a: 1, b: 5, c: 9 } } },
    //{ name: 'nested int map non-match', mi: { nested: { a: 500, b: 501, c: 502 } } },
    //{ name: 'nested string list match', ls: { nested: ['banana', 'blueberry'] } },
    //{ name: 'nested string list non-match', ls: { nested: ['tomato', 'cuccumber'] } },
    //{ name: 'nested string map match', ms: { nested: { a: 'banana', b: 'blueberry' } } },
    //{ name: 'nested string map non-match', ms: { nested: { a: 'tomato', b: 'cuccumber' } } },
    //{ name: 'nested string mapkeys match', mks: { nested: { banana: 1, blueberry: 2 } } },
    //{ name: 'nested string mapkeys non-match', mks: { nested: { tomato: 3, cuccumber: 4 } } },


    { name: 'int match', i: 5 },
    { name: 'int non-match', i: 500 },
    { name: 'int list match', li: [1, 5, 9] },
    { name: 'int list non-match', li: [500, 501, 502] },
    //{ name: 'int map match', mi: { a: 1, b: 5, c: 9 } },
    //{ name: 'int map non-match', mi: { a: 500, b: 501, c: 502 } },
    //{ name: 'string match', s: 'banana' },
    //{ name: 'string non-match', s: 'tomato' },
    //{ name: 'string list match', ls: ['banana', 'blueberry'] },
    //{ name: 'string list non-match', ls: ['tomato', 'cuccumber'] },
    //{ name: 'string map match', ms: { a: 'banana', b: 'blueberry' } },
    //{ name: 'string map non-match', ms: { a: 'tomato', b: 'cuccumber' } },
    //{ name: 'string mapkeys match', mks: { banana: 1, blueberry: 2 } },
    //{ name: 'string mapkeys non-match', mks: { tomato: 3, cuccumber: 4 } },

  ]

  const indexes: any = [
    ['qidxName', 'name', STRING],
    //['qidxInt', 'i', NUMERIC],
    ['qidxIntList', 'li', NUMERIC, LIST],
    //['qidxIntMap', 'mi', NUMERIC, MAPVALUES],
    //['qidxStr', 's', STRING],
    //['qidxStrList', 'ls', STRING, LIST],
    //['qidxStrMap', 'ms', STRING, MAPVALUES],
    //['qidxStrMapKeys', 'mks', STRING, MAPKEYS],
    //['qidxGeo', 'g', GEO2DSPHERE],
    //['qidxGeoList', 'lg', GEO2DSPHERE, LIST],
    //['qidxGeoMap', 'mg', GEO2DSPHERE, MAPVALUES],

    ['qidxNameNested', 'name', STRING, MAPKEYS, new Context().addMapKey('nested')],
    //['qidxIntListNested', 'li', NUMERIC, LIST, new Context().addMapKey('nested')],
    //['qidxIntMapNested', 'mi', NUMERIC, MAPVALUES, new Context().addMapKey('nested')],
    //['qidxStrListNested', 'ls', STRING, LIST, new Context().addMapKey('nested')],
    //['qidxStrMapNested', 'ms', STRING, MAPVALUES, new Context().addMapKey('nested')],
    //['qidxStrMapKeysNested', 'mks', STRING, MAPKEYS, new Context().addMapKey('nested')],
    //['qidxGeoListNested', 'lg', GEO2DSPHERE, LIST, new Context().addMapKey('nested')],
    //['qidxGeoMapNested', 'mg', GEO2DSPHERE, MAPVALUES, new Context().addMapKey('nested')],
    ['qidxAggregateMapNested', 'nested', STRING, MAPKEYS],
    ['qidxAggregateMapDoubleNested', 'nested', STRING, MAPKEYS, new Context().addMapKey('doubleNested')],


    ['qidxInt', 'i', NUMERIC],
    ['qidxIntList', 'li', NUMERIC, LIST],
    //['qidxIntMap', 'mi', NUMERIC, MAPVALUES],
    //['qidxStr', 's', STRING],
    //['qidxStrList', 'ls', STRING, LIST],
    //['qidxStrMap', 'ms', STRING, MAPVALUES],
    //['qidxStrMapKeys', 'mks', STRING, MAPKEYS],
    //['qidxGeo', 'g', GEO2DSPHERE],
    //['qidxGeoList', 'lg', GEO2DSPHERE, LIST],
    //['qidxGeoMap', 'mg', GEO2DSPHERE, MAPVALUES]

  ]

  let keys: any = []

  function verifyQueryResults (queryOptions: QueryOptions, matchName: string, done: any) {
    const query: Query = client.query(helper.namespace, testSet, queryOptions)
    let matches = 0
    const stream: RecordStream = query.foreach()
    stream.on('error', (error: ASError) => { throw error })
    stream.on('data', (record: AerospikeRecord) => {
      expect(record.bins).to.have.property('name', matchName)
      matches++
    })
    stream.on('end', function () {
      expect(matches).to.equal(1)
      done()
    })
  }

  before(async () => {
    const generators: any = {
      keygen: keygen.string(helper.namespace, testSet, { prefix: 'test/query/', random: false }),
      recgen: () => samples.pop(),
      metagen: metagen.constant({ ttl: 300 })
    }
    

    const numberOfSamples: any = samples.length

    let records: AerospikeRecord[] = await putgen.put(numberOfSamples, generators)

    keys = records.map((rec: AerospikeRecord) => rec.key)
    let promises: any = []

    promises.push( helper.udf.register('udf.lua') )

    for (let i in indexes){
      let idx: any = indexes[i]
      promises.push(helper.index.create(idx[0], testSet, idx[1], idx[2], idx[3], idx[4]))

    }

    let result = await Promise.all(promises)

  })

  after(async () => {
    let promises: any = []

    promises.push( helper.udf.remove('udf.lua') )


    for (let i in indexes){
      let idx: any = indexes[i]
      promises.push( helper.index.remove(idx[0]) )
    }

    let result = await Promise.all(promises)
    //await new Promise(r => setTimeout(r, 3000));
  })


  describe('client.query()', function () {
    it('creates a new Query instance and sets up it\'s properties', function () {
      const namespace: string = helper.namespace
      const set: string = 'demo'
      const options: QueryOptions = {
        select: ['a', 'b', 'c'],
        nobins: false,
        filters: [Aerospike.filter.equal('a', 9)]
      }
      const query: Query = client.query(namespace, set, options)

      expect(query).to.be.instanceof(Query)
      expect(query.ns).to.equal(helper.namespace)
      expect(query.set).to.equal('demo')
      expect(query.selected).to.eql(['a', 'b', 'c'])
      expect(query.nobins).to.be.false
      expect(query.filters).to.be.instanceof(Array)
      expect(query.filters.length).to.equal(1)
    })

    it('creates a query without specifying the set', function () {
      const namespace: string = helper.namespace
      const query: Query = client.query(namespace, { select: ['i'] })
      expect(query).to.be.instanceof(Query)
      expect(query.ns).to.equal(helper.namespace)
      expect(query.set).to.be.null
      expect(query.selected).to.eql(['i'])
    })
  })

  describe('query.select()', function () {
    it('sets the selected bins from an argument list', function () {
      const query: Query = client.query(helper.namespace, helper.set)
      query.select('a', 'b', 'c')
      expect(query.selected).to.eql(['a', 'b', 'c'])
    })

    it('sets the selected bins from an array', function () {
      const query: Query = client.query(helper.namespace, helper.set)
      query.select(['a', 'b', 'c'])
      expect(query.selected).to.eql(['a', 'b', 'c'])
    })
  })

  describe('query.where()', function () {
    it('adds a filter predicate to the query', function () {
      const query: Query = client.query(helper.namespace, helper.set)
      query.where(Aerospike.filter.equal('a', 9))
      expect(query.filters.length).to.equal(1)
    })
  })

  describe('query.whereWithIndexName()', function () {
    it('adds a filter predicate to the query', function () {
      const query: Query = client.query(helper.namespace, helper.set)
      query.whereWithIndexName(Aerospike.filter.equal('a', 9), 'indexName')
      expect(query.filters.length).to.equal(1)
      expect(query.filters[0].indexName).to.equal('indexName')
    })
  })

  describe('query.foreach() #slow', function () {
    it('Should run a regular primary index query', function (done) {
      const query: Query = client.query(helper.namespace, testSet)
      const stream = query.foreach()
      const results: AerospikeBins[] = []
      stream.on('error', (error: ASError) => { throw error })
      stream.on('data', (record: AerospikeRecord) => results.push(record.bins))
      stream.on('end', () => {
        expect(results.length).to.be.above(samples.length)
        done()
      })
    })
    context('expectedDuration', function () {
      helper.skipUnlessVersion('>= 7.1.0', this)

      it('Should run a regular primary index query with expectedDuration=LONG', function (done) {
        const query: Query = client.query(helper.namespace, testSet)
        const stream = query.foreach({ expectedDuration: Aerospike.policy.queryDuration.LONG })
        const results: AerospikeBins[] = []
        stream.on('error', (error: ASError) => { throw error })
        stream.on('data', (record: AerospikeRecord) => results.push(record.bins))
        stream.on('end', () => {
          expect(results.length).to.be.above(samples.length)
          done()
        })
      })

      it('Should run a regular primary index query with expectedDuration=SHORT', function (done) {
        const query: Query = client.query(helper.namespace, testSet)
        const stream = query.foreach({ expectedDuration: Aerospike.policy.queryDuration.SHORT })
        const results: AerospikeBins[] = []
        stream.on('error', (error: ASError) => { throw error })
        stream.on('data', (record: AerospikeRecord) => results.push(record.bins))
        stream.on('end', () => {
          expect(results.length).to.be.above(samples.length)
          done()
        })
      })

      it('Should run a regular primary index query with expectedDuration=LONG_RELAX_AP', function (done) {
        const query: Query = client.query(helper.namespace, testSet)
        const stream = query.foreach({ expectedDuration: Aerospike.policy.queryDuration.LONG_RELAX_AP })
        const results: AerospikeBins[] = []
        stream.on('error', (error: ASError) => { 
          expect(error.message).to.eql('Request protocol invalid, or invalid protocol field.') 
          done()
        })
        stream.on('data', (record: AerospikeRecord) => results.push(record.bins))
        stream.on('end', () => {
          expect(results.length).to.be.above(samples.length)
          done()
        })
      })
    })

    it('Should run a paginated primary index query', async function () {
      this.timeout(15000)

      let recordTotal = 0
      let recordsReceived = 0
      const maxRecs = 8
      const query: Query = client.query(helper.namespace, testSet, { paginate: true, maxRecords: maxRecs })
      let results: AerospikeRecord[] = []
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
      const args: QueryOptions = {
        filters: [filter.equal('name', 'filter')]
      }
      const query: Query = client.query(helper.namespace, testSet, args)
      query.setUdf('udf', 'even')
      const stream = query.foreach()
      const results: AerospikeBins[] = []
      stream.on('error', (error: ASError) => { throw error })
      stream.on('data', (record: AerospikeRecord) => results.push(record.bins))
      stream.on('end', () => {
        expect(results.sort()).to.eql([2, 4])
        done()
      })
    })

    describe('index with cdt context', function () {
      helper.skipUnlessVersion('>= 6.1.0', this)
      it('should apply a stream UDF to the nested context', function (done) {
        const args: QueryOptions = {
          filters: [filter.contains('name', 'value', MAPKEYS, new Context().addMapKey('nested'))]
        }

        const query: Query = client.query(helper.namespace, testSet, args)
        query.setUdf('udf', 'even')
        const stream: RecordStream = query.foreach()
        const results: AerospikeBins[] = []
        stream.on('error', (error: ASError) => { throw error })
        stream.on('data', (record: AerospikeRecord) => results.push(record.bins))
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
        const query: Query = client.query(helper.namespace, testSet, { paginate: true, maxRecords: maxRecs, filters: [filter.equal('name', 'filter')] })
        while (1) {
          const stream = query.foreach()
          stream.on('error', (error) => { throw error })
          stream.on('data', (record) => {
            recordsReceived++
          })
          await new Promise((resolve: any) => {
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
        const query: Query = client.query(helper.namespace, testSet, { paginate: true, maxRecords: maxRecs, filters: [filter.equal('name', 'filter')] })
        while (1) {
          const stream = query.foreach()
          stream.on('error', (error: ASError) => { throw error })
          stream.on('data', (record: AerospikeRecord) => {
            recordsReceived++
          })
          await new Promise((resolve: any) => {
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
        const query: Query = client.query(helper.namespace, testSet, { paginate: true, maxRecords: maxRecs, filters: [filter.equal('name', 'filter')] })
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
          const query: Query = client.query(helper.namespace, testSet, { paginate: true, maxRecords: maxRecs, filters: [filter.contains('nested', 'value', MAPKEYS, new Context().addMapKey('doubleNested'))] })
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
        const query: Query = client.query(helper.namespace, testSet, { paginate: true, maxRecords: maxRecs, filters: [filter.equal('name', 'filter')] })
        query.setUdf('udf', 'even')
        try {
          await query.results()
          expect(1).to.equal(2)
        } catch (error: any) {
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

        const query: Query = client.query(helper.namespace, testSet)
        query.where(Aerospike.filter.equal('name', uniqueKey))
        const stream = query.foreach()
        let count = 0
        stream.on('data', (record: AerospikeRecord) => {
          expect(++count).to.equal(1)
          expect(record.key).to.be.instanceof(Key)
          expect(record.key.key).to.equal(uniqueKey)
        })
        stream.on('end', done)
      })
    })

    context('with partitions settings', function () {
      // helper.skipUnlessVersion('>= 6.0.0', this)
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
          const query: Query = client.query(helper.namespace, testSet)
          query.where(Aerospike.filter.equal('name', uniqueKey))
          query.partitions(0, 4096)
          const stream = query.foreach()
          let count = 0
          stream.on('data', (record: AerospikeRecord) => {
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
        const query: Query = client.query(helper.namespace, testSet)
        const queryPolicy = { filterExpression: exp.keyExist() }
        const stream = query.foreach(queryPolicy)
        let count = 0
        stream.on('data', (record: AerospikeRecord) => {
          expect(++count).to.equal(1)
          expect(record.key).to.be.instanceof(Key)
          expect(record.key.key).to.equal(uniqueExpKey)
        })
        stream.on('end', done)
      })
    })

    context('with nobins set to true', function () {
      // helper.skipUnlessVersion('>= 3.15.0', this)

      it('should return only meta data', function (done) {
        const query: Query = client.query(helper.namespace, testSet)
        const queryPolicy = { filterExpression: exp.eq(exp.binInt('i'), exp.int(5)) }
        query.nobins = true
        let received: AerospikeRecord;
        const stream = query.foreach(queryPolicy)
        stream.on('error', (error: ASError) => { throw error })
        stream.on('data', (record: AerospikeRecord) => {
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
        const query: Query = client.query(helper.namespace, testSet)
        query.where(Aerospike.filter.equal('i', 5))
        query.nobins = true
        let received: AerospikeRecord;
        const stream = query.foreach()
        stream.on('error', (error: ASError) => { throw error })
        stream.on('data', (record: AerospikeRecord) => {
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
    /*
    it('should raise client errors asynchronously', function () {
      const invalidPolicy = new Aerospike.QueryPolicy({
        timeout: 'not a valid timeout'
      })

      const query: Query = client.query(helper.namespace)
      const stream = query.foreach(invalidPolicy)
      // if error is raised synchronously we will never reach here
      stream.on('error', (error: any) => {
        expect(error).to.be.instanceof(AerospikeError).with.property('code', Aerospike.status.ERR_PARAM)
      })
    })
    */

    it('attaches event handlers to the stream', function (done) {
      const query: Query = client.query(helper.namespace, testSet)
      let dataHandlerCalled = false
      const stream = query.foreach(null,
        (_record: AerospikeRecord) => {
          dataHandlerCalled = true
          stream.abort()
        },
        (error: Error) => { throw error },
        () => {
          expect(dataHandlerCalled).to.be.true
          done()
        })
    })
  })


  describe('query.results()', function () {
    it('returns a Promise that resolves into the query results', function () {
      const query: Query = client.query(helper.namespace, testSet)
      query.where(filter.equal('i', 5))

      return query.results().then(records => {
        expect(records.length).to.eq(1)
        expect(records[0].bins.name).to.eq('int match')
      })
    })

    it('returns a Promise that resolves into the query results using whereWithIndexName', function () {
      const query: Query = client.query(helper.namespace, testSet)
      query.whereWithIndexName(filter.equal(null, 5), 'qidxInt')

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
          const query: Query = client.query(helper.namespace, testSet)
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
      const args: QueryOptions = {
        filters: [filter.equal('name', 'aggregate')]
      }
      const query: Query = client.query(helper.namespace, testSet, args)
      query.apply('udf', 'count', function (error, result) {
        if (error) throw error
        expect(result).to.equal(3)
        done()
      })
    })
    describe('index with cdt context', function () {
      helper.skipUnlessVersion('>= 6.1.0', this)
      it('should apply a user defined function and aggregate the results from a map', function (done) {
        const args: QueryOptions = {
          filters: [filter.contains('nested', 'value', MAPKEYS)]
        }
        const query: Query = client.query(helper.namespace, testSet, args)
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
        const args: QueryOptions = {
          filters: [filter.contains('nested', 'value', MAPKEYS, new Context().addMapKey('doubleNested'))]
        }
        const query: Query = client.query(helper.namespace, testSet, args)
        query.apply('udf', 'count', function (error, result) {
          if (error) throw error
          expect(result).to.equal(3)
          done()
        })
      })
    })

    it('should apply a user defined function with arguments and aggregate the results', function (done) {
      const args: QueryOptions = {
        filters: [filter.equal('name', 'aggregate')]
      }
      const query: Query = client.query(helper.namespace, testSet, args)
      query.apply('udf', 'countGreaterThan', ['value', 15], function (error, result) {
        if (error) throw error
        expect(result).to.equal(2)
        done()
      })
    })

    it('returns a Promise that resolves to the result of the aggregation', function () {
      const args: QueryOptions = {
        filters: [filter.equal('name', 'aggregate')]
      }
      const query: Query = client.query(helper.namespace, testSet, args)
      return query.apply('udf', 'count')
        .then(result => {
          expect(result).to.equal(3)
        })
    })
  })

  describe('query.background()', function () {
    it('should run a background query and return a job', function (done) {
      const args: QueryOptions = {
        filters: [filter.equal('name', 'aggregate')]
      }
      const query: Query = client.query(helper.namespace, testSet, args)
      query.background('udf', 'noop', function (error, job) {
        if (error) throw error
        expect(job).to.be.instanceof(Job)
        done()
      })
    })

    it('returns a Promise that resolves to a Job', function () {
      const args: QueryOptions = {
        filters: [filter.equal('name', 'aggregate')]
      }
      const query: Query = client.query(helper.namespace, testSet, args)
      return query.background('udf', 'noop')
        .then(job => {
          expect(job).to.be.instanceof(Job)
        })
    })
    describe('index with cdt context', function () {
      helper.skipUnlessVersion('>= 6.1.0', this)
      it('returns a Promise that resolves to a Job with a filter containing a CDT context', function () {
        const args: QueryOptions = {
          filters: [filter.contains('nested', 'value', MAPKEYS, new Context().addMapKey('doubleNested'))]
        }
        const query: Query = client.query(helper.namespace, testSet, args)
        return query.background('udf', 'noop')
          .then(job => {
            expect(job).to.be.instanceof(Job)
          })
      })
    })
  })

  describe('query.operate()', function () {

    it('should perform a background query that executes the operations #slow', async function () {
      const query: Query = client.query(helper.namespace, testSet)
      const ops = [op.write('backgroundOps', 4)]
      const job = await query.operate(ops)
      await job.waitUntilDone()

      const key = keys[Math.floor(Math.random() * keys.length)]
      const record = await client.get(key)
      expect(record.bins.backgroundOps).to.equal(4)
    })

    it('should set TTL to the specified value #slow', async function () {
      const query: Query = client.query(helper.namespace, testSet)
      query.ttl = 3600
      const ops = [op.incr('backgroundOps', 1)]
      const job = await query.operate(ops)
      await job.waitUntilDone()

      const key = keys[Math.floor(Math.random() * keys.length)]
      const record = await client.get(key)
      expect(record.ttl).to.be.within(3598, 3600)

    })

    it('should set TTL to the specified value using query options #slow', async function () {
      const query: Query = client.query(helper.namespace, testSet, { ttl: 7200 })
      const ops = [op.incr('backgroundOps', 1)]
      const job = await query.operate(ops)
      await job.waitUntilDone()

      const key = keys[Math.floor(Math.random() * keys.length)]
      const record = await client.get(key)
      expect(record.ttl).to.be.within(7198, 7200)
    })
  })

  describe('stream.abort()', function () {
    it('should stop the query when the stream is aborted', function (done) {
      const query: Query = client.query(helper.namespace, testSet)
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
  /*
  context('legacy scan interface', function () {
    ;['UDF', 'concurrent', 'percentage', 'priority'].forEach(function (key) {
      it('should throw an exception if the query options contain key "' + key + '"', function () {
        const args: QueryOptions = {}
        args[key] = 'foo'
        expect(() => client.query(helper.namespace, testSet, args)).to.throw('Invalid query arguments')
      })
    })
  })
  */
})
