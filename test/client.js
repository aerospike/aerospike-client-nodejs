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

/* global context, expect, describe, it */

const Aerospike = require('../lib/aerospike')
const Client = Aerospike.Client
const helper = require('./test_helper')
const extend = require('util')._extend

describe('Client', function () {
  describe('Client#isConnected', function () {
    context('without tender health check', function () {
      it('returns false if the client is not connected', function () {
        var client = new Client(helper.config)
        expect(client.isConnected(false)).to.be(false)
      })

      it('returns true if the client is connected', function (done) {
        var client = new Client(helper.config)
        client.connect(function () {
          expect(client.isConnected(false)).to.be(true)
          client.close(false)
          done()
        })
      })

      it('returns false after the connection is closed', function (done) {
        var client = new Client(helper.config)
        client.connect(function () {
          client.close(false)
          expect(client.isConnected(false)).to.be(false)
          done()
        })
      })
    })

    context('with tender health check', function () {
      it("calls the Aerospike C client library's isConnected() method", function (done) {
        var client = new Client(helper.config)
        var orig = client.as_client.isConnected
        client.connect(function () {
          var tenderHealthCheck = false
          client.as_client.isConnected = function () { tenderHealthCheck = true; return false }
          expect(client.isConnected(true)).to.be(false)
          expect(tenderHealthCheck).to.be(true)
          client.as_client.isConnected = orig
          client.close(false)
          done()
        })
      })
    })
  })

  context('cluster name', function () {
    it('should fail to connect to the cluster if the cluster name does not match', function (done) {
      var config = extend({}, helper.config)
      config.clusterName = 'notAValidClusterName'
      var client = new Client(config)
      client.connect(function (err) {
        expect(err.code).to.be(Aerospike.status.AEROSPIKE_ERR_CLIENT)
        client.close(false)
        done()
      })
    })
  })
})
