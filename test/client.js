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

/* global after, afterEach, before, beforeEach, context, expect, describe, it */

const Aerospike = require('../lib/aerospike')
const Client = Aerospike.Client
const helper = require('./test_helper')
const extend = require('util')._extend

describe('Client', function () {
  describe('Client#isConnected', function () {
    var client = null
    beforeEach(function () {
      client = new Client(helper.config)
    })
    afterEach(function () {
      client.close(false)
    })

    context('without tender health check', function () {
      it('returns false if the client is not connected', function () {
        expect(client.isConnected(false)).to.be(false)
      })

      it('returns true if the client is connected', function (done) {
        client.connect(function () {
          expect(client.isConnected(false)).to.be(true)
          done()
        })
      })

      it('returns false after the connection is closed', function (done) {
        client.connect(function () {
          client.close(false)
          expect(client.isConnected(false)).to.be(false)
          done()
        })
      })
    })

    context('with tender health check', function () {
      var orig = null
      before(function () { orig = client.as_client.isConnected })
      after(function () { client.as_client.isConnected = orig })

      it("calls the Aerospike C client libraries' isConnected() method", function (done) {
        client.connect(function () {
          var tenderHealthCheck = false
          client.as_client.isConnected = function () { tenderHealthCheck = true; return false }
          expect(client.isConnected(true)).to.be(false)
          expect(tenderHealthCheck).to.be(true)
          done()
        })
      })
    })

    context('cluster ID', function () {
      it('should fail to connect to the cluster if the cluster ID does not match', function (done) {
        var config = extend({}, helper.config)
        config.clusterID = 'notAValidClusterId'
        client = new Client(config)

        client.connect(function (err) {
          expect(err.code).to.be(Aerospike.status.AEROSPIKE_ERR_CLIENT)
          done()
        })
      })
    })
  })
})
