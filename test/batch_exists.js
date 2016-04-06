// *****************************************************************************
// Copyright 2013-2016 Aerospike, Inc.
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

/* global expect, describe, it */

const Aerospike = require('../lib/aerospike')
const helper = require('./test_helper')

const keygen = helper.keygen
const metagen = helper.metagen
const recgen = helper.recgen
const putgen = helper.putgen
const valgen = helper.valgen

const status = Aerospike.status

describe('client.batchExists()', function () {
  var client = helper.client

  it('should successfully find 10 records', function (done) {
    // number of records
    var nrecords = 10

    // generators
    var kgen = keygen.string(helper.namespace, helper.set, {prefix: 'test/batch_exists/10/', random: false})
    var mgen = metagen.constant({ttl: 1000})
    var rgen = recgen.record({i: valgen.integer(), s: valgen.string(), b: valgen.bytes()})

    // writer using generators
    // callback provides an array of written keys
    putgen.put(nrecords, kgen, rgen, mgen, function (written) {
      var keys = Object.keys(written).map(function (key) {
        return written[key].key
      })

      var len = keys.length
      expect(len).to.equal(nrecords)

      client.batchExists(keys, function (err, results) {
        expect(err).not.to.be.ok()
        expect(results.length).to.equal(len)

        for (var i = 0; i < results.length; i++) {
          expect(results[i].status).to.equal(status.AEROSPIKE_OK)
        }
        done()
      })
    })
  })

  it('should fail finding 10 records', function (done) {
    // number of records
    var nrecords = 10

    // generators
    var kgen = keygen.string(helper.namespace, helper.set, {prefix: 'test/batch_exists/fail/', random: false})
    var keys = keygen.range(kgen, nrecords)

    client.batchExists(keys, function (err, results) {
      expect(err).not.to.be.ok()
      expect(results.length).to.equal(nrecords)

      for (var i = 0; i < results.length; i++) {
        expect(results[i].status).to.equal(status.AEROSPIKE_ERR_RECORD_NOT_FOUND)
      }
      done()
    })
  })
})
