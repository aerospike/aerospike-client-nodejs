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

/* global expect, describe, it */

const Aerospike = require('../lib/aerospike')
const Double = Aerospike.Double

require('./test_helper.js')

describe('Aerospike.Double #noserver', function () {
  describe('constructor', function () {
    it('returns a new Double value', function () {
      var subject = new Double(3.1415)

      expect(subject).to.be.instanceof(Double)
      expect(subject.Double).to.equal(3.1415)
    })

    it('throws an error if not passed a number', function () {
      const fn = () => new Double('four point nine')
      expect(fn).to.throw(TypeError)
    })

    it('throws an error if called without `new`', function () {
      const fn = () => Double(3.1415)
      expect(fn).to.throw('Invalid use of Double constructor')
    })
  })

  describe('#value()', function () {
    var subject = new Double(3.1415)

    it('returns the double value', function () {
      expect(subject.value()).to.equal(3.1415)
    })
  })
})
