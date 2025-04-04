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

import Aerospike, { BatchResult, AerospikeRecord, Client, Key} from 'aerospike';
import * as helper from './test_helper';
import { expect } from 'chai';

const keygen = helper.keygen
const metagen = helper.metagen
const recgen = helper.recgen
const putgen = helper.putgen
const valgen = helper.valgen

describe('client.batchExists()', function () {
  const client: Client = helper.client

  it('should successfully find 10 records', function () {
    const numberOfRecords = 10
    const generators: any = {
      keygen: keygen.string(helper.namespace, helper.set, { prefix: 'test/batch_exists/10/', random: false }),
      recgen: recgen.record({ i: valgen.integer(), s: valgen.string(), b: valgen.bytes() }),
      metagen: metagen.constant({ ttl: 1000 })
    }
    return putgen.put(numberOfRecords, generators)
      .then((records: AerospikeRecord[]) => {
        const keys = records.map((record: AerospikeRecord) => record.key)
        return client.batchExists(keys)
      })
      .then((results: BatchResult[]) => {
        expect(results.length).to.equal(numberOfRecords)
        results.forEach((result: BatchResult) => {
          expect(result.status).to.equal(Aerospike.status.OK)
          expect(result.record).to.be.instanceof(Aerospike.Record)
        })
      })
  })

  it('should fail finding 10 records', function (done) {
    const numberOfRecords: number = 10
    const kgen: any = keygen.string(helper.namespace, helper.set, { prefix: 'test/batch_exists/fail/', random: false })
    const keys: Key[] = keygen.range(kgen, numberOfRecords)

    client.batchExists(keys, function (err?: Error, results?: BatchResult[]) {
      expect(err).not.to.be.ok
      expect(results?.length).to.equal(numberOfRecords)
      results?.forEach(function (result: BatchResult) {
        expect(result.status).to.equal(Aerospike.status.ERR_RECORD_NOT_FOUND)
      })
      done()
    })
  })

  it('returns an empty array when no keys are passed', () => {
    client.batchExists([])
      .then((results: BatchResult[]) => expect(results).to.eql([]))
  })
})
