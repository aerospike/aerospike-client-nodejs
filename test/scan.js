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

/* global describe, it, before, after */

// we want to test the built aerospike module
var Aerospike = require('../lib/aerospike')
var options = require('./util/options')
var expect = require('expect.js')

var metagen = require('./generators/metadata')
var recgen = require('./generators/record')
var valgen = require('./generators/value')

var status = Aerospike.status

describe('Aerospike.query() - without where clause(Scan)', function () {
  var config = options.getConfig()

  before(function (done) {
    Aerospike.connect(config, function (err) {
      if (err) { throw new Error(err.message) }

      // counters
      var total = 100
      var count = 0

      // generators
      var mgen = metagen.constant({ttl: 1000})
      var rgen = recgen.record({i: valgen.integer(), s: valgen.string(), b: valgen.bytes()})

      function iteration (i) {
        // values
        var key = {ns: options.namespace, set: options.set, key: 'test/query' + i.toString()}
        var meta = mgen(key)
        var record = rgen(key, meta)

        // register the UDF used in scan background.
        var dir = __dirname
        var filename = dir + '/scan.lua'

        Aerospike.udfRegister(filename, function (err) {
          expect(err).not.to.be.ok()
          Aerospike.udfRegisterWait('scan.lua', 10, function (err) {
            expect(err).not.to.be.ok()
          })
        })

        // write the record then check
        Aerospike.put(key, record, meta, function (err, key) {
          if (err) { throw new Error(err.message) }

          Aerospike.get(key, function (err, _record, _metadata, _key) {
            expect(err).not.to.be.ok()
            count++
            if (count >= total) {
              done()
            }
          })
        })
      }

      for (var i = 0; i < total; i++) {
        iteration(i)
      }
    })
  })

  after(function (done) {
    Aerospike.udfRemove('scan.lua', function () {})
    Aerospike.close()
    client = null
    done()
  })

  it('should query all the records', function (done) {
    this.timeout(5000)
    // counters
    var count = 0
    var err = 0

    var query = Aerospike.query(options.namespace, options.set)

    var stream = query.execute()

    stream.on('data', function (rec) {
      count++
    })
    stream.on('error', function (error) { // eslint-disable-line handle-callback-err
      err++
    })
    stream.on('end', function (end) {
      // derive it as a percentage.
      expect(count).to.be.greaterThan(99)
      expect(err).to.equal(0)

      done()
    })
  })

  it('should query and select no bins', function (done) {
    this.timeout(5000)
    var total = 100
    var count = 0
    var err = 0

    var args = {nobins: true}
    var query = Aerospike.query(options.namespace, options.set, args)

    var stream = query.execute()

    stream.on('data', function (rec) {
      count++
    })
    stream.on('error', function (error) { // eslint-disable-line handle-callback-err
      err++
    })
    stream.on('end', function (end) {
      expect(count).to.be.greaterThan(total)
      expect(err).not.to.be.ok()
      done()
    })
  })

  it('should query and select only few bins in the record', function (done) {
    this.timeout(5000)
    var total = 99
    var count = 0
    var err = 0

    var args = {select: ['i', 's']}
    var query = Aerospike.query(options.namespace, options.set, args)

    var stream = query.execute()

    stream.on('data', function (rec) {
      count++
    })
    stream.on('error', function (error) { // eslint-disable-line handle-callback-err
      err++
    })
    stream.on('end', function (end) {
      expect(count).to.be.greaterThan(total)
      expect(err).not.to.be.ok()
      done()
    })
  })

  it('should do a scan background and check for the status of scan job ', function (done) {
    var args = {UDF: {module: 'scan', funcname: 'updateRecord'}}
    var scanBackground = Aerospike.query(options.namespace, options.set, args)

    var err = 0
    var stream = scanBackground.execute()

    var infoCallback = function (scanJobStats, scanId) {
      done()
    }
    stream.on('error', function (error) { // eslint-disable-line handle-callback-err
      err++
    })
    stream.on('end', function (scanId) {
      scanBackground.Info(scanId, infoCallback)
    })
  })
})
