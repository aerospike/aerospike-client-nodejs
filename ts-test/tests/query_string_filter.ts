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
    //{ name: 'blob match', blob: Buffer.from('guava') },
    //{ name: 'blob non-match', blob: Buffer.from('pumpkin') },
    //{ name: 'blob list match', lblob: [Buffer.from('guava'), Buffer.from('papaya')] },
    //{ name: 'blob list non-match', lblob: [Buffer.from('pumpkin'), Buffer.from('turnip')] },
    //{ name: 'blob map match', mblob: { a: Buffer.from('guava'), b: Buffer.from('papaya') } },
    //{ name: 'blob map non-match', mblob: { a: Buffer.from('pumpkin'), b: Buffer.from('turnip') } },
    //{ name: 'blob mapkeys match', mkblob: new Map([[Buffer.from('guava'), 1], [Buffer.from('papaya'), 2]]) },
    //{ name: 'blob mapkeys non-match', mkblob: new Map([[Buffer.from('pumpkin'), 3], [Buffer.from('turnip'), 4]]) },
    //{ name: 'nested blob match', blob: { nested: Buffer.from('guava') } },
    //{ name: 'nested blob non-match', blob: { nested: Buffer.from('pumpkin') } },
    //{ name: 'nested blob list match', lblob: { nested: [Buffer.from('guava'), Buffer.from('papaya')] } },
    //{ name: 'nested blob list non-match', lblob: { nested: [Buffer.from('pumpkin'), Buffer.from('turnip')] } },
    //{ name: 'nested blob map match', mblob: { nested: { a: Buffer.from('guava'), b: Buffer.from('papaya') } } },
    //{ name: 'nested blob map non-match', mblob: { nested: { a: Buffer.from('pumpkin'), b: Buffer.from('turnip') } } },
    //{ name: 'nested blob mapkeys match', mkblob: { nested: new Map([[Buffer.from('guava'), 1], [Buffer.from('papaya'), 2]]) } },
    //{ name: 'nested blob mapkeys non-match', mkblob: { nested: new Map([[Buffer.from('pumpkin'), 3], [Buffer.from('turnip'), 4]]) } },

    //{ name: 'filter', value: 1 },
    //{ name: 'filter', value: 2 },
    //{ name: 'filter', value: 3 },
    //{ name: 'filter', value: 4 },
    //{ name: 'nested aggregate', nested: { value: 10 } },
    //{ name: 'nested aggregate', nested: { value: 20 } },
    //{ name: 'nested aggregate', nested: { value: 30 } },
    //{ name: 'nested aggregate', nested: { doubleNested: { value: 10 } } },
    //{ name: 'nested aggregate', nested: { doubleNested: { value: 20 } } },
    //{ name: 'nested aggregate', nested: { doubleNested: { value: 30 } } },
    //{ name: 'aggregate', value: 10 },
    //{ name: 'aggregate', value: 20 },
    //{ name: 'aggregate', value: 30 },

    //{ name: 'nested int list match', li: { nested: [1, 5, 9] } },
    //{ name: 'nested int list non-match', li: { nested: [500, 501, 502] } },
    //{ name: 'nested int map match', mi: { nested: { a: 1, b: 5, c: 9 } } },
    //{ name: 'nested int map non-match', mi: { nested: { a: 500, b: 501, c: 502 } } },
    { name: 'nested string list match', ls: { nested: ['banana', 'blueberry'] } },
    { name: 'nested string list non-match', ls: { nested: ['tomato', 'cuccumber'] } },
    { name: 'nested string map match', ms: { nested: { a: 'banana', b: 'blueberry' } } },
    { name: 'nested string map non-match', ms: { nested: { a: 'tomato', b: 'cuccumber' } } },
    { name: 'nested string mapkeys match', mks: { nested: { banana: 1, blueberry: 2 } } },
    { name: 'nested string mapkeys non-match', mks: { nested: { tomato: 3, cuccumber: 4 } } },


    //{ name: 'int match', i: 5 },
    //{ name: 'int non-match', i: 500 },
    //{ name: 'int list match', li: [1, 5, 9] },
    //{ name: 'int list non-match', li: [500, 501, 502] },
    //{ name: 'int map match', mi: { a: 1, b: 5, c: 9 } },
    //{ name: 'int map non-match', mi: { a: 500, b: 501, c: 502 } },
    { name: 'string match', s: 'banana' },
    { name: 'string non-match', s: 'tomato' },
    { name: 'string list match', ls: ['banana', 'blueberry'] },
    { name: 'string list non-match', ls: ['tomato', 'cuccumber'] },
    { name: 'string map match', ms: { a: 'banana', b: 'blueberry' } },
    { name: 'string map non-match', ms: { a: 'tomato', b: 'cuccumber' } },
    { name: 'string mapkeys match', mks: { banana: 1, blueberry: 2 } },
    { name: 'string mapkeys non-match', mks: { tomato: 3, cuccumber: 4 } },

  ]

  const indexes: any = [
    //['qidxName', 'name', STRING],
    //['qidxInt', 'i', NUMERIC],
    //['qidxIntList', 'li', NUMERIC, LIST],
    //['qidxIntMap', 'mi', NUMERIC, MAPVALUES],
    ['qidxStr', 's', STRING],
    ['qidxStrList', 'ls', STRING, LIST],
    ['qidxStrMap', 'ms', STRING, MAPVALUES],
    ['qidxStrMapKeys', 'mks', STRING, MAPKEYS],
    //['qidxGeo', 'g', GEO2DSPHERE],
    //['qidxGeoList', 'lg', GEO2DSPHERE, LIST],
    //['qidxGeoMap', 'mg', GEO2DSPHERE, MAPVALUES],

    //['qidxNameNested', 'name', STRING, MAPKEYS, new Context().addMapKey('nested')],
    //['qidxIntListNested', 'li', NUMERIC, LIST, new Context().addMapKey('nested')],
    //['qidxIntMapNested', 'mi', NUMERIC, MAPVALUES, new Context().addMapKey('nested')],
    ['qidxStrListNested', 'ls', STRING, LIST, new Context().addMapKey('nested')],
    ['qidxStrMapNested', 'ms', STRING, MAPVALUES, new Context().addMapKey('nested')],
    ['qidxStrMapKeysNested', 'mks', STRING, MAPKEYS, new Context().addMapKey('nested')],
    //['qidxGeoListNested', 'lg', GEO2DSPHERE, LIST, new Context().addMapKey('nested')],
    //['qidxGeoMapNested', 'mg', GEO2DSPHERE, MAPVALUES, new Context().addMapKey('nested')],
    //['qidxAggregateMapNested', 'nested', STRING, MAPKEYS],
    //['qidxAggregateMapDoubleNested', 'nested', STRING, MAPKEYS, new Context().addMapKey('doubleNested')],


    //['qidxInt', 'i', NUMERIC],
    //['qidxIntList', 'li', NUMERIC, LIST],
    //['qidxIntMap', 'mi', NUMERIC, MAPVALUES],
    //['qidxStr', 's', STRING],
    //['qidxStrList', 'ls', STRING, LIST],
    //['qidxStrMap', 'ms', STRING, MAPVALUES],
    //['qidxStrMapKeys', 'mks', STRING, MAPKEYS],
    //['qidxGeo', 'g', GEO2DSPHERE],
    //['qidxGeoList', 'lg', GEO2DSPHERE, LIST],
    //['qidxGeoMap', 'mg', GEO2DSPHERE, MAPVALUES]

    //['qidxBlob', 'blob', BLOB],
    //['qidxBlobList', 'lblob', BLOB, LIST],
    //['qidxBlobMap', 'mblob', BLOB, MAPVALUES],
    //['qidxBlobMapKeys', 'mkblob', BLOB, MAPKEYS],
    //['qidxBlobListNested', 'lblob', BLOB, LIST, new Context().addMapKey('nested')],
    //['qidxBlobMapNested', 'mblob', BLOB, MAPVALUES, new Context().addMapKey('nested')],
    //['qidxBlobMapKeysNested', 'mkblob', BLOB, MAPKEYS, new Context().addMapKey('nested')],

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



  context('filter predicates', function () {
    describe('filter.equal()', function () {

      it('should match equal string values', function (done) {
        const args: QueryOptions = { filters: [filter.equal('s', 'banana')] }
        verifyQueryResults(args, 'string match', done)
      })

      context('Query using index name', function () {
        it('should match equal string values', function (done) {
          const args: QueryOptions = { filters: [filter.equal(null as any, 'banana')] }
          args.filters![0].indexName = 'qidxStr'
          verifyQueryResults(args, 'string match', done)
        })
      })

      it('throws a type error if the comparison value is of invalid type', function () {
        const fn = () => filter.equal('str', { foo: 'bar' })
        expect(fn).to.throw(TypeError)
      })
    })

    describe('filter.contains()', function () {

      it('should match lists containing a string', function (done) {
        const args: QueryOptions = { filters: [filter.contains('ls', 'banana', LIST)] }
        verifyQueryResults(args, 'string list match', done)
      })

      describe('index with cdt context', function () {
        helper.skipUnlessVersion('>= 6.1.0', this)
        it('should match lists containing a string in a nested context', function (done) {
          const args: QueryOptions = { filters: [filter.contains('ls', 'banana', LIST, new Context().addMapKey('nested'))] }
          verifyQueryResults(args, 'nested string list match', done)
        })
      })

      it('should match maps containing a string value', function (done) {
        const args: QueryOptions = { filters: [filter.contains('ms', 'banana', MAPVALUES)] }
        verifyQueryResults(args, 'string map match', done)
      })

      describe('index with cdt context', function () {
        helper.skipUnlessVersion('>= 6.1.0', this)
        it('should match maps containing a string value in a nested context', function (done) {
          const args: QueryOptions = { filters: [filter.contains('ms', 'banana', MAPVALUES, new Context().addMapKey('nested'))] }
          verifyQueryResults(args, 'nested string map match', done)
        })
      })

      it('should match maps containing a string key', function (done) {
        const args: QueryOptions = { filters: [filter.contains('mks', 'banana', MAPKEYS)] }
        verifyQueryResults(args, 'string mapkeys match', done)
      })

      describe('index with cdt context', function () {
        helper.skipUnlessVersion('>= 6.1.0', this)
        it('should match maps containing a string key in a nested context', function (done) {
          const args: QueryOptions = { filters: [filter.contains('mks', 'banana', MAPKEYS, new Context().addMapKey('nested'))] }
          verifyQueryResults(args, 'nested string mapkeys match', done)
        })
      })

      context('Query using index name', function () {

        it('should match lists containing a string', function (done) {
          const args: QueryOptions = { filters: [filter.contains(null as any, 'banana', LIST)] }
          args.filters![0].indexName = 'qidxStrList'
          verifyQueryResults(args, 'string list match', done)
        })

        describe('index with cdt context', function () {
          helper.skipUnlessVersion('>= 6.1.0', this)
          it('should match lists containing a string in a nested context', function (done) {
            const args: QueryOptions = { filters: [filter.contains(null as any, 'banana', LIST, new Context().addMapKey('nested'))] }
            args.filters![0].indexName = 'qidxStrListNested'
            verifyQueryResults(args, 'nested string list match', done)
          })
        })

        it('should match maps containing a string value', function (done) {
          const args: QueryOptions = { filters: [filter.contains(null as any, 'banana', MAPVALUES)] }
          args.filters![0].indexName = 'qidxStrMap'
          verifyQueryResults(args, 'string map match', done)
        })

        describe('index with cdt context', function () {
          helper.skipUnlessVersion('>= 6.1.0', this)
          it('should match maps containing a string value in a nested context', function (done) {
            const args: QueryOptions = { filters: [filter.contains(null as any, 'banana', MAPVALUES, new Context().addMapKey('nested'))] }
          args.filters![0].indexName = 'qidxStrMapNested'
            verifyQueryResults(args, 'nested string map match', done)
          })
        })

        it('should match maps containing a string key', function (done) {
          const args: QueryOptions = { filters: [filter.contains(null as any, 'banana', MAPKEYS)] }
          args.filters![0].indexName = 'qidxStrMapKeys'
          verifyQueryResults(args, 'string mapkeys match', done)
        })

        describe('index with cdt context', function () {
          helper.skipUnlessVersion('>= 6.1.0', this)
          it('should match maps containing a string key in a nested context', function (done) {
            const args: QueryOptions = { filters: [filter.contains(null as any, 'banana', MAPKEYS, new Context().addMapKey('nested'))] }
            args.filters![0].indexName = 'qidxStrMapKeysNested'
            verifyQueryResults(args, 'nested string mapkeys match', done)
          })
        })




      })


      it('throws a type error if the comparison value is of invalid type', function () {
        const fn = () => filter.contains('list', { foo: 'bar' }, LIST)
        expect(fn).to.throw(TypeError)
      })

    })


  })
})
