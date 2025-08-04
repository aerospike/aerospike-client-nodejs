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


import Aerospike, { Job as J, IndexJob as IJ, Client as Cli, AerospikeError } from 'aerospike';

import { expect } from 'chai'; 
import * as helper from './test_helper';

const Job: typeof J = Aerospike.Job
const IndexJob: typeof IJ = Aerospike.IndexJob

const Context = Aerospike.cdt.Context

context('secondary indexes', function () {
  const client: Cli = helper.client

  // generate unique index name for each test
  const testIndex: any = { name: null, bin: null, counter: 0 }
  beforeEach(() => {
    testIndex.counter++
    testIndex.name = 'idx-' + testIndex.counter + '-' + Math.floor(Math.random() * 10000000)
    testIndex.bin = 'bin-' + testIndex.counter + '-' + Math.floor(Math.random() * 10000000)
  })

  function verifyIndexExists (namespace: string, indexName: string) {
    const sindex = 'sindex/' + namespace + '/' + indexName
    const checkStatus = function () {
      return client.infoAll(sindex)
        .then(() => true)
        .catch((error: any) => {
          if (error.code !== Aerospike.status.ERR_INDEX_NOT_FOUND) {
            return Promise.reject(error)
          }
          return false
        })
    }
    return (Job as any).pollUntilDone(checkStatus, 10)
      .then(() => helper.index.remove(indexName))
  }

  describe('Client#indexCreate()', function () {
    it('returns an IndexJob instance', function () {
      const options = {
        ns: helper.namespace,
        set: helper.set,
        exp: Aerospike.exp.binInt(testIndex.bin),
        index: testIndex.name,
        datatype: Aerospike.indexDataType.NUMERIC
      }

      return client.createExpIndex(options)
        .then((job: IJ) => expect(job).to.be.instanceof(IndexJob))
        .then(() => verifyIndexExists(helper.namespace, testIndex.name))
    })

    it('should create a complex index on list', function () {
      const options = {
        ns: helper.namespace,
        set: helper.set,
        exp: Aerospike.exp.binList(testIndex.bin),
        index: testIndex.name,
        type: Aerospike.indexType.LIST,
        datatype: Aerospike.indexDataType.NUMERIC
      }

      return client.createExpIndex(options)
        .then(() => verifyIndexExists(helper.namespace, testIndex.name))
    })

    it('should create an integer index with info policy', function () {
      const options = {
        ns: helper.namespace,
        set: helper.set,
        exp: Aerospike.exp.binInt(testIndex.bin),
        index: testIndex.name,
        datatype: Aerospike.indexDataType.NUMERIC
      }
      const policy = new Aerospike.InfoPolicy({
        timeout: 100
      })

      return client.createExpIndex(options, policy)
        .then(() => verifyIndexExists(helper.namespace, testIndex.name))
    })

    it('re-creating an index with identical options returns an error (success with new server, verify the existence)', function () {
      const options = {
        ns: helper.namespace,
        set: helper.set,
        exp: Aerospike.exp.binInt(testIndex.bin),
        index: testIndex.name,
        datatype: Aerospike.indexDataType.NUMERIC
      }

      return client.createExpIndex(options)
        .then((job: IJ) => job.wait(10))
        .then(() => client.createExpIndex(options)
          .catch((error: any) => {
            if (error.code === Aerospike.status.ERR_INDEX_FOUND ||
              error.code === Aerospike.status.AEROSPIKE_OK) {
              // All good!
              verifyIndexExists(helper.namespace, testIndex.name)
            } else {
              return Promise.reject(error)
            }
          }))
    })
  })

  describe('Client#createIntegerIndex()', function () {
    it('should create an integer index', function () {
      const options = {
        ns: helper.namespace,
        set: helper.set,
        exp: Aerospike.exp.binInt(testIndex.bin),
        index: testIndex.name
      }

      return client.createExpIntegerIndex(options)
        .then(() => verifyIndexExists(helper.namespace, testIndex.name))
    })
  })

  describe('Client#createStringIndex()', function () {
    it('should create an string index', function () {
      const args = {
        ns: helper.namespace,
        set: helper.set,
        exp: Aerospike.exp.binStr(testIndex.bin),
        index: testIndex.name
      }

      return client.createExpStringIndex(args)
        .then(() => verifyIndexExists(helper.namespace, testIndex.name))
    })
  })

  describe('Client#createGeo2DSphereIndex()', function () {
    it('should create a geospatial index', function () {
      const args = {
        ns: helper.namespace,
        set: helper.set,
        exp: Aerospike.exp.binGeo(testIndex.bin),
        index: testIndex.name
      }

      return client.createExpGeo2DSphereIndex(args)
        .then(() => verifyIndexExists(helper.namespace, testIndex.name))
    })
  })

  describe('Client#createBlobIndex()', function () {
    helper.skipUnlessVersion('>= 7.0.0', this)
    it('should create a blob index', function () {
      const args = {
        ns: helper.namespace,
        set: helper.set,
        exp: Aerospike.exp.binBlob(testIndex.bin),
        index: testIndex.name
      }

      return client.createExpBlobIndex(args)
        .then(() => verifyIndexExists(helper.namespace, testIndex.name))
    })
  })

  describe('Client#indexRemove()', async function () {
    beforeEach(async () => {
      await helper.index.createExpIndex(testIndex.name, helper.set, Aerospike.exp.binStr(testIndex.bin),
        Aerospike.indexDataType.STRING, Aerospike.indexType.DEFAULT)
    })

    it('should drop an index', async function () {
      // Wait for index creation to complete
      this.timeout(10000)
      await new Promise(resolve => setTimeout(resolve, 5000))

      // Do query on the secondary index to ensure proper creation.
      let query = client.query(helper.namespace, helper.set)
      query.whereWithExp(Aerospike.filter.equal(null, 'value'), Aerospike.exp.binStr(testIndex.bin))
      await query.results()

      await client.indexRemove(helper.namespace, testIndex.name)

      // Do query on the secondary index to ensure proper deletion
      query = client.query(helper.namespace, helper.set)
      query.whereWithExp(Aerospike.filter.equal(null, 'value'), Aerospike.exp.binStr(testIndex.bin))
      try {
        await query.results()
        // Fail test if this code is reached
        expect('fail').to.equal('now')
      } catch (error: any) {
        expect(error.code).to.equal(201)
        expect('pass').to.equal('pass')
      }
    })

    it('should return a Promise if called without callback function', async function () {
      return await client.indexRemove(helper.namespace, testIndex.name)
    })
  })
})
