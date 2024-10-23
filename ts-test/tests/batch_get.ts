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

/* global expect, describe, it */
/* eslint-disable no-unused-expressions */

import Aerospike, { AerospikeRecord, KeyOptions, BatchResult, Client, Key } from 'aerospike';
import * as helper from './test_helper';
import { expect } from 'chai';

const keygen = helper.keygen
const metagen = helper.metagen
const recgen = helper.recgen
const putgen = helper.putgen
const valgen = helper.valgen

describe('client.batchGet()', function () {
  const client: Client = helper.client

  it('should successfully read 10 records', function () {
    const numberOfRecords = 10
    const generators: any = {
      keygen: keygen.string(helper.namespace, helper.set, { prefix: 'test/batch_get/success', random: false }),
      recgen: recgen.record({ i: valgen.integer(), s: valgen.string(), b: valgen.bytes() }),
      metagen: metagen.constant({ ttl: 1000 })
    }
    return putgen.put(numberOfRecords, generators)
      .then((records: AerospikeRecord[]) => {
        const keys: KeyOptions[]  = records.map((record: AerospikeRecord) => record.key)
        return client.batchGet(keys)
          .then((results: BatchResult[]) => {
            expect(results.length).to.equal(numberOfRecords)
            results.forEach((result?: BatchResult) => {
              const putRecord: AerospikeRecord | undefined = records.find((record: AerospikeRecord) => record.key.key === result?.record.key.key)
              expect(result?.status).to.equal(Aerospike.status.OK)
              expect(result?.record.bins).to.eql(putRecord?.bins)
            })
          })
      })
  })

  it('should fail reading 10 records', function (done) {
    const numberOfRecords = 10
    const kgen: any = keygen.string(helper.namespace, helper.set, { prefix: 'test/batch_get/fail/', random: false })
    const keys: Key[] = keygen.range(kgen, numberOfRecords)
    client.batchGet(keys, function (err?: Error, results?: BatchResult[]) {
      expect(err).not.to.be.ok
      expect(results?.length).to.equal(numberOfRecords)
      results?.forEach(function (result: BatchResult) {
        expect(result.status).to.equal(Aerospike.status.ERR_RECORD_NOT_FOUND)
      })
      done()
    })
  })

  it('returns an empty array when no keys are passed', () => {
    client.batchGet([])
      .then((results: BatchResult[]) => expect(results).to.eql([]))
  })
})