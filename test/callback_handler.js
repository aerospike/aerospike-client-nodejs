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

/* global expect, describe, context, it, before, after */

const Aerospike = require('../lib/aerospike')
const AerospikeError = require('../lib/aerospike_error')
const Client = Aerospike.Client
require('./test_helper')

describe('Callback Handlers', function () {
  describe('Client.setCallbackHandler', function () {
    var origCallbackHandler
    before(function () { origCallbackHandler = Client.callbackHandler })
    after(function () { Client.setCallbackHandler(origCallbackHandler) })

    it('sets the callback handler for new client instances', function (done) {
      var customHandlerCalled = false
      var customHandler = function (cb, err, result) {
        customHandlerCalled = true
        cb(err, result)
      }
      Client.setCallbackHandler(customHandler)
      // invalid config to trigger an error callback
      var config = { hosts: [], log: { level: -1 } }
      Aerospike.connect(config, function (err) {
        expect(err).to.be.ok()
        expect(customHandlerCalled).to.be(true)
        done()
      })
    })
  })

  describe('Client.DefaultCallbackHandler', function () {
    var callbackHandler = Client.DefaultCallbackHandler

    context('error status is AEROSPIKE_OK', function () {
      var errIn = {code: Aerospike.status.AEROSPIKE_OK}

      it('it passes null as error param to callback', function (done) {
        var cb = function (errOut) {
          expect(errOut).to.be(null)
          done()
        }
        callbackHandler(cb, errIn)
      })

      it('it passes through the non-error callback parameters', function (done) {
        var resultIn = 'result value'
        var cb = function (errOut, resultOut) {
          expect(resultOut).to.eql(resultIn)
          done()
        }
        callbackHandler(cb, errIn, resultIn)
      })
    })

    context('error status is not AEROSPIKE_OK', function () {
      var errIn = {code: Aerospike.status.AEROSPIKE_NOT_FOUND, message: 'not found'}

      it('it converts the error into a AerospikeError object', function (done) {
        var cb = function (errOut) {
          expect(errOut).to.be.a(AerospikeError)
          expect(errOut.code).to.equal(Aerospike.status.AEROSPIKE_NOT_FOUND)
          expect(errOut.message).to.equal('not found')
          done()
        }
        callbackHandler(cb, errIn)
      })

      it('it does not pass the callback parameters', function (done) {
        var resultIn = 'result value'
        var cb = function (errOut, resultOut) {
          expect(resultOut).to.be(undefined)
          done()
        }
        callbackHandler(cb, errIn, resultIn)
      })
    })
  })

  describe('Client.LegacyCallbackHandler', function () {
    var callbackHandler = Client.LegacyCallbackHandler

    context('error status is AEROSPIKE_OK', function () {
      var errIn = {code: Aerospike.status.AEROSPIKE_OK}

      it('it passes the error in callback', function (done) {
        var cb = function (errOut) {
          expect(errOut).to.eql(errIn)
          done()
        }
        callbackHandler(cb, errIn)
      })

      it('it passes through the non-error callback parameters', function (done) {
        var resultIn = 'result value'
        var cb = function (errOut, resultOut) {
          expect(resultOut).to.eql(resultIn)
          done()
        }
        callbackHandler(cb, errIn, resultIn)
      })
    })

    context('error status is not AEROSPIKE_OK', function () {
      var errIn = {code: Aerospike.status.AEROSPIKE_NOT_FOUND, message: 'not found'}

      it('it passes through the error', function (done) {
        var cb = function (errOut) {
          expect(errOut).to.eql(errIn)
          done()
        }
        callbackHandler(cb, errIn)
      })

      it('it passes through the callback parameters', function (done) {
        var resultIn = 'result value'
        var cb = function (errOut, resultOut) {
          expect(resultOut).to.eql(resultIn)
          done()
        }
        callbackHandler(cb, errIn, resultIn)
      })
    })
  })
})
