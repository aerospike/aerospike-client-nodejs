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

/* global describe, it */

// we want to test the built aerospike module
const aerospike = require('../lib/aerospike')
const helper = require('./test_helper')
const expect = require('expect.js')

const status = aerospike.status

describe('client.udfRemove()', function (done) {
  var client = helper.client

  it('should remove an UDF module with a info policy from aerospike cluster', function (done) {
    var dir = __dirname
    var filename = dir + '/udf_test.lua'
    var infopolicy = { timeout: 1000, send_as_is: true, check_bounds: false }
    client.udfRegister(filename, infopolicy, function (err) {
      expect(err).not.to.be.ok()
      client.udfRemove('udf_test.lua', infopolicy, function (err) {
        expect(err).not.to.be.ok()
        done()
      })
    })
  })

  it('remove non-existent UDF module from aerospike cluster - should fail', function (done) {
    var filename = 'noudf.lua'
    client.udfRemove(filename, function (err) {
      expect(err).to.be.ok()
      expect(err.code).to.equal(status.AEROSPIKE_ERR_UDF)
      done()
    })
  })
})
