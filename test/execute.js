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
var aerospike = require('../build/Release/aerospike')
var options = require('./util/options')
var expect = require('expect.js')

var keygen = require('./generators/key')

var status = aerospike.status

describe('client.execute()', function (done) {
  var config = options.getConfig()
  var client = aerospike.client(config)

  before(function (done) {
    client.connect(function (err) {
      if (err && err.code !== status.AEROSPIKE_OK) { throw new Error(err.message) }
      client.udfRegister(__dirname + '/udf_test.lua', function (err) {
        expect(err.code).to.equal(status.AEROSPIKE_OK)
        client.udfRegisterWait('udf_test.lua', 10, function (err) {
          expect(err.code).to.equal(status.AEROSPIKE_OK)
          done()
        })
      })
    })
  })

  after(function (done) {
    client.udfRemove('udf_test.lua', function () {})
    client.close()
    client = null
    done()
  })

  it('should invoke an UDF to without any args', function (done) {
    var udfArgs = { module: 'udf_test', funcname: 'rec_create' }
    var kgen = keygen.string(options.namespace, options.set, {prefix: 'test/udfExecute/'})
    var key = kgen()
    client.execute(key, udfArgs, function (err, res) {
      expect(err).to.be.ok()
      expect(err.code).to.equal(status.AEROSPIKE_OK)
      expect(res).to.equal(0)
      client.remove(key, function (err, key) {
        if (err && err.code !== status.AEROSPIKE_OK) { throw new Error(err.message) }
        done()
      })
    })
  })

  it('should invoke an UDF with arguments', function (done) {
    var udfArgs = { module: 'udf_test', funcname: 'rec_update', args: [123, 'str'] }
    var kgen = keygen.string(options.namespace, options.set, {prefix: 'test/udfExecute/'})
    var key = kgen()
    client.execute(key, udfArgs, function (err, res) {
      expect(err).to.be.ok()
      expect(err.code).to.equal(status.AEROSPIKE_OK)
      expect(res).to.equal(0)
      client.remove(key, function (err, key) {
        if (err && err.code !== status.AEROSPIKE_OK) { throw new Error(err.message) }
        done()
      })
    })
  })

  it('should invoke an UDF with apply policy', function (done) {
    var udfArgs = {module: 'udf_test', funcname: 'rec_update', args: [345, 'bar']}
    var kgen = keygen.string(options.namespace, options.set, {prefix: 'test/udfExecute/'})
    var key = kgen()
    var applypolicy = {timeout: 1500}
    client.execute(key, udfArgs, applypolicy, function (err, res) {
      expect(err).to.be.ok()
      expect(err.code).to.equal(status.AEROSPIKE_OK)
      expect(res).to.equal(0)
      client.remove(key, function (err, key) {
        if (err && err.code !== status.AEROSPIKE_OK) { throw new Error(err.message) }
        done()
      })
    })
  })

  it('should invoke an UDF function which does not exist - expected to fail', function (done) {
    var udfArgs = { module: 'udf_test', funcname: 'rec_nofunc' }
    var kgen = keygen.string(options.namespace, options.set, {prefix: 'test/udfExecute/'})
    var key = kgen()
    client.execute(key, udfArgs, function (err, res, key) {
      expect(err).to.be.ok()
      if (err.code !== 1300) {
        expect(err.code).to.equal(status.AEROSPIKE_ERR_UDF)
      } else {
        expect(err.code).to.equal(1300)
      }
      done()
    })
  })
})
