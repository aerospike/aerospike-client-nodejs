// *****************************************************************************
// Copyright 2013-2017 Aerospike, Inc.
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
const recgen = helper.recgen
const valgen = helper.valgen

const status = Aerospike.status

describe('client.select()', function () {
  var client = helper.client

  it('should read the record', function (done) {
    var key = keygen.string(helper.namespace, helper.set, {prefix: 'test/select/'})()
    var meta = {ttl: 1000}
    var bins = recgen.record({i: valgen.integer(), s: valgen.string(), b: valgen.bytes()})()
    var selected = ['i', 's']

    client.put(key, bins, meta, function (err) {
      if (err) throw err

      client.select(key, selected, function (err, record) {
        if (err) throw err
        expect(record.bins).to.only.have.keys(selected)

        for (var bin in selected) {
          expect(record.bins[bin]).to.be(bins[bin])
        }

        client.remove(key, function (err) {
          if (err) throw err
          done()
        })
      })
    })
  })

  it('should fail - when a select is called without key', function (done) {
    var key = keygen.string(helper.namespace, helper.set, {prefix: 'test/select/'})()
    var meta = {ttl: 1000}
    var bins = recgen.record({i: valgen.integer(), s: valgen.string(), b: valgen.bytes()})()
    var selected = ['i', 's']

    client.put(key, bins, meta, function (err) {
      if (err) throw err

      client.select({ns: helper.namespace, set: helper.set}, selected, function (err) {
        expect(err.code).to.equal(status.AEROSPIKE_ERR_PARAM)

        client.remove(key, function (err) {
          if (err) throw err
          done()
        })
      })
    })
  })

  it('should not find the record', function (done) {
    var key = keygen.string(helper.namespace, helper.set, {prefix: 'test/select/not_found/'})()

    client.select(key, ['i'], function (err, record) {
      expect(err.code).to.equal(status.AEROSPIKE_ERR_RECORD_NOT_FOUND)
      done()
    })
  })

  it('should read the record w/ a key send policy', function (done) {
    var key = keygen.string(helper.namespace, helper.set, {prefix: 'test/select/'})()
    var meta = {ttl: 1000}
    var bins = recgen.record({i: valgen.integer(), s: valgen.string(), b: valgen.bytes()})()
    var selected = ['i', 's']
    var policy = {key: Aerospike.policy.key.SEND}

    client.put(key, bins, meta, function (err) {
      if (err) throw err

      client.select(key, selected, policy, function (err, record) {
        if (err) throw err
        expect(record.bins).to.only.have.keys(selected)

        for (var bin in selected) {
          expect(record.bins[bin]).to.be(bins[bin])
        }

        client.remove(key, function (err) {
          if (err) throw err
          done()
        })
      })
    })
  })

  it('should return a Promise that resolves to a Record', function () {
    var key = keygen.string(helper.namespace, helper.set, {prefix: 'test/select/'})()

    return client.put(key, {i: 42, s: 'abc', f: 3.1416})
      .then(() => client.select(key, ['i', 'f']))
      .then(record => expect(record.bins).to.eql({i: 42, f: 3.1416}))
      .then(() => client.remove(key))
  })
})
