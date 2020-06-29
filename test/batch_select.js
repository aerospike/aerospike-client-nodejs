// *****************************************************************************
// Copyright 2013-2019 Aerospike, Inc.
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

const Aerospike = require('../lib/aerospike')
const helper = require('./test_helper')

const keygen = helper.keygen
const metagen = helper.metagen
const recgen = helper.recgen
const putgen = helper.putgen
const valgen = helper.valgen

describe('client.batchSelect()', function () {
  var client = helper.client

  it('should successfully read bins from 10 records', function () {
    const numberOfRecords = 10
    const generators = {
      keygen: keygen.string(helper.namespace, helper.set, { prefix: 'test/batch_get/success', random: false }),
      recgen: recgen.record({ i: valgen.integer(), s: valgen.string(), b: valgen.bytes() }),
      metagen: metagen.constant({ ttl: 1000 })
    }
    return putgen.put(numberOfRecords, generators)
      .then(records => {
        const keys = records.map(record => record.key)
        return client.batchSelect(keys, ['i', 's'])
      })
      .then(results => {
        expect(results.length).to.equal(numberOfRecords)
        results.forEach(result => {
          expect(result.status).to.equal(Aerospike.status.OK)
          expect(result.record.bins).to.have.all.keys('i', 's')
        })
      })
  })

  it('should fail reading bins from non-existent records', function (done) {
    var numberOfRecords = 10
    var kgen = keygen.string(helper.namespace, helper.set, { prefix: 'test/batch_get/fail', random: false })
    var keys = keygen.range(kgen, numberOfRecords)
    var bins = ['i', 's']
    client.batchSelect(keys, bins, function (err, results) {
      expect(err).not.to.be.ok()
      expect(results.length).to.equal(numberOfRecords)
      results.forEach(function (result) {
        expect(result.status).to.equal(Aerospike.status.ERR_RECORD_NOT_FOUND)
      })
      done()
    })
  })

  it('returns an empty array when no keys are passed', () => {
    client.batchExists([], ['i'])
      .then(results => expect(results).to.eql([]))
  })
})
