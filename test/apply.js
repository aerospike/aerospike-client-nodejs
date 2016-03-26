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

/* global expect, describe, it, before, after */

const Aerospike = require('../lib/aerospike')
const helper = require('./test_helper')

const keygen = helper.keygen

describe('client.apply()', function (done) {
  var client = helper.client

  before(function (done) {
    helper.udf.register('udf_test.lua', done)
  })

  after(function (done) {
    helper.udf.remove('udf_test.lua', done)
  })

  it('should invoke an UDF to without any args', function (done) {
    var udfArgs = { module: 'udf_test', funcname: 'rec_create' }
    var kgen = keygen.string(helper.namespace, helper.set, {prefix: 'test/apply/'})
    var key = kgen()

    client.apply(key, udfArgs, function (err, res) {
      expect(err).not.to.be.ok()
      expect(res).to.equal(0)

      client.remove(key, function (err, key) {
        if (err) throw err
        done()
      })
    })
  })

  it('should invoke an UDF with arguments', function (done) {
    var udfArgs = { module: 'udf_test', funcname: 'rec_update', args: [123, 'str'] }
    var kgen = keygen.string(helper.namespace, helper.set, {prefix: 'test/apply/'})
    var key = kgen()

    client.apply(key, udfArgs, function (err, res) {
      expect(err).not.to.be.ok()
      expect(res).to.equal(0)

      client.remove(key, function (err, key) {
        if (err) throw err
        done()
      })
    })
  })

  it('should invoke an UDF with apply policy', function (done) {
    var udfArgs = {module: 'udf_test', funcname: 'rec_update', args: [345, 'bar']}
    var kgen = keygen.string(helper.namespace, helper.set, {prefix: 'test/apply/'})
    var key = kgen()
    var applypolicy = {timeout: 1500}

    client.apply(key, udfArgs, applypolicy, function (err, res) {
      expect(err).not.to.be.ok()
      expect(res).to.equal(0)

      client.remove(key, function (err, key) {
        if (err) throw err
        done()
      })
    })
  })

  it('should invoke an UDF function which does not exist - expected to fail', function (done) {
    var udfArgs = { module: 'udf_test', funcname: 'rec_nofunc' }
    var kgen = keygen.string(helper.namespace, helper.set, {prefix: 'test/apply/'})
    var key = kgen()

    client.apply(key, udfArgs, function (err, res) {
      expect(err.code).to.equal(Aerospike.status.AEROSPIKE_ERR_UDF)
      done()
    })
  })
})
