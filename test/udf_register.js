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

const status = Aerospike.status
const language = Aerospike.language

describe('client.udfRegister()', function (done) {
  var client = helper.client

  it('should register an UDF file to aerospike cluster', function (done) {
    var dir = __dirname
    var filename = dir + '/udf_test.lua'
    client.udfRegister(filename, function (err) {
      expect(err).not.to.be.ok()
      done()
    })
  })

  it('should register an UDF file with a LUA type to aerospike cluster', function (done) {
    var dir = __dirname
    var filename = dir + '/udf_test.lua'
    client.udfRegister(filename, language.LUA, function (err) {
      expect(err).not.to.be.ok()
      done()
    })
  })

  it('should register an UDF file with a info policy to aerospike cluster', function (done) {
    var dir = __dirname
    var filename = dir + '/udf_test.lua'
    var infopolicy = { timeout: 1000, send_as_is: true, check_bounds: false }
    client.udfRegister(filename, infopolicy, function (err) {
      expect(err).not.to.be.ok()
      done()
    })
  })

  it('should register an UDF file with a info policy and LUA type to aerospike cluster', function (done) {
    var dir = __dirname
    var filename = dir + '/udf_test.lua'
    var infopolicy = { timeout: 1000, send_as_is: true, check_bounds: false }
    client.udfRegister(filename, language.LUA, infopolicy, function (err) {
      expect(err).not.to.be.ok()
      done()
    })
  })

  it('registering a non-existent UDF file to aerospike cluster - should fail', function (done) {
    var filename = 'test.lua'
    client.udfRegister(filename, function (err) {
      expect(err).to.be.ok()
      expect(err.code).to.equal(status.AEROSPIKE_ERR)
      done()
    })
  })

  it('should register an UDF file to aerospike cluster and wait until all registration is done across all nodes in Aerospike cluster', function (done) {
    var dir = __dirname
    var filename = dir + '/udf_test.lua'
    client.udfRegister(filename, function (err) {
      expect(err).not.to.be.ok()
      client.udfRegisterWait('udf_test.lua', 1000, function (err) {
        expect(err).not.to.be.ok()
        done()
      })
    })
  })
})
