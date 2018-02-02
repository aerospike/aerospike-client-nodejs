// *****************************************************************************
// Copyright 2013-2018 Aerospike, Inc.
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

'use strict'

/* global expect, describe, it */

const AerospikeError = require('../lib/error')
const status = require('../lib/status')

require('./test_helper.js')

describe('AerospikeError #noserver', function () {
  describe('constructor', function () {
    it('creates a new AerospikeError instance', function () {
      expect(new AerospikeError()).to.be.a(AerospikeError)
    })

    it('inherits from the Error class', function () {
      expect(new AerospikeError()).to.be.a(Error)
    })

    it('initializes the error with default values', function () {
      let subject = new AerospikeError()
      expect(subject.message).to.be('')
      expect(subject.code).to.be(status.ERR_CLIENT)
      expect(subject.command).to.be(null)
      expect(subject.func).to.be(null)
      expect(subject.file).to.be(null)
      expect(subject.line).to.be(null)
      expect(subject.inDoubt).to.be(false)
    })

    it('sets an error message', function () {
      let subject = new AerospikeError('Dooh!')
      expect(subject.message).to.be('Dooh!')
    })

    it('keeps a reference to the command', function () {
      let cmd = {}
      let subject = new AerospikeError('Dooh!', cmd)
      expect(subject.command).to.be(cmd)
    })

    it('captures a stacktrace', function () {
      let subject = new AerospikeError('Dooh!')
      let stack = subject.stack.split('\n')
      expect(stack).to.not.be.empty()
      expect(stack.shift()).to.be('AerospikeError: Dooh!')
    })

    it('copies the stacktrace of the command', function () {
      let cmd = {}
      Error.captureStackTrace(cmd)
      let subject = new AerospikeError('Dooh!', cmd)
      let expected = ['AerospikeError: Dooh!'].concat(cmd.stack.split('\n').slice(1)).join('\n')
      expect(subject.stack).to.equal(expected)
    })
  })

  describe('.fromASError', function () {
    it('copies the info from a AerospikeClient error instance', function () {
      let error = {
        code: -11,
        message: 'Dooh!',
        func: 'connect',
        file: 'lib/client.js',
        line: 101,
        inDoubt: true
      }
      let subject = AerospikeError.fromASError(error)
      expect(subject.code).to.be(-11)
      expect(subject.message).to.be('Dooh!')
      expect(subject.func).to.be('connect')
      expect(subject.file).to.be('lib/client.js')
      expect(subject.line).to.be(101)
      expect(subject.inDoubt).to.be(true)
    })

    it('replaces error codes with descriptive messages', function () {
      let error = {
        code: status.ERR_RECORD_NOT_FOUND,
        message: '127.0.0.1:3000 AEROSPIKE_ERR_RECORD_NOT_FOUND'
      }
      let subject = AerospikeError.fromASError(error)
      expect(subject.message).to.be('127.0.0.1:3000 Record does not exist in database. May be returned by read, or write with policy Aerospike.policy.exists.UPDATE')
    })

    it('returns an AerospikeError instance unmodified', function () {
      let error = new AerospikeError('Dooh!')
      expect(AerospikeError.fromASError(error)).to.equal(error)
    })

    it('returns null if the status code is OK', function () {
      let error = { code: status.OK }
      expect(AerospikeError.fromASError(error)).to.be(null)
    })

    it('returns null if no error is passed', function () {
      expect(AerospikeError.fromASError(null)).to.be(null)
    })
  })

  describe('#isServerError()', function () {
    it('returns true if the error code indicates a server error', function () {
      let error = { code: status.ERR_RECORD_NOT_FOUND }
      let subject = AerospikeError.fromASError(error)
      expect(subject.isServerError()).to.be(true)
    })

    it('returns false if the error code indicates a client error', function () {
      let error = { code: status.ERR_PARAM }
      let subject = AerospikeError.fromASError(error)
      expect(subject.isServerError()).to.be(false)
    })
  })

  describe('#toString()', function () {
    it('sets an informative error message', function () {
      let subject = new AerospikeError('Dooh!')
      expect(subject.toString()).to.eql('AerospikeError: Dooh!')
    })
  })
})
