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

/* global expect, describe, it, before, after, context */

const Aerospike = require('../lib/aerospike')
const helper = require('./test_helper')

const filter = Aerospike.filter

const keygen = helper.keygen
const metagen = helper.metagen
const putgen = helper.putgen
const recgen = helper.recgen
const valgen = helper.valgen

describe('client.query()', function () {
  var client = helper.client
  var testSet = 'test/query-' + Math.floor(Math.random() * 100000)
  var numberOfRecords = 10

  before(function (done) {
    var kgen = keygen.string(helper.namespace, testSet, {prefix: 'test/query'})
    var rgen = recgen.record({i: valgen.integer({random: false, min: 0}), s: valgen.constant('aerospike')})
    var mgen = metagen.constant({ ttl: 300 })
    putgen.put(numberOfRecords, kgen, rgen, mgen, function (key) {
      if (!key) {
        helper.udf.register('aggregate.lua')
        helper.udf.register('scan.lua')
        helper.index.remove('queryIndexInt')
        helper.index.create('queryIndexInt', testSet, 'i', Aerospike.indexDataType.NUMERIC)
        helper.index.remove('queryIndexString')
        helper.index.create('queryIndexString', testSet, 's', Aerospike.indexDataType.STRING)
        done()
      }
    })
  })

  after(function (done) {
    helper.udf.remove('aggregate.lua')
    helper.index.remove('queryIndexInt')
    helper.index.remove('queryIndexString')
    done()
  })

  context('with filter (query)', function () {
    it('should query on an integer index - filter by equality of bin value', function (done) {
      var args = { filters: [filter.equal('i', 5)] }
      var query = client.query(helper.namespace, testSet, args)

      var count = 0
      var stream = query.execute()
      stream.on('error', function (error) { throw error })
      stream.on('data', function (rec) {
        expect(rec.bins).to.have.property('i', 5)
        count++
      })
      stream.on('end', function (end) {
        expect(count).to.equal(1)
        done()
      })
    })

    it('should query on an integer index - filter by range of bin values', function (done) {
      var args = { filters: [filter.range('i', 3, 7)] }
      var query = client.query(helper.namespace, testSet, args)

      var count = 0
      var stream = query.execute()
      stream.on('error', function (error) { throw error })
      stream.on('data', function (rec) {
        expect(rec.bins).to.have.property('i')
        expect(rec.bins['i']).to.be.within(3, 7)
        count++
      })
      stream.on('end', function (end) {
        expect(count).to.equal(5)
        done()
      })
    })

    it('should query on a string index - filter by equality of bin value', function (done) {
      var args = { filters: [filter.equal('s', 'aerospike')] }
      var query = client.query(helper.namespace, testSet, args)

      var count = 0
      var stream = query.execute()
      stream.on('error', function (error) { throw error })
      stream.on('data', function (rec) {
        expect(rec.bins).to.have.property('s', 'aerospike')
        count++
      })
      stream.on('end', function () {
        expect(count).to.equal(numberOfRecords)
        done()
      })
    })

    it('should query on an index and apply aggregation user defined function', function (done) {
      var args = {
        filters: [filter.equal('s', 'aerospike')],
        aggregationUDF: {module: 'aggregate', funcname: 'sum_test_bin'}
      }
      var query = client.query(helper.namespace, testSet, args)

      var count = 0
      var stream = query.execute()
      stream.on('error', function (error) { throw error })
      stream.on('data', function (result) {
        expect(result).to.be.equal(45) // 0 + 1 + ... + 9
        count++
      })
      stream.on('end', function () {
        expect(count).to.equal(1)
        done()
      })
    })
  })

  context('without filter (legacy scan interface)', function () {
    it('should scan all the records', function (done) {
      var query = client.query(helper.namespace, testSet)

      var count = 0
      var stream = query.execute()
      stream.on('error', function (error) { throw error })
      stream.on('data', function (rec) {
        count++
      })
      stream.on('end', function (end) {
        expect(count).to.equal(numberOfRecords)
        done()
      })
    })

    context('with nobins set to true', function () {
      it('should return only meta data', function (done) {
        var args = {nobins: true}
        var query = client.query(helper.namespace, testSet, args)

        var stream = query.execute()
        stream.on('error', function (error) { throw error })
        stream.on('data', function (rec) {
          expect(rec.bins).to.be.empty()
        })
        stream.on('end', function () {
          done()
        })
      })
    })

    context('with bin selection', function () {
      it('should return only selected bins', function (done) {
        var args = {select: ['s']}
        var query = client.query(helper.namespace, testSet, args)

        var stream = query.execute()
        stream.on('error', function (error) { throw error })
        stream.on('data', function (rec) {
          expect(rec.bins).to.only.have.keys('s')
        })
        stream.on('end', function () {
          done()
        })
      })
    })

    context('background scans', function () {
      it('should do a scan background and check for the status of scan job ', function (done) {
        var args = {UDF: {module: 'scan', funcname: 'updateRecord'}}
        var backgroundScan = client.query(helper.namespace, testSet, args)

        var stream = backgroundScan.execute()
        stream.on('error', function (error) { throw error })
        stream.on('end', function (scanId) {
          var interval = setInterval(function () {
            backgroundScan.info(scanId, function (scanJobStats) {
              if (scanJobStats.status === Aerospike.scanStatus.COMPLETED) {
                clearInterval(interval)
                done()
              }
            })
          }, 100)
        })
      })
    })
  })
})
