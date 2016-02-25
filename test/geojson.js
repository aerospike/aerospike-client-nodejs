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
const GeoJSON = Aerospike.GeoJSON
require('./test_helper.js')

describe('Aerospike.GeoJSON', function () {
  var subject = new GeoJSON({type: 'Point', coordinates: [103.913, 1.308]})

  describe('constructor', function () {
    it('returns a new GeoJSON value when called as an Object constructor', function () {
      expect(new GeoJSON({type: 'Point', coordinates: [103.913, 1.308]})).to.be.a(GeoJSON)
    })

    it('returns a new GeoJSON value when called as function', function () {
      expect(GeoJSON({type: 'Point', coordinates: [103.913, 1.308]})).to.be.a(GeoJSON)
    })

    it('parses a GeoJSON string', function () {
      expect(new GeoJSON('{"type": "Point", "coordinates": [103.913, 1.308]}')).to.be.a(GeoJSON)
    })
  })

  describe('#value()', function () {
    it('returns the value as a JSON object', function () {
      expect(subject.value()).to.eql({type: 'Point', coordinates: [103.913, 1.308]})
    })
  })

  describe('#toJSON()', function () {
    it('returns the GeoJSON value as a JSON object', function () {
      expect(subject.toJSON()).to.eql({type: 'Point', coordinates: [103.913, 1.308]})
    })
  })

  describe('#toString()', function () {
    it('returns a string representation of the GeoJSON value', function () {
      expect(subject.toString()).to.equal('{"type":"Point","coordinates":[103.913,1.308]}')
    })
  })
})
