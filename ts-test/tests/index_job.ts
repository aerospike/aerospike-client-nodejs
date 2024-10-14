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

/* global expect, beforeEach, afterEach, describe, it */
/* eslint-disable no-unused-expressions */


import Aerospike, { AerospikeError as ASError, IndexJob as IJ } from 'aerospike';

import { expect } from 'chai'; 
import * as helper from './test_helper';

const AerospikeError: typeof ASError = Aerospike.AerospikeError
const IndexJob: typeof IJ = Aerospike.IndexJob

describe('IndexJob', function () {
  const client = helper.client
  const testIndex: any = { name: null, bin: null, counter: 0 }
  beforeEach(function () {
    testIndex.counter++
    testIndex.name = 'idx-' + testIndex.counter + '-' + Math.floor(Math.random() * 10000000)
    testIndex.bin = 'bin-' + testIndex.counter + '-' + Math.floor(Math.random() * 10000000)
  })
  afterEach(() => helper.index.remove(testIndex.name))

  describe('IndexJob#waitUntilDone()', function () {
    it('should wait until the index creation is completed', function (done) {
      const options = {
        ns: helper.namespace,
        set: helper.set,
        bin: testIndex.bin,
        index: testIndex.name
      }
      client.createIntegerIndex(options, function (err?: ASError, job?: IJ) {
        if (err) throw err

        job?.waitUntilDone(10, function (err?: ASError) {
          expect(err).to.not.be.ok
          done()
        })
      })
    })
  })

  describe('IndexJob#checkStatus()', function () {
    it('should return a boolean indicating whether the job is done or not', function () {
      const options = {
        ns: helper.namespace,
        set: helper.set,
        bin: testIndex.bin,
        index: testIndex.name
      }
      return client.createIntegerIndex(options)
        .then((job: any) => job.checkStatus())
        .then((status: boolean) => expect(status).to.be.a('boolean'))
    })

    it('should return false if the index does not exist', function () {
      const job: any = new IndexJob(client, helper.namespace, 'thisIndexDoesNotExist')
      return job.checkStatus()
        .then((status: boolean) => expect(status).to.be.false)
    })
    /*
    it('should return an error if one of the cluster nodes cannot be queried', function () {
      const client = Aerospike.client() // not connected, should return error when info command is executed
      const job: any = new IndexJob(client, helper.ns, 'thisIndexDoesNotExist')
      return job.checkStatus()
        .then(() => { throw new Error('Expected promise to reject') })
        .catch((error: any) => expect(error).to.be.instanceof(AerospikeError))
    })
    */
  })
})
