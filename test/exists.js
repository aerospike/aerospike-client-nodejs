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
const valgen = helper.valgen

const status = Aerospike.status

describe('client.exists()', function () {
  var client = helper.client

  it('should find the record', function (done) {
    var kgen = keygen.string(helper.namespace, helper.set, {prefix: 'test/exists/'})
    var mgen = metagen.constant({ttl: 1000})
    var rgen = recgen.record({i: valgen.integer(), s: valgen.string(), b: valgen.bytes()})

    var key = kgen()
    var meta = mgen(key)
    var record = rgen(key, meta)

    client.put(key, record, meta, function (err) {
      if (err) throw err

      client.exists(key, function (err, metadata) {
        expect(err).not.to.be.ok()

        client.remove(key, function (err) {
          if (err) throw err
          done()
        })
      })
    })
  })

  it('should not find the record', function (done) {
    var kgen = keygen.string(helper.namespace, helper.set, {prefix: 'test/exists/fail/'})

    var key = kgen()

    client.exists(key, function (err, metadata, key) {
      expect(err.code).to.equal(status.AEROSPIKE_ERR_RECORD_NOT_FOUND)
      done()
    })
  })
})
