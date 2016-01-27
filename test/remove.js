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

/* global describe, it, before, after */

// we want to test the built aerospike module
var Aerospike = require('../lib/aerospike')
var options = require('./util/options')
var expect = require('expect.js')

var keygen = require('./generators/key')
var metagen = require('./generators/metadata')
var recgen = require('./generators/record')
var valgen = require('./generators/value')

var status = Aerospike.status

describe('Aerospike.remove()', function () {
  var config = options.getConfig()

  // before(function (done) {
  //   Aerospike.connect(function (err) {
  //     if (err) { throw new Error(err.message) }
  //     done()
  //   })
  // })
  //
  // after(function (done) {
  //   Aerospike.close()
  //   client = null
  //   done()
  // })

  it('should remove a record w/ string key', function (done) {
    Aerospike.connect(config, function (err) {
      // generators
      var kgen = keygen.string(options.namespace, options.set, {prefix: 'test/get/'})
      var mgen = metagen.constant({ttl: 1000})
      var rgen = recgen.record({i: valgen.integer(), s: valgen.string(), b: valgen.bytes()})

      // values
      var key = kgen()
      var meta = mgen(key)
      var record = rgen(key, meta)

      // write the record then check
      Aerospike.put(key, record, meta, function (err, key) {
        if (err) { throw new Error(err.message) }

        Aerospike.get(key, function (err, record, metadata, key) {
          if (err) { throw new Error(err.message) }

          Aerospike.remove(key, function (err, key, status) {

            Aerospike.get(key, function (err, record, metadata, key) {
              // expect(err).to.be.ok()
              // expect(err.code).to.equal(status.AEROSPIKE_ERR_RECORD_NOT_FOUND)
              done()
            })
          })
        })
      })
    })
  })

  it('should remove a record w/ integer key', function (done) {
    // generators
    var kgen = keygen.integer(options.namespace, options.set)
    var mgen = metagen.constant({ttl: 1000})
    var rgen = recgen.record({i: valgen.integer(), s: valgen.string(), b: valgen.bytes()})

    // values
    var key = kgen()
    var meta = mgen(key)
    var record = rgen(key, meta)

    // write the record then check
    Aerospike.put(key, record, meta, function (err, key) {
      if (err) { throw new Error(err.message) }

      Aerospike.get(key, function (err, record, metadata, key) {
        if (err) { throw new Error(err.message) }

        Aerospike.remove(key, function (err, key, status) {
          expect(err).not.to.be.ok()

          Aerospike.get(key, function (err, record, metadata, key) {
            // expect(err).to.be.ok()
            // expect(err.code).to.equal(status.AEROSPIKE_ERR_RECORD_NOT_FOUND)
            done()
          })
        })
      })
    })
  })

  it('should not remove a non-existent key', function (done) {
    // generators
    var kgen = keygen.string(options.namespace, options.set, {prefix: 'test/not_found/'})

    // values
    var key = kgen()

    Aerospike.remove(key, function (err, key) {
      // expect(err).to.be.ok()
      // expect(err.code).to.equal(status.AEROSPIKE_ERR_RECORD_NOT_FOUND)
      done()
    })
  })
})
