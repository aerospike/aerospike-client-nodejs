// *****************************************************************************
// Copyright 2013-2016 Aerospike, Inc.
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

/* global expect, describe, context, it */

const Aerospike = require('../lib/aerospike')
const helper = require('./test_helper')

const maps = Aerospike.maps

describe('client.operate() - CDT Map operations', function () {
  var client = helper.client
  var key = null

  function setup (record, done) {
    key = helper.keygen.string(helper.namespace, helper.set, {prefix: 'cdt_map/'})()
    var meta = { ttl: 600 }
    var policy = { exists: Aerospike.policy.exists.CREATE_OR_REPLACE }
    client.put(key, record, meta, policy, function (err) {
      if (err) throw err
      done()
    })
  }

  function teardown (done) {
    client.remove(key, done)
  }

  // Helper method to execute a single operation on the given record and verify:
  // 1) The results returned by the operation,
  // 2) The contents of the record after the operation.
  function verifyOperation (record, ops, expectedResult, expectedRecordPostOp, done) {
    setup(record, function () {
      if (!Array.isArray(ops)) {
        ops = [ops]
      }
      client.operate(key, ops, function (err, result) {
        if (err) return done(err)
        expect(result).to.eql(expectedResult)
        client.get(key, function (err, record) {
          if (err) throw err
          expect(record).to.eql(expectedRecordPostOp)
          teardown(done)
        })
      })
    })
  }

  describe('maps.setPolicy', function () {
    it('changes the map order', function (done) {
      helper.cluster.supports_feature('cdt-map') || this.skip('cdt-maps feature not supported')
      var record = { map: {c: 1, b: 2, a: 3} }
      var operations = [
        maps.setPolicy('map', { order: maps.order.KEY_ORDERED }),
        maps.getByKeyRange('map', 'a', 'z', maps.returnType.KEY)
      ]
      var expectedResult = { map: ['a', 'b', 'c'] }
      verifyOperation(record, operations, expectedResult, record, done)
    })
  })

  describe('maps.put', function () {
    it('adds the item to the map and returns the size of the map', function (done) {
      helper.cluster.supports_feature('cdt-map') || this.skip('cdt-maps feature not supported')
      var record = { map: {a: 1, b: 2, c: 3} }
      var operation = maps.put('map', 'd', 99)
      var expectedResult = { map: 4 }
      var expectedRecord = { map: {a: 1, b: 2, c: 3, d: 99} }
      verifyOperation(record, operation, expectedResult, expectedRecord, done)
    })

    it('replaces the item and returns the size of the map', function (done) {
      helper.cluster.supports_feature('cdt-map') || this.skip('cdt-maps feature not supported')
      var record = { map: {a: 1, b: 2, c: 3} }
      var operation = maps.put('map', 'b', 99)
      var expectedResult = { map: 3 }
      var expectedRecord = { map: {a: 1, b: 99, c: 3} }
      verifyOperation(record, operation, expectedResult, expectedRecord, done)
    })

    it('creates a new map if it does not exist yet', function (done) {
      helper.cluster.supports_feature('cdt-map') || this.skip('cdt-maps feature not supported')
      var record = { i: 1 }
      var operation = maps.put('map', 'a', 1)
      var expectedResult = { map: 1 }
      var expectedRecord = { i: 1, map: {a: 1} }
      verifyOperation(record, operation, expectedResult, expectedRecord, done)
    })

    it('fails if the bin does not contain a map', function (done) {
      helper.cluster.supports_feature('cdt-map') || this.skip('cdt-maps feature not supported')
      var record = { map: 'this is not a map' }
      var operation = maps.put('map', 'a', 1)
      verifyOperation(record, operation, null, null, function (err) {
        expect(err.code).to.equal(Aerospike.status.AEROSPIKE_ERR_BIN_INCOMPATIBLE_TYPE)
        teardown(done)
      })
    })

    context('update-only write mode', function () {
      it('overwrites an existing key', function (done) {
        helper.cluster.supports_feature('cdt-map') || this.skip('cdt-maps feature not supported')
        var record = { map: {a: 1, b: 2, c: 3} }
        var policy = { writeMode: maps.writeMode.UPDATE_ONLY }
        var operation = maps.put('map', 'b', 99, policy)
        var expectedResult = { map: 3 }
        var expectedRecord = { map: {a: 1, b: 99, c: 3} }
        verifyOperation(record, operation, expectedResult, expectedRecord, done)
      })

      it('fails to write a non-existing key', function (done) {
        helper.cluster.supports_feature('cdt-map') || this.skip('cdt-maps feature not supported')
        var record = { map: {a: 1, b: 2, c: 3} }
        var policy = { writeMode: maps.writeMode.UPDATE_ONLY }
        var operation = maps.put('map', 'd', 99, policy)
        verifyOperation(record, operation, null, null, function (err) {
          expect(err.code).to.equal(Aerospike.status.AEROSPIKE_ERR_FAIL_ELEMENT_NOT_FOUND)
          teardown(done)
        })
      })
    })

    context('create-only write mode', function () {
      it('fails to overwrite an existing key', function (done) {
        helper.cluster.supports_feature('cdt-map') || this.skip('cdt-maps feature not supported')
        var record = { map: {a: 1, b: 2, c: 3} }
        var policy = { writeMode: maps.writeMode.CREATE_ONLY }
        var operation = maps.put('map', 'b', 99, policy)
        verifyOperation(record, operation, null, null, function (err) {
          expect(err.code).to.equal(Aerospike.status.AEROSPIKE_ERR_FAIL_ELEMENT_EXISTS)
          teardown(done)
        })
      })

      it('creates a new key if it does not exist', function (done) {
        helper.cluster.supports_feature('cdt-map') || this.skip('cdt-maps feature not supported')
        var record = { map: {a: 1, b: 2, c: 3} }
        var policy = { writeMode: maps.writeMode.CREATE_ONLY }
        var operation = maps.put('map', 'd', 99, policy)
        var expectedResult = { map: 4 }
        var expectedRecord = { map: {a: 1, b: 2, c: 3, d: 99} }
        verifyOperation(record, operation, expectedResult, expectedRecord, done)
      })
    })
  })

  describe('maps.putItems', function () {
    it('adds each item to the map and returns the size of the map', function (done) {
      helper.cluster.supports_feature('cdt-map') || this.skip('cdt-maps feature not supported')
      var record = { map: {a: 1, b: 2, c: 3} }
      var operation = maps.putItems('map', { c: 99, d: 100 })
      var expectedResult = { map: 4 }
      var expectedRecord = { map: {a: 1, b: 2, c: 99, d: 100} }
      verifyOperation(record, operation, expectedResult, expectedRecord, done)
    })
  })

  describe('maps.increment', function () {
    it('increments the value of the entry and returns the final value', function (done) {
      helper.cluster.supports_feature('cdt-map') || this.skip('cdt-maps feature not supported')
      var record = { map: {a: 1, b: 2, c: 3} }
      var operation = maps.increment('map', 'b', 10)
      var expectedResult = { map: 12 }
      var expectedRecord = { map: {a: 1, b: 12, c: 3} }
      verifyOperation(record, operation, expectedResult, expectedRecord, done)
    })

    it('creates a new entry if the key does not exist yet', function (done) {
      helper.cluster.supports_feature('cdt-map') || this.skip('cdt-maps feature not supported')
      var record = { map: {a: 1, b: 2, c: 3} }
      var operation = maps.increment('map', 'd', 10)
      var expectedResult = { map: 10 }
      var expectedRecord = { map: {a: 1, b: 2, c: 3, d: 10} }
      verifyOperation(record, operation, expectedResult, expectedRecord, done)
    })
  })

  describe('maps.decrement', function () {
    it('decrements the value of the entry and returns the final value', function (done) {
      helper.cluster.supports_feature('cdt-map') || this.skip('cdt-maps feature not supported')
      var record = { map: {a: 1, b: 12, c: 3} }
      var operation = maps.decrement('map', 'b', 10)
      var expectedResult = { map: 2 }
      var expectedRecord = { map: {a: 1, b: 2, c: 3} }
      verifyOperation(record, operation, expectedResult, expectedRecord, done)
    })

    it('creates a new entry if the key does not exist yet', function (done) {
      helper.cluster.supports_feature('cdt-map') || this.skip('cdt-maps feature not supported')
      var record = { map: {a: 1, b: 2, c: 3} }
      var operation = maps.decrement('map', 'd', 1)
      var expectedResult = { map: -1 }
      var expectedRecord = { map: {a: 1, b: 2, c: 3, d: -1} }
      verifyOperation(record, operation, expectedResult, expectedRecord, done)
    })
  })

  describe('maps.clear', function () {
    it('removes all entries from the map', function (done) {
      helper.cluster.supports_feature('cdt-map') || this.skip('cdt-maps feature not supported')
      var record = { map: {a: 1, b: 12, c: 3} }
      var operation = maps.clear('map')
      var expectedResult = { map: null }
      var expectedRecord = { map: { } }
      verifyOperation(record, operation, expectedResult, expectedRecord, done)
    })
  })

  describe('maps.removeByKey', function () {
    it('removes a map entry identified by key', function (done) {
      helper.cluster.supports_feature('cdt-map') || this.skip('cdt-maps feature not supported')
      var record = { map: {a: 1, b: 2, c: 3} }
      var operation = maps.removeByKey('map', 'b', maps.returnType.VALUE)
      var expectedResult = { map: 2 }
      var expectedRecord = { map: {a: 1, c: 3} }
      verifyOperation(record, operation, expectedResult, expectedRecord, done)
    })

    it('does not fail when removing a non-existing key', function (done) {
      helper.cluster.supports_feature('cdt-map') || this.skip('cdt-maps feature not supported')
      var record = { map: {a: 1, b: 2, c: 3} }
      var operation = maps.removeByKey('map', 'd', maps.returnType.VALUE)
      var expectedResult = { map: null }
      verifyOperation(record, operation, expectedResult, record, done)
    })
  })

  describe('maps.removeByKeyList', function () {
    it('removes map entries identified by one or more keys', function (done) {
      helper.cluster.supports_feature('cdt-map') || this.skip('cdt-maps feature not supported')
      var record = { map: {a: 1, b: 2, c: 3} }
      var operation = maps.removeByKeyList('map', ['a', 'c'], maps.returnType.VALUE)
      var expectedResult = { map: [1, 3] }
      var expectedRecord = { map: {b: 2} }
      verifyOperation(record, operation, expectedResult, expectedRecord, done)
    })

    it('skips non-existent keys', function (done) {
      helper.cluster.supports_feature('cdt-map') || this.skip('cdt-maps feature not supported')
      var record = { map: {a: 1, b: 2, c: 3} }
      var operation = maps.removeByKeyList('map', ['a', 'x', 'y', 'z', 'c'], maps.returnType.VALUE)
      var expectedResult = { map: [1, 3] }
      var expectedRecord = { map: {b: 2} }
      verifyOperation(record, operation, expectedResult, expectedRecord, done)
    })
  })

  describe('maps.removeByKeyRange', function () {
    it('removes map entries identified by key range', function (done) {
      helper.cluster.supports_feature('cdt-map') || this.skip('cdt-maps feature not supported')
      var record = { map: {a: 1, b: 2, c: 3, d: 4} }
      var operations = [
        maps.setPolicy('map', { order: maps.order.KEY_ORDERED }),
        maps.removeByKeyRange('map', 'b', 'd', maps.returnType.VALUE)
      ]
      var expectedResult = { map: [2, 3] }
      var expectedRecord = { map: {a: 1, d: 4} }
      verifyOperation(record, operations, expectedResult, expectedRecord, done)
    })

    it('removes all keys from the specified start key until the end', function (done) {
      helper.cluster.supports_feature('cdt-map') || this.skip('cdt-maps feature not supported')
      var record = { map: {a: 1, b: 2, c: 3, d: 4} }
      var operations = [
        maps.setPolicy('map', { order: maps.order.KEY_ORDERED }),
        maps.removeByKeyRange('map', 'b', null, maps.returnType.VALUE)
      ]
      var expectedResult = { map: [2, 3, 4] }
      var expectedRecord = { map: {a: 1} }
      verifyOperation(record, operations, expectedResult, expectedRecord, done)
    })

    it('removes all keys from the start to the specified end', function (done) {
      helper.cluster.supports_feature('cdt-map') || this.skip('cdt-maps feature not supported')
      var record = { map: {a: 1, b: 2, c: 3, d: 4} }
      var operations = [
        maps.setPolicy('map', { order: maps.order.KEY_ORDERED }),
        maps.removeByKeyRange('map', null, 'b', maps.returnType.VALUE)
      ]
      var expectedResult = { map: [1] }
      var expectedRecord = { map: {b: 2, c: 3, d: 4} }
      verifyOperation(record, operations, expectedResult, expectedRecord, done)
    })
  })

  describe('maps.removeByValue', function () {
    it('removes a map entry identified by value', function (done) {
      helper.cluster.supports_feature('cdt-map') || this.skip('cdt-maps feature not supported')
      var record = { map: {a: 1, b: 2, c: 3} }
      var operation = maps.removeByValue('map', 2, maps.returnType.RANK)
      var expectedResult = { map: [1] }
      var expectedRecord = { map: {a: 1, c: 3} }
      verifyOperation(record, operation, expectedResult, expectedRecord, done)
    })
  })

  describe('maps.removeByValueList', function () {
    it('removes map entries identified by one or more values', function (done) {
      helper.cluster.supports_feature('cdt-map') || this.skip('cdt-maps feature not supported')
      var record = { map: {a: 1, b: 2, c: 3} }
      var operation = maps.removeByValueList('map', [1, 3], maps.returnType.RANK)
      var expectedResult = { map: [0, 2] }
      var expectedRecord = { map: {b: 2} }
      verifyOperation(record, operation, expectedResult, expectedRecord, done)
    })

    it('skips non-existent values', function (done) {
      helper.cluster.supports_feature('cdt-map') || this.skip('cdt-maps feature not supported')
      var record = { map: {a: 1, b: 2, c: 3} }
      var operation = maps.removeByValueList('map', [1, 99, 3], maps.returnType.RANK)
      var expectedResult = { map: [0, 2] }
      var expectedRecord = { map: {b: 2} }
      verifyOperation(record, operation, expectedResult, expectedRecord, done)
    })
  })

  describe('maps.removeByValueRange', function () {
    it('removes map entries identified by value range', function (done) {
      helper.cluster.supports_feature('cdt-map') || this.skip('cdt-maps feature not supported')
      var record = { map: {a: 1, b: 2, c: 2, d: 3} }
      var operation = maps.removeByValueRange('map', 2, 3, maps.returnType.RANK)
      var expectedResult = { map: [1, 2] }
      var expectedRecord = { map: {a: 1, d: 3} }
      verifyOperation(record, operation, expectedResult, expectedRecord, done)
    })

    it('removes all keys from the specified start value until the end', function (done) {
      helper.cluster.supports_feature('cdt-map') || this.skip('cdt-maps feature not supported')
      var record = { map: {a: 1, b: 2, c: 3} }
      var operation = maps.removeByValueRange('map', 2, null, maps.returnType.RANK)
      var expectedResult = { map: [1, 2] }
      var expectedRecord = { map: {a: 1} }
      verifyOperation(record, operation, expectedResult, expectedRecord, done)
    })

    it('removes all keys from the start to the specified end value', function (done) {
      helper.cluster.supports_feature('cdt-map') || this.skip('cdt-maps feature not supported')
      var record = { map: {a: 1, b: 2, c: 3} }
      var operation = maps.removeByValueRange('map', null, 2, maps.returnType.RANK)
      var expectedResult = { map: [0] }
      var expectedRecord = { map: {b: 2, c: 3} }
      verifyOperation(record, operation, expectedResult, expectedRecord, done)
    })
  })

  describe('maps.removeByIndex', function () {
    it('removes a map entry identified by index', function (done) {
      helper.cluster.supports_feature('cdt-map') || this.skip('cdt-maps feature not supported')
      var record = { map: {a: 1, b: 2, c: 3} }
      var operation = maps.removeByIndex('map', 1, maps.returnType.KEY)
      var expectedResult = { map: 'b' }
      var expectedRecord = { map: {a: 1, c: 3} }
      verifyOperation(record, operation, expectedResult, expectedRecord, done)
    })
  })

  describe('maps.removeByIndexRange', function () {
    it('removes map entries identified by index range', function (done) {
      helper.cluster.supports_feature('cdt-map') || this.skip('cdt-maps feature not supported')
      var record = { map: {a: 1, b: 2, c: 2, d: 3} }
      var operation = maps.removeByIndexRange('map', 1, 2, maps.returnType.KEY)
      var expectedResult = { map: ['b', 'c'] }
      var expectedRecord = { map: {a: 1, d: 3} }
      verifyOperation(record, operation, expectedResult, expectedRecord, done)
    })

    it('removes all map entries starting at the specified index if count is null', function (done) {
      helper.cluster.supports_feature('cdt-map') || this.skip('cdt-maps feature not supported')
      var record = { map: {a: 1, b: 2, c: 3} }
      var operation = maps.removeByIndexRange('map', 1, null, maps.returnType.KEY)
      var expectedResult = { map: ['b', 'c'] }
      var expectedRecord = { map: {a: 1} }
      verifyOperation(record, operation, expectedResult, expectedRecord, done)
    })

    it('removes all map entries starting at the specified index if count is undefined', function (done) {
      helper.cluster.supports_feature('cdt-map') || this.skip('cdt-maps feature not supported')
      var record = { map: {a: 1, b: 2, c: 3} }
      var operation = maps.removeByIndexRange('map', 1)
      var expectedResult = { map: null }
      var expectedRecord = { map: {a: 1} }
      verifyOperation(record, operation, expectedResult, expectedRecord, done)
    })
  })

  describe('maps.removeByRank', function () {
    it('removes a map entry identified by rank', function (done) {
      helper.cluster.supports_feature('cdt-map') || this.skip('cdt-maps feature not supported')
      var record = { map: {a: 3, b: 2, c: 1} }
      var operation = maps.removeByRank('map', 0, maps.returnType.VALUE)
      var expectedResult = { map: 1 }
      var expectedRecord = { map: {a: 3, b: 2} }
      verifyOperation(record, operation, expectedResult, expectedRecord, done)
    })
  })

  describe('maps.removeByRankRange', function () {
    it('removes map entries identified by rank range', function (done) {
      helper.cluster.supports_feature('cdt-map') || this.skip('cdt-maps feature not supported')
      var record = { map: {a: 3, b: 2, c: 1} }
      var operation = maps.removeByRankRange('map', 0, 2, maps.returnType.VALUE)
      var expectedResult = { map: [1, 2] }
      var expectedRecord = { map: {a: 3} }
      verifyOperation(record, operation, expectedResult, expectedRecord, done)
    })

    it('removes all map entries starting at the specified rank until the end', function (done) {
      helper.cluster.supports_feature('cdt-map') || this.skip('cdt-maps feature not supported')
      var record = { map: {a: 3, b: 2, c: 1} }
      var operation = maps.removeByRankRange('map', 1, null, maps.returnType.VALUE)
      var expectedResult = { map: [2, 3] }
      var expectedRecord = { map: {c: 1} }
      verifyOperation(record, operation, expectedResult, expectedRecord, done)
    })
  })

  describe('maps.size', function () {
    it('returns the size of the map', function (done) {
      helper.cluster.supports_feature('cdt-map') || this.skip('cdt-maps feature not supported')
      var record = { map: {a: 1, b: 2, c: 3} }
      var operation = maps.size('map')
      var expectedResult = { map: 3 }
      verifyOperation(record, operation, expectedResult, record, done)
    })

    it('returns zero if the map is empty', function (done) {
      helper.cluster.supports_feature('cdt-map') || this.skip('cdt-maps feature not supported')
      var record = { map: { } }
      var operation = maps.size('map')
      var expectedResult = { map: 0 }
      verifyOperation(record, operation, expectedResult, record, done)
    })

    it('returns null if the map does not exist', function (done) {
      helper.cluster.supports_feature('cdt-map') || this.skip('cdt-maps feature not supported')
      var record = { i: 1 }
      var operation = maps.size('map')
      var expectedResult = { map: null }
      verifyOperation(record, operation, expectedResult, record, done)
    })
  })

  describe('maps.getByKey', function () {
    it('fetches a map entry identified by key', function (done) {
      helper.cluster.supports_feature('cdt-map') || this.skip('cdt-maps feature not supported')
      var record = { map: {a: 1, b: 2, c: 3} }
      var operation = maps.getByKey('map', 'b', maps.returnType.KEY_VALUE)
      var expectedResult = { map: ['b', 2] }
      verifyOperation(record, operation, expectedResult, record, done)
    })

    it('does not fail if the key does not exist', function (done) {
      helper.cluster.supports_feature('cdt-map') || this.skip('cdt-maps feature not supported')
      var record = { map: {a: 1, b: 2, c: 3} }
      var operation = maps.getByKey('map', 'z', maps.returnType.KEY_VALUE)
      var expectedResult = { map: {} }
      verifyOperation(record, operation, expectedResult, record, done)
    })
  })

  describe('maps.getByKeyRange', function () {
    it('fetches map entries identified by key range', function (done) {
      helper.cluster.supports_feature('cdt-map') || this.skip('cdt-maps feature not supported')
      var record = { map: {a: 1, b: 2, c: 3, d: 4} }
      var operations = [
        maps.setPolicy('map', { order: maps.order.KEY_ORDERED }),
        maps.getByKeyRange('map', 'b', 'd', maps.returnType.KEY)
      ]
      var expectedResult = { map: ['b', 'c'] }
      verifyOperation(record, operations, expectedResult, record, done)
    })

    it('fetches all keys from the specified start key until the end', function (done) {
      helper.cluster.supports_feature('cdt-map') || this.skip('cdt-maps feature not supported')
      var record = { map: {a: 1, b: 2, c: 3, d: 4} }
      var operations = [
        maps.setPolicy('map', { order: maps.order.KEY_ORDERED }),
        maps.getByKeyRange('map', 'b', null, maps.returnType.KEY)
      ]
      var expectedResult = { map: ['b', 'c', 'd'] }
      verifyOperation(record, operations, expectedResult, record, done)
    })

    it('fetches all keys from the start to the specified end', function (done) {
      helper.cluster.supports_feature('cdt-map') || this.skip('cdt-maps feature not supported')
      var record = { map: {a: 1, b: 2, c: 3} }
      var operation = maps.getByKeyRange('map', null, 'b', maps.returnType.KEY)
      var expectedResult = { map: ['a'] }
      verifyOperation(record, operation, expectedResult, record, done)
    })
  })

  describe('maps.getByValue', function () {
    it('fetches a map entry identified by value', function (done) {
      helper.cluster.supports_feature('cdt-map') || this.skip('cdt-maps feature not supported')
      var record = { map: {a: 1, b: 2, c: 3} }
      var operation = maps.getByValue('map', 2, maps.returnType.VALUE)
      var expectedResult = { map: [2] }
      verifyOperation(record, operation, expectedResult, record, done)
    })
  })

  describe('maps.getByValueRange', function () {
    it('fetches map entries identified by value range', function (done) {
      helper.cluster.supports_feature('cdt-map') || this.skip('cdt-maps feature not supported')
      var record = { map: {a: 1, b: 2, c: 2, d: 3} }
      var operation = maps.getByValueRange('map', 2, 3, maps.returnType.VALUE)
      var expectedResult = { map: [2, 2] }
      verifyOperation(record, operation, expectedResult, record, done)
    })

    it('fetches all values from the specified start value until the end', function (done) {
      helper.cluster.supports_feature('cdt-map') || this.skip('cdt-maps feature not supported')
      var record = { map: {a: 1, b: 2, c: 3} }
      var operation = maps.getByValueRange('map', 2, null, maps.returnType.VALUE)
      var expectedResult = { map: [2, 3] }
      verifyOperation(record, operation, expectedResult, record, done)
    })

    it('fetches all values from the start to the specified end', function (done) {
      helper.cluster.supports_feature('cdt-map') || this.skip('cdt-maps feature not supported')
      var record = { map: {a: 1, b: 2, c: 3} }
      var operation = maps.getByValueRange('map', null, 2, maps.returnType.VALUE)
      var expectedResult = { map: [1] }
      verifyOperation(record, operation, expectedResult, record, done)
    })
  })

  describe('maps.getByIndex', function () {
    it('fetches a map entry identified by index', function (done) {
      helper.cluster.supports_feature('cdt-map') || this.skip('cdt-maps feature not supported')
      var record = { map: {a: 1, b: 2, c: 3} }
      var operation = maps.getByIndex('map', 1, maps.returnType.KEY_VALUE)
      var expectedResult = { map: ['b', 2] }
      verifyOperation(record, operation, expectedResult, record, done)
    })

    it('fetches a map entry identified by negative index', function (done) {
      helper.cluster.supports_feature('cdt-map') || this.skip('cdt-maps feature not supported')
      var record = { map: {a: 1, b: 2, c: 3} }
      var operation = maps.getByIndex('map', -1, maps.returnType.KEY_VALUE)
      var expectedResult = { map: ['c', 3] }
      verifyOperation(record, operation, expectedResult, record, done)
    })
  })

  describe('maps.getByIndexRange', function () {
    it('fetches map entries identified by index range', function (done) {
      helper.cluster.supports_feature('cdt-map') || this.skip('cdt-maps feature not supported')
      var record = { map: {a: 1, b: 2, c: 2, d: 3} }
      var operation = maps.getByIndexRange('map', 1, 2, maps.returnType.KEY_VALUE)
      var expectedResult = { map: ['b', 2, 'c', 2] }
      verifyOperation(record, operation, expectedResult, record, done)
    })

    it('fetches map entries identified by negative index range', function (done) {
      helper.cluster.supports_feature('cdt-map') || this.skip('cdt-maps feature not supported')
      var record = { map: {a: 1, b: 2, c: 2, d: 3} }
      var operation = maps.getByIndexRange('map', -2, 2, maps.returnType.KEY_VALUE)
      var expectedResult = { map: ['c', 2, 'd', 3] }
      verifyOperation(record, operation, expectedResult, record, done)
    })

    it('fetches all map entries starting from the specified index until the end', function (done) {
      helper.cluster.supports_feature('cdt-map') || this.skip('cdt-maps feature not supported')
      var record = { map: {a: 1, b: 2, c: 3} }
      var operation = maps.getByIndexRange('map', 1, null, maps.returnType.KEY_VALUE)
      var expectedResult = { map: ['b', 2, 'c', 3] }
      verifyOperation(record, operation, expectedResult, record, done)
    })
  })

  describe('maps.getByRank', function () {
    it('fetches a map entry identified by rank', function (done) {
      helper.cluster.supports_feature('cdt-map') || this.skip('cdt-maps feature not supported')
      var record = { map: {a: 3, b: 2, c: 1} }
      var operation = maps.getByRank('map', 0, maps.returnType.VALUE)
      var expectedResult = { map: 1 }
      verifyOperation(record, operation, expectedResult, record, done)
    })

    it('fetches a map entry identified by negative rank', function (done) {
      helper.cluster.supports_feature('cdt-map') || this.skip('cdt-maps feature not supported')
      var record = { map: {a: 3, b: 2, c: 1} }
      var operation = maps.getByRank('map', -1, maps.returnType.VALUE)
      var expectedResult = { map: 3 }
      verifyOperation(record, operation, expectedResult, record, done)
    })
  })

  describe('maps.getByRankRange', function () {
    it('fetches map entries identified by rank range', function (done) {
      helper.cluster.supports_feature('cdt-map') || this.skip('cdt-maps feature not supported')
      var record = { map: {a: 3, b: 2, c: 1} }
      var operation = maps.getByRankRange('map', 0, 2, maps.returnType.VALUE)
      var expectedResult = { map: [1, 2] }
      verifyOperation(record, operation, expectedResult, record, done)
    })

    it('fetches map entries identified by negative rank range', function (done) {
      helper.cluster.supports_feature('cdt-map') || this.skip('cdt-maps feature not supported')
      var record = { map: {a: 3, b: 2, c: 1} }
      var operation = maps.getByRankRange('map', -2, 2, maps.returnType.VALUE)
      var expectedResult = { map: [2, 3] }
      verifyOperation(record, operation, expectedResult, record, done)
    })

    it('fetches all map entries starting at the specified rank until the end', function (done) {
      helper.cluster.supports_feature('cdt-map') || this.skip('cdt-maps feature not supported')
      var record = { map: {a: 3, b: 2, c: 1} }
      var operation = maps.getByRankRange('map', 1, null, maps.returnType.VALUE)
      var expectedResult = { map: [2, 3] }
      verifyOperation(record, operation, expectedResult, record, done)
    })
  })

  context('returnTypes', function () {
    it('returns nothing', function (done) {
      helper.cluster.supports_feature('cdt-map') || this.skip('cdt-maps feature not supported')
      var record = { map: { a: 1, b: 2, c: 3 } }
      var operations = [
        maps.setPolicy('map', { order: maps.order.KEY_ORDERED }),
        maps.getByKey('map', 'b', maps.returnType.NONE)
      ]
      var expectedResult = { map: null }
      verifyOperation(record, operations, expectedResult, record, done)
    })

    it('returns index', function (done) {
      helper.cluster.supports_feature('cdt-map') || this.skip('cdt-maps feature not supported')
      var record = { map: { a: 1, b: 2, c: 3 } }
      var operations = [
        maps.setPolicy('map', { order: maps.order.KEY_ORDERED }),
        maps.getByKey('map', 'a', maps.returnType.INDEX)
      ]
      var expectedResult = { map: 0 }
      verifyOperation(record, operations, expectedResult, record, done)
    })

    it('returns reverse index', function (done) {
      helper.cluster.supports_feature('cdt-map') || this.skip('cdt-maps feature not supported')
      var record = { map: { a: 1, b: 2, c: 3 } }
      var operations = [
        maps.setPolicy('map', { order: maps.order.KEY_ORDERED }),
        maps.getByKey('map', 'a', maps.returnType.REVERSE_INDEX)
      ]
      var expectedResult = { map: 2 }
      verifyOperation(record, operations, expectedResult, record, done)
    })

    it('returns value order (rank)', function (done) {
      helper.cluster.supports_feature('cdt-map') || this.skip('cdt-maps feature not supported')
      var record = { map: { a: 3, b: 2, c: 1 } }
      var operations = [
        maps.setPolicy('map', { order: maps.order.KEY_ORDERED }),
        maps.getByKey('map', 'a', maps.returnType.RANK)
      ]
      var expectedResult = { map: 2 }
      verifyOperation(record, operations, expectedResult, record, done)
    })

    it('returns reverse value order (reverse rank)', function (done) {
      helper.cluster.supports_feature('cdt-map') || this.skip('cdt-maps feature not supported')
      var record = { map: { a: 3, b: 2, c: 1 } }
      var operations = [
        maps.setPolicy('map', { order: maps.order.KEY_ORDERED }),
        maps.getByKey('map', 'a', maps.returnType.REVERSE_RANK)
      ]
      var expectedResult = { map: 0 }
      verifyOperation(record, operations, expectedResult, record, done)
    })

    it('returns count of items selected', function (done) {
      helper.cluster.supports_feature('cdt-map') || this.skip('cdt-maps feature not supported')
      var record = { map: { a: 1, b: 2, c: 3 } }
      var operations = [
        maps.setPolicy('map', { order: maps.order.KEY_ORDERED }),
        maps.getByKeyRange('map', 'a', 'c', maps.returnType.COUNT)
      ]
      var expectedResult = { map: 2 }
      verifyOperation(record, operations, expectedResult, record, done)
    })

    it('returns key for a single read', function (done) {
      helper.cluster.supports_feature('cdt-map') || this.skip('cdt-maps feature not supported')
      var record = { map: { a: 1, b: 2, c: 3 } }
      var operations = [
        maps.setPolicy('map', { order: maps.order.KEY_ORDERED }),
        maps.getByIndex('map', 0, maps.returnType.KEY)
      ]
      var expectedResult = { map: 'a' }
      verifyOperation(record, operations, expectedResult, record, done)
    })

    it('returns keys for range read', function (done) {
      helper.cluster.supports_feature('cdt-map') || this.skip('cdt-maps feature not supported')
      var record = { map: { a: 1, b: 2, c: 3 } }
      var operations = [
        maps.setPolicy('map', { order: maps.order.KEY_ORDERED }),
        maps.getByIndexRange('map', 0, 2, maps.returnType.KEY)
      ]
      var expectedResult = { map: [ 'a', 'b' ] }
      verifyOperation(record, operations, expectedResult, record, done)
    })

    it('returns value for a single read', function (done) {
      helper.cluster.supports_feature('cdt-map') || this.skip('cdt-maps feature not supported')
      var record = { map: { a: 1, b: 2, c: 3 } }
      var operations = [
        maps.setPolicy('map', { order: maps.order.KEY_ORDERED }),
        maps.getByIndex('map', 0, maps.returnType.VALUE)
      ]
      var expectedResult = { map: 1 }
      verifyOperation(record, operations, expectedResult, record, done)
    })

    it('returns values for range read', function (done) {
      helper.cluster.supports_feature('cdt-map') || this.skip('cdt-maps feature not supported')
      var record = { map: { a: 1, b: 2, c: 3 } }
      var operations = [
        maps.setPolicy('map', { order: maps.order.KEY_ORDERED }),
        maps.getByIndexRange('map', 0, 2, maps.returnType.VALUE)
      ]
      var expectedResult = { map: [ 1, 2 ] }
      verifyOperation(record, operations, expectedResult, record, done)
    })

    it('returns key/value for a single read', function (done) {
      helper.cluster.supports_feature('cdt-map') || this.skip('cdt-maps feature not supported')
      var record = { map: { a: 1, b: 2, c: 3 } }
      var operations = [
        maps.setPolicy('map', { order: maps.order.KEY_ORDERED }),
        maps.getByIndex('map', 0, maps.returnType.KEY_VALUE)
      ]
      var expectedResult = { map: [ 'a', 1 ] }
      verifyOperation(record, operations, expectedResult, record, done)
    })

    it('returns key/value for a range read', function (done) {
      helper.cluster.supports_feature('cdt-map') || this.skip('cdt-maps feature not supported')
      var record = { map: { a: 1, b: 2, c: 3 } }
      var operations = [
        maps.setPolicy('map', { order: maps.order.KEY_ORDERED }),
        maps.getByIndexRange('map', 0, 2, maps.returnType.KEY_VALUE)
      ]
      var expectedResult = { map: [ 'a', 1, 'b', 2 ] }
      verifyOperation(record, operations, expectedResult, record, done)
    })
  })
})
