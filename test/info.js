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

describe('client.info()', function () {
  var client = helper.client

  it('should get "objects" from specific host in cluster', function (done) {
    var options = helper.options
    var host = {addr: options.host, port: options.port}
    client.info('objects', host, function (err, response, host) {
      expect(err).not.to.be.ok()
      expect(response.indexOf('objects\t')).to.eql(0)
      done()
    })
  })
})
