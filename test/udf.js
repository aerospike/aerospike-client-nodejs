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

/* global context, it, expect */

const path = require('path')

const Aerospike = require('../lib/aerospike')
const helper = require('./test_helper')

context('registering/unregistering UDF modules', function () {
  var client = helper.client
  var module = 'udf.lua'
  var filename = path.join(__dirname, module)

  it('should register and then remove a module', function (done) {
    client.udfRegister(filename, function (err, registerJob) {
      if (err) throw err
      registerJob.waitUntilDone(10, function (err) {
        if (err) throw err
        client.udfRemove(module, function (err, removeJob) {
          if (err) throw err
          removeJob.waitUntilDone(10, done)
        })
      })
    })
  })

  it('should register a module as Lua language', function (done) {
    client.udfRegister(filename, Aerospike.language.LUA, function (err, registerJob) {
      if (err) throw err
      registerJob.waitUntilDone(10, function (err) {
        if (err) throw err
        client.udfRemove(module, function (err, removeJob) {
          if (err) throw err
          removeJob.waitUntilDone(10, done)
        })
      })
    })
  })

  it('should register a module with an info policy', function (done) {
    var policy = { timeout: 1000, send_as_is: true, check_bounds: false }
    client.udfRegister(filename, policy, function (err, registerJob) {
      if (err) throw err
      registerJob.waitUntilDone(10, function (err) {
        if (err) throw err
        client.udfRemove(module, function (err, removeJob) {
          if (err) throw err
          removeJob.waitUntilDone(10, done)
        })
      })
    })
  })

  it('should register a module as Lua language with an info policy', function (done) {
    var policy = { timeout: 1000, send_as_is: true, check_bounds: false }
    client.udfRegister(filename, Aerospike.language.LUA, policy, function (err, registerJob) {
      if (err) throw err
      registerJob.waitUntilDone(10, function (err) {
        if (err) throw err
        client.udfRemove(module, function (err, removeJob) {
          if (err) throw err
          removeJob.waitUntilDone(10, done)
        })
      })
    })
  })

  context('error handling', function () {
    it('should fail to register an non-existent module', function (done) {
      client.udfRegister('no-such-udf.lua', function (err) {
        expect(err.code).to.be(Aerospike.status.AEROSPIKE_ERR)
        done()
      })
    })

    it('should fail to register module with invalid language', function (done) {
      client.udfRegister(filename, -99, function (err) {
        expect(err.code).to.be(Aerospike.status.AEROSPIKE_ERR_PARAM)
        done()
      })
    })

    it('should fail to remove a non-existent module', function (done) {
      client.udfRemove('no-such-udf.lua', function (err) {
        expect(err.code).to.be(Aerospike.status.AEROSPIKE_ERR_UDF)
        done()
      })
    })
  })
})
