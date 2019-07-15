// *****************************************************************************
// Copyright 2013-2019 Aerospike, Inc.
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

/* eslint-env mocha */
/* global expect */

require('./test_helper')
const Command = require('../lib/commands/command')

describe('Command', function () {
  context('Extend Command', function () {
    class TestCommand extends Command('testCmd') {
      foo () { return 'bar' }
    }

    it('creates subclasses with informative constructor names', function () {
      const cmd = new TestCommand({})
      expect(cmd.constructor.name).to.equal('TestCommand')
    })

    it('keeps a reference to the client instance', function () {
      const client = {}
      const cmd = new TestCommand(client)
      expect(cmd.client).to.equal(client)
    })
  })
})
