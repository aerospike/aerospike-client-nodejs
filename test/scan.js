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

const metagen = helper.metagen
const recgen = helper.recgen
const valgen = helper.valgen

describe('client.query() - without where clause(Scan)', function () {
  const client = helper.client

  const number_of_records = 100

  before(function (done) {
    helper.udf.register('scan.lua')
    helper.udf.register('aggregate.lua')

    // generators
    var mgen = metagen.constant({ttl: 1000})
    var rgen = recgen.record({i: valgen.integer(), s: valgen.string(), b: valgen.bytes()})

    var count = 0
    function iteration (i) {
      // values
      var key = {ns: helper.namespace, set: 'test.scan', key: 'test/scan/' + i.toString()}
      var meta = mgen(key)
      var record = rgen(key, meta)

      // write the record then check
      client.put(key, record, meta, function (err, key) {
        if (err) { throw new Error(err.message) }

        client.get(key, function (err, _record, _metadata, _key) {
          expect(err).not.to.be.ok()
          count++
          if (count >= number_of_records) {
            done()
          }
        })
      })
    }

    for (var i = 0; i < number_of_records; i++) {
      iteration(i)
    }
  })

  after(function (done) {
    helper.udf.remove('scan.lua')
    helper.udf.remove('aggregate.lua')
    done()
  })

  it('should scan all the records', function (done) {
    var query = client.query(helper.namespace, 'test.scan')
    var stream = query.execute()

    var count = 0
    stream.on('data', function (rec) {
      count++
    })
    stream.on('error', function (error) {
      throw error
    })
    stream.on('end', function (end) {
      expect(count).to.not.be.lessThan(number_of_records)
      done()
    })
  })

  context('with nobins set to true', function () {
    it('should return only meta data', function (done) {
      var args = {nobins: true}
      var query = client.query(helper.namespace, 'test.scan', args)
      var stream = query.execute()

      var count = 0
      stream.on('data', function (rec) {
        count++
      })
      stream.on('error', function (error) {
        throw error
      })
      stream.on('end', function () {
        expect(count).to.not.be.lessThan(number_of_records)
        done()
      })
    })
  })

  context('with bin selection', function () {
    it('should scan and select only few bins in the record', function (done) {
      var args = {select: ['i', 's']}
      var query = client.query(helper.namespace, 'test.scan', args)
      var stream = query.execute()

      var count = 0
      stream.on('data', function (rec) {
        count++
      })
      stream.on('error', function (error) {
        throw error
      })
      stream.on('end', function () {
        expect(count).to.not.be.lessThan(number_of_records)
        done()
      })
    })
  })

  context('with stream UDF', function () {
    it('should aggregate the results', function (done) {
      var args = {aggregationUDF: {module: 'aggregate', funcname: 'sum_test_bin'}}
      var query = client.query(helper.namespace, 'test.scan', args)

      var stream = query.execute()
      stream.on('error', function (error) {
        throw error
      })
      stream.on('data', function (result) {
        expect(result).to.be.equal(5050) // 1 + 2 + ... + 100 = (100 * 101) / 2 = 5050
      })
      stream.on('end', function () {
        done()
      })
    })
  })

  context('background scans', function () {
    it('should do a scan background and check for the status of scan job ', function (done) {
      var args = {UDF: {module: 'scan', funcname: 'updateRecord'}}
      var scanBackground = client.query(helper.namespace, 'test.scan', args)

      var stream = scanBackground.execute()
      stream.on('error', function (error) {
        helper.fail(error)
      })
      stream.on('end', function (scanId) {
        var interval = setInterval(function () {
          scanBackground.info(scanId, function (scanJobStats, scanId) {
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
