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

/* global expect, describe, it, before, after */

const Aerospike = require('../lib/aerospike')
const helper = require('./test_helper')

const filter = Aerospike.filter

describe('client.query()', function () {
  var client = helper.client

  before(function (done) {
    helper.udf.register('aggregate.lua')
    helper.index.create('queryIndexInt', 'test.query', 'queryBinInt', 'integer')
    helper.index.create('queryIndexString', 'test.query', 'queryBinString', 'string')

    var total = 100
    var count = 0

    function iteration (i) {
      var key = {ns: helper.namespace, set: 'test.query', key: 'test/query' + i.toString()}
      var meta = {ttl: 20000}
      var record = {queryBinInt: i, queryBinString: 'querystringvalue'}

      // write the record then check
      client.put(key, record, meta, function (err, key) {
        if (err) { throw new Error(err.message) }

        client.get(key, function (err, _record, _metadata, _key) {
          expect(err).not.to.be.ok()
          count++
          if (count >= total) {
            done()
          }
        })
      })
    }

    for (var i = 1; i <= total; i++) {
      iteration(i)
    }
  })

  after(function (done) {
    helper.udf.remove('aggregate.lua')
    helper.index.remove('queryIndexInt')
    helper.index.remove('queryIndexString')
    done()
  })

  it('should query on an integer index - filter by equality of bin value', function (done) {
    var count = 0

    var args = { filters: [filter.equal('queryBinInt', 100)] }
    var query = client.query(helper.namespace, 'test.query', args)

    var stream = query.execute()
    stream.on('data', function (rec) {
      expect(rec.bins).to.have.property('queryBinInt')
      expect(rec.bins).to.have.property('queryBinString')
      expect(rec.bins['queryBinInt']).to.equal(100)
      count++
    })
    stream.on('error', function (error) {
      helper.fail(error)
    })
    stream.on('end', function (end) {
      expect(count).to.be.equal(1)
      done()
    })
  })

  it('should query on an integer index - filter by range of bin values', function (done) {
    var total = 100
    var count = 0

    var args = { filters: [filter.range('queryBinInt', 1, 100)] }
    var query = client.query(helper.namespace, 'test.query', args)

    var stream = query.execute()
    stream.on('data', function (rec) {
      expect(rec.bins).to.have.property('queryBinInt')
      expect(rec.bins).to.have.property('queryBinString')
      expect(rec.bins['queryBinInt']).to.be.lessThan(101)
      count++
    })
    stream.on('error', function (error) {
      helper.fail(error)
    })
    stream.on('end', function (end) {
      expect(count).to.be.greaterThan(total - 1)
      done()
    })
  })

  it('should query on a string index - filter by equality of bin value', function (done) {
    var total = 100
    var count = 0

    var args = { filters: [filter.equal('queryBinString', 'querystringvalue')] }
    var query = client.query(helper.namespace, 'test.query', args)

    var stream = query.execute()
    stream.on('data', function (rec) {
      expect(rec.bins).to.have.property('queryBinInt')
      expect(rec.bins).to.have.property('queryBinString')
      expect(rec.bins['queryBinString']).to.equal('querystringvalue')
      count++
    })
    stream.on('error', function (error) {
      helper.fail(error)
    })
    stream.on('end', function () {
      expect(count).to.be.greaterThan(total - 1)
      done()
    })
  })

  it('should query on an index and apply aggregation user defined function', function (done) {
    var args = { filters: [filter.equal('queryBinString', 'querystringvalue')],
    aggregationUDF: {module: 'aggregate', funcname: 'sum_test_bin'}}
    var query = client.query(helper.namespace, 'test.query', args)

    var stream = query.execute()
    stream.on('data', function (result) {
      expect(result).to.be.equal(5050) // 1 + 2 + ... + 100 = (100 * 101) / 2 = 5050
      done()
    })
    stream.on('error', function (error) {
      helper.fail(error)
    })
  })

  it('should scan aerospike database and apply aggregation user defined function', function (done) {
    var args = {aggregationUDF: {module: 'aggregate', funcname: 'sum_test_bin'}}
    var query = client.query(helper.namespace, 'test.query', args)

    var stream = query.execute()
    stream.on('data', function (result) {
      expect(result).to.be.equal(5050) // 1 + 2 + ... + 100 = (100 * 101) / 2 = 5050
      done()
    })
    stream.on('error', function (error) {
      helper.fail(error)
    })
  })
})
