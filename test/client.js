// *****************************************************************************
// Copyright 2016 Aerospike, Inc.
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
const Client = Aerospike.Client
const helper = require('./test_helper')

describe('Client', function () {
  describe('Client#isConnected', function () {
    var client = new Client(helper.config)

    it('returns false if the client is not connected', function () {
      expect(client.isConnected()).to.be(false)
    })

    it('returns true if the client is connected', function (done) {
      client.connect(function () {
        expect(client.isConnected()).to.be(true)
        done()
      })
    })
  })
})
