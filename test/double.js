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

/* global expect, describe, it */

const Aerospike = require('../lib/aerospike')
const Double = Aerospike.Double
require('./test_helper.js')

describe('Aerospike.Double', function () {
  describe('constructor', function () {
    it('returns a new Double value when called as an Object constructor', function () {
      var subject = new Double(3.1415)
      expect(subject).to.be.a(Double)
      expect(subject.Double).to.be(3.1415)
    })

    it('returns a new Double value when called as function', function () {
      var subject = Double(3.1415)
      expect(subject).to.be.a(Double)
      expect(subject.Double).to.be(3.1415)
    })
  })

  describe('#value()', function () {
    var subject = new Double(3.1415)

    it('returns the double value', function () {
      expect(subject.value()).to.be(3.1415)
    })
  })
})
