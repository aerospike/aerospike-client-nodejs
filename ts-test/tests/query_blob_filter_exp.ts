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

  if (!helper.cluster.isVersionInRange('>= 7.0.0')) {
    helper.skip(this, "Blob indexes require server version 7.0.0 or greater")
  }
  
  const testSet = 'test/query-' + Math.floor(Math.random() * 100000)
  samples = [
    { name: 'blob match', blob: Buffer.from('guava') },
    { name: 'blob non-match', blob: Buffer.from('pumpkin') },
    { name: 'blob list match', lblob: [Buffer.from('guava'), Buffer.from('papaya')] },
    { name: 'blob list non-match', lblob: [Buffer.from('pumpkin'), Buffer.from('turnip')] },
    { name: 'blob map match', mblob: { a: Buffer.from('guava'), b: Buffer.from('papaya') } },
    { name: 'blob map non-match', mblob: { a: Buffer.from('pumpkin'), b: Buffer.from('turnip') } },
    { name: 'blob mapkeys match', mkblob: new Map([[Buffer.from('guava'), 1], [Buffer.from('papaya'), 2]]) },
    { name: 'blob mapkeys non-match', mkblob: new Map([[Buffer.from('pumpkin'), 3], [Buffer.from('turnip'), 4]]) },
    { name: 'nested blob match', blob: { nested: Buffer.from('guava') } },
    { name: 'nested blob non-match', blob: { nested: Buffer.from('pumpkin') } },
    { name: 'nested blob list match', lblob: { nested: [Buffer.from('guava'), Buffer.from('papaya')] } },
    { name: 'nested blob list non-match', lblob: { nested: [Buffer.from('pumpkin'), Buffer.from('turnip')] } },
    { name: 'nested blob map match', mblob: { nested: { a: Buffer.from('guava'), b: Buffer.from('papaya') } } },
    { name: 'nested blob map non-match', mblob: { nested: { a: Buffer.from('pumpkin'), b: Buffer.from('turnip') } } },
    { name: 'nested blob mapkeys match', mkblob: { nested: new Map([[Buffer.from('guava'), 1], [Buffer.from('papaya'), 2]]) } },
    { name: 'nested blob mapkeys non-match', mkblob: { nested: new Map([[Buffer.from('pumpkin'), 3], [Buffer.from('turnip'), 4]]) } },

  ]

  const indexes: any = [


    //['qidxBlob', 'blob', BLOB],
    //['qidxBlobList', 'lblob', BLOB, LIST],
    //['qidxBlobMap', 'mblob', BLOB, MAPVALUES],
    //['qidxBlobMapKeys', 'mkblob', BLOB, MAPKEYS],
    //['qidxBlobListNested', 'lblob', BLOB, LIST, new Context().addMapKey('nested')],
    //['qidxBlobMapNested', 'mblob', BLOB, MAPVALUES, new Context().addMapKey('nested')],
    //['qidxBlobMapKeysNested', 'mkblob', BLOB, MAPKEYS, new Context().addMapKey('nested')],

    ['qidxBlobExp', exp.binBlob('blob'), BLOB],
    ['qidxBlobListExp', exp.binList('lblob'), BLOB, LIST],
    ['qidxBlobMapExp', exp.binMap('mblob'), BLOB, MAPVALUES],
    ['qidxBlobMapKeysExp', exp.binMap('mkblob'), BLOB, MAPKEYS],

    //['qidxBlobExp', exp.binBlob('blob'), BLOB],
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
      promises.push(helper.index.createExpIndex(idx[0], testSet, idx[1], idx[2], idx[3]))

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

      context('Uses blob Secondary indexes', function () {
        helper.skipUnlessVersion('>= 7.0.0', this)

        it('should match equal blob values using an expression', function (done) {
          const args: QueryOptions = { filters: [filter.equal(null, Buffer.from('guava'))] }
          args.filters![0].exp = exp.binBlob('blob')
          verifyQueryResults(args, 'blob match', done)
        })
      })


      context('Uses blob Secondary indexes', function () {
        helper.skipUnlessVersion('>= 7.0.0', this)


        it('should match lists containing a blob', function (done) {
          const args: QueryOptions = { filters: [filter.contains(null, Buffer.from('guava'), LIST)] }
          args.filters![0].exp = exp.binList('lblob')
          verifyQueryResults(args, 'blob list match', done)
        })


        it('should match maps containing a blob value', function (done) {
          const args: QueryOptions = { filters: [filter.contains(null, Buffer.from('guava'), MAPVALUES)] }
          args.filters![0].exp = exp.binMap('mblob')
          verifyQueryResults(args, 'blob map match', done)
        })


        it('should match maps containing a blob key', function (done) {
          const args: QueryOptions = { filters: [filter.contains(null, Buffer.from('guava'), MAPKEYS)] }
          args.filters![0].exp = exp.binMap('mkblob')
          verifyQueryResults(args, 'blob mapkeys match', done)
        })

      })
    })


  })

})
