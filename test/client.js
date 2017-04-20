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
const keygen = helper.keygen
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

  context('callbacks', function () {
    it('should raise an error when calling a command without passing a callback function', function () {
      expect(function () { helper.client.truncate('foo', 'bar') }).to.throwException(function (e) {
        expect(e).to.be.a(TypeError)
        expect(e.message).to.be('"callback" argument must be a function')
      })
    })

    // Execute a client command on a client instance that has been setup to
    // trigger an error; check that the error callback occurs asynchronously,
    // i.e. only after the command function has returned.
    // The get command is used for the test but the same behavior should apply
    // to all client commands.
    function assertErrorCbAsync (client, errorCb, done) {
      var checkpoints = []
      var checkAssertions = function (checkpoint) {
        checkpoints.push(checkpoint)
        if (checkpoints.length !== 2) return
        expect(checkpoints).to.eql(['after', 'callback'])
        client.close(false)
        done()
      }
      var key = keygen.string(helper.namespace, helper.set)()
      client.get(key, function (err, _record) {
        errorCb(err)
        checkAssertions('callback')
      })
      checkAssertions('after')
    }

    it('callback is asynchronous in case of an client error', function (done) {
      // trying to send a command to a client that is not connected will trigger a client error
      var client = Aerospike.client()
      var errorCheck = function (err) {
        expect(err).to.be.an(Error)
        expect(err.message).to.equal('Not connected.')
      }
      assertErrorCbAsync(client, errorCheck, done)
    })

    it('callback is asynchronous in case of an I/O error', function (done) {
      // maxConnsPerNode = 0 will trigger an error in the C client when trying to send a command
      var config = extend({ maxConnsPerNode: 0 }, helper.config)
      Aerospike.connect(config, function (err, client) {
        if (err) throw err
        var errorCheck = function (err) {
          expect(err).to.be.an(Error)
          expect(err.code).to.equal(Aerospike.status.AEROSPIKE_ERR_NO_MORE_CONNECTIONS)
        }
        assertErrorCbAsync(client, errorCheck, done)
      })
    })
  })

  describe('Client#captureStackTraces', function () {
    it('should capture stack traces that show the command being called', function (done) {
      var client = helper.client
      var key = keygen.string(helper.namespace, helper.set)()
      var orig = client.captureStackTraces
      client.captureStackTraces = true
      client.get(key, function (err) {
        expect(err.stack).to.match(/Client.get/)
        client.captureStackTraces = orig
        done()
      })
    })
  })
})
