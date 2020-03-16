// *****************************************************************************
// Copyright 2013-2020 Aerospike, Inc.
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

const helper = require('./test_helper')
const bigint = require('../lib/bigint')

describe('bigint', function () {
  context('BigInt supported - Node.js 10 and later', function () {
    helper.skipUnless(this, bigint.bigIntSupported)

    describe('BigInt', function () {
      it('is an alias for the built-in BigInt', function () {
        expect(bigint.BigInt(42)).to.eq(global.BigInt(42))
      })
    })
  })

  context('BigInt not supported - Node.js 8 and earlier', function () {
    helper.skipUnless(this, !bigint.bigIntSupported)

    describe('BigInt', function () {
      it('raises an exception if used', function () {
        expect(() => { bigint.BigInt(42) }).to.throw(Error, 'BigInt not supported')
      })
    })
  })
})
