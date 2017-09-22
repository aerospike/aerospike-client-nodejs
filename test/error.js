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

/* global expect, describe, it */

const AerospikeError = require('../lib/aerospike_error')
require('./test_helper.js')

describe('AerospikeError', function () {
  describe('new AerospikeError()', function () {
    it('creates a new AerospikeError instance', function () {
      expect(new AerospikeError()).to.be.a(AerospikeError)
    })

    it('inherits from the Error class', function () {
      expect(new AerospikeError()).to.be.a(Error)
    })

    it('sets the error code, message, function, file and line information', function () {
      var subject = new AerospikeError(-1, 'client error', 'connect', 'lib/client.js', 101)
      expect(subject.code).to.be(-1)
      expect(subject.message).to.be('client error')
      expect(subject.func).to.be('connect')
      expect(subject.file).to.be('lib/client.js')
      expect(subject.line).to.be(101)
    })

    it('captures a stack trace', function () {
      var subject = new AerospikeError(-1, 'client error', 'connect', 'lib/client.js', 101)
      var stack = subject.stack.split('\n')
      expect(stack).to.not.be.empty()
      expect(stack.shift()).to.be('AerospikeError: client error')
    })
  })

  describe('.fromASError', function () {
    it('copies the info from a AerospikeClient error instance', function () {
      var error = {code: -1, message: 'client error', func: 'connect', file: 'lib/client.js', line: 101}
      var subject = AerospikeError.fromASError(error)
      expect(subject.code).to.be(-1)
      expect(subject.message).to.be('client error')
      expect(subject.func).to.be('connect')
      expect(subject.file).to.be('lib/client.js')
      expect(subject.line).to.be(101)
    })

    it('returns an AerospikeError instance unmodified', function () {
      let error = new AerospikeError(-1, 'client error', 'connect', 'lib/client.js', 101)
      expect(AerospikeError.fromASError(error)).to.equal(error)
    })
  })

  describe('#toString()', function () {
    it('sets an informative error message', function () {
      var subject = new AerospikeError(-1, 'client error', 'connect', 'lib/client.js', 101)
      expect(subject.toString()).to.eql('AerospikeError: client error')
    })
  })
})
