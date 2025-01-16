// *****************************************************************************
// Copyright 2013-2024 Aerospike, Inc.
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
/* eslint-disable no-unused-expressions */

import Aerospike, { AerospikeError, status as statusModule } from 'aerospike';

import { expect } from 'chai'; 
import * as helper from './test_helper';

const ASError: typeof AerospikeError = Aerospike.AerospikeError
const status: typeof statusModule = Aerospike.status

require('./test_helper.js')

describe('AerospikeError #noserver', function () {
  describe('constructor', function () {
    it('creates a new AerospikeError instance', function () {
      expect(new ASError()).to.be.instanceof(ASError)
    })

    it('inherits from the Error class', function () {
      expect(new ASError()).to.be.instanceof(Error)
    })

    it('initializes the error with default values', function () {
      const subject: AerospikeError = new ASError()
      expect(subject).to.have.property('message', '')
      expect(subject).to.have.property('code', status.ERR_CLIENT)
      expect(subject).to.have.property('command', null)
      expect(subject).to.have.property('func', null)
      expect(subject).to.have.property('file', null)
      expect(subject).to.have.property('line', null)
      expect(subject).to.have.property('inDoubt', false)
    })

    it('sets an error message', function () {
      const subject = new ASError('Dooh!')
      expect(subject).to.have.property('message', 'Dooh!')
    })

    it('keeps a reference to the command', function () {
      const cmd = {}
      const subject = new ASError('Dooh!', cmd)
      expect(subject).to.have.property('command', cmd)
    })

    it('captures a stacktrace', function () {
      const subject = new ASError('Dooh!')
      expect(subject).to.have.property('stack')
        .that.is.a('string')
        .that.includes('AerospikeError: Dooh!')
    })

    it('copies the stacktrace of the command', function () {
      const cmd: any = { name: 'AerospikeError', message: 'Dooh!' }
      Error.captureStackTrace(cmd)
      const subject = new ASError('Dooh!', cmd)
      expect(subject).to.have.property('stack')
        .that.is.a('string')
        .that.equals(cmd.stack)
    })
  })

  describe('.fromASError', function () {
    it('copies the info from a AerospikeClient error instance', function () {
      const error: any = {
        code: -11,
        message: 'Dooh!',
        func: 'connect',
        file: 'lib/client.js',
        line: 101,
        inDoubt: true
      }
      const subject = (ASError as any).fromASError(error)
      expect(subject).to.have.property('code', -11)
      expect(subject).to.have.property('message', 'Dooh!')
      expect(subject).to.have.property('func', 'connect')
      expect(subject).to.have.property('file', 'lib/client.js')
      expect(subject).to.have.property('line', 101)
      expect(subject).to.have.property('inDoubt', true)
    })

    it('replaces error codes with descriptive messages', function () {
      const error: any = {
        code: status.ERR_RECORD_NOT_FOUND,
        message: '127.0.0.1:3000 AEROSPIKE_ERR_RECORD_NOT_FOUND'
      }
      const subject = (ASError as any).fromASError(error)
      expect(subject.message).to.equal('127.0.0.1:3000 Record does not exist in database. May be returned by read, or write with policy Aerospike.policy.exists.UPDATE.')
    })

    it('returns an AerospikeError instance unmodified', function () {
      const error: any = new AerospikeError('Dooh!')
      expect((ASError as any).fromASError(error)).to.equal(error)
    })

    it('returns null if the status code is OK', function () {
      const error: any = { code: status.OK }
      expect((ASError as any).fromASError(error)).to.be.null
    })

    it('returns null if no error is passed', function () {
      expect((ASError as any).fromASError(null)).to.be.null
    })
  })

  describe('#isServerError()', function () {
    it('returns true if the error code indicates a server error', function () {
      const error: any = { code: status.ERR_RECORD_NOT_FOUND }
      const subject = (ASError as any).fromASError(error)
      expect(subject.isServerError()).to.be.true
    })

    it('returns false if the error code indicates a client error', function () {
      const error: any = { code: status.ERR_PARAM }
      const subject = (ASError as any).fromASError(error)
      expect(subject.isServerError()).to.be.false
    })
  })

  describe('#toString()', function () {
    it('sets an informative error message', function () {
      const subject: AerospikeError = new ASError('Dooh!')
      expect(subject.toString()).to.eql('AerospikeError: Dooh!')
    })
  })
})
