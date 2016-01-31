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

var status = Aerospike.status
var language = Aerospike.language

describe('Aerospike.udfRegister()', function (done) {
  var config = options.getConfig()

  before(function (done) {
    Aerospike.connect(config, function (err) {
      if (err) { throw new Error(err.message) }
      done()
    })
  })

  after(function (done) {
    Aerospike.close()
    done()
  })

  it('should register an UDF file to aerospike cluster', function (done) {
    var dir = __dirname
    var filename = dir + '/udf_test.lua'
    Aerospike.udfRegister(filename, function (err) {
      expect(err).not.to.be.ok()
      done()
    })
  })

  it('should register an UDF file with a LUA type to aerospike cluster', function (done) {
    var dir = __dirname
    var filename = dir + '/udf_test.lua'
    Aerospike.udfRegister(filename, language.LUA, function (err) {
      expect(err).not.to.be.ok()
      done()
    })
  })

  it('should register an UDF file with a info policy to aerospike cluster', function (done) {
    var dir = __dirname
    var filename = dir + '/udf_test.lua'
    var infopolicy = { timeout: 1000, send_as_is: true, check_bounds: false }
    Aerospike.udfRegister(filename, infopolicy, function (err) {
      expect(err).not.to.be.ok()
      done()
    })
  })

  // it('should register an UDF file with a info policy and LUA type to aerospike cluster', function (done) {
  //   var dir = __dirname
  //   var filename = dir + '/udf_test.lua'
  //   var infopolicy = { timeout: 1000, send_as_is: true, check_bounds: false }
  //   Aerospike.udfRegister(filename, language.LUA, infopolicy, function (err) {
  //     expect(err).not.to.be.ok()
  //     done()
  //   })
  // })

  it('registering a non-existent UDF file to aerospike cluster - should fail', function (done) {
    var filename = 'test.lua'
    Aerospike.udfRegister(filename, function (err) {
      expect(err).to.be.ok()
      expect(err.code).to.equal(status.AEROSPIKE_ERR)
      done()
    })
  })

  it('should register an UDF file to aerospike cluster and wait until all registration is done across all nodes in Aerospike cluster', function (done) {
    var dir = __dirname
    var filename = dir + '/udf_test.lua'
    Aerospike.udfRegister(filename, function (err) {
      expect(err).not.to.be.ok()
      Aerospike.udfRegisterWait('udf_test.lua', 1000, function (err) {
        expect(err).not.to.be.ok()
        done()
      })
    })
  })
})
