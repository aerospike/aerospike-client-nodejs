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

/* global describe, it */

// we want to test the built aerospike module
const Aerospike = require('../lib/aerospike')
const helper = require('./test_helper')
const expect = require('expect.js')

const keygen = helper.keygen
const metagen = helper.metagen
const recgen = helper.recgen
const valgen = helper.valgen

const status = Aerospike.status
var Double = Aerospike.Double

describe('client.put()', function () {
  var client = helper.client

  it('should write and validate 100 records', function (done) {
    // counters
    var total = 100
    var count = 0

    // generators
    var kgen = keygen.string(helper.namespace, helper.set, {prefix: 'test/put/'})
    var mgen = metagen.constant({ttl: 1000})
    var rgen = recgen.record({i: valgen.integer(), s: valgen.string(), b: valgen.bytes()})

    function iteration () {
      // values
      var key = kgen()
      var meta = mgen(key)
      var record = rgen(key, meta)

      // write the record then check
      client.put(key, record, meta, function (err, key, status) {
        expect(err).not.to.be.ok()

        client.get(key, function (err, _record, _metadata, _key) {
          if (err) { throw new Error(err.message) }
          expect(_record).to.eql(record)
          count++
          if (count >= total) {
            done()
          }
        })
      })
    }

    for (var i = 0; i < total; i++) {
      iteration()
    }
  })

  it('should write the record w/ string key', function (done) {
    // generators
    var kgen = keygen.string(helper.namespace, helper.set, {prefix: 'test/put/'})
    var mgen = metagen.constant({ttl: 1000})
    var rgen = recgen.record({i: valgen.integer(), s: valgen.string()})

      // values
      var key = kgen()
      var meta = mgen(key)
      var record = rgen(key, meta)

      // write the record then check
      client.put(key, record, meta, function (err, key, status) {
        expect(err).not.to.be.ok()

        client.get(key, function (err, record, metadata, key) {
          if (err) { throw new Error(err.message) }
          client.remove(key, function (err, key) {
            if (err) { throw new Error(err.message) }
            done()
          })
        })
      })
  })

  it('should write the record w/ int key', function (done) {
    // generators
    var kgen = keygen.integer(helper.namespace, helper.set)
    var mgen = metagen.constant({ttl: 1000})
    var rgen = recgen.record({i: valgen.integer(), s: valgen.string()})

    // values
    var key = kgen()
    var meta = mgen(key)
    var record = rgen(key, meta)

    // write the record then check
    client.put(key, record, meta, function (err, key, status) {
      expect(err).not.to.be.ok()

      client.get(key, function (err, record, metadata, key) {
        if (err) { throw new Error(err.message) }

        client.remove(key, function (err, key) {
          if (err) { throw new Error(err.message) }
          done()
        })
      })
    })
  })

  it('should write the record w/ bytes key', function (done) {
    // generators
    var kgen = keygen.bytes(helper.namespace, helper.set)
    var mgen = metagen.constant({ttl: 1000})
    var rgen = recgen.record({i: valgen.integer(), s: valgen.string()})
    // values
    var key = kgen()
    var meta = mgen(key)
    var record = rgen(key, meta)
    // write the record then check
    client.put(key, record, meta, function (err, key, status) {
      expect(err).not.to.be.ok()

      client.get(key, function (err, record, metadata, key) {
        if (err) { throw new Error(err.message) }

        client.remove(key, function (err, key) {
          if (err) { throw new Error(err.message) }
          done()
        })
      })
    })
  })

  it('shoule write an array, map type of bin and read', function (done) {
    // generators
    var kgen = keygen.string(helper.namespace, helper.set, {prefix: 'test/put/'})
    var mgen = metagen.constant({ttl: 1000})
    var rgen = recgen.record({list: valgen.array(), map: valgen.map()})

    // values
    var key = kgen()
    var meta = mgen(key)
    var record = rgen(key, meta)

    // write the record and then check
    client.put(key, record, meta, function (err, key, status) {
      expect(err).not.to.be.ok()

      client.get(key, function (err, record1, metadata, key) {
        if (err) { throw new Error(err.message) }
        expect(record1).to.eql(record)

        client.remove(key, function (err, key) {
          if (err) { throw new Error(err.message) }
          done()
        })
      })
    })
  })

  // it('shoule write a bin with double value', function (done) {
  //   // generators
  //   var kgen = keygen.string(options.namespace, options.set, {prefix: 'test/put/'})
  //   var mgen = metagen.constant({ttl: 1000})
  //
  //   // values
  //   var key = kgen()
  //   var meta = mgen(key)
  //   var record = {
  //     val: 123.45,
  //     dval: Double(456.00)
  //   }
  //   // write the record and then check
  //   client.put(key, record, meta, function (err, key) {
  //     expect(err).not.to.be.ok()
  //
  //     client.get(key, function (err, record1, metadata, key) {
  //       if (err) { throw new Error(err.message) }
  //       expect(record1.val).to.equal(record.val)
  //       expect(record1.dval).to.equal(record.dval.Double)
  //
  //       client.remove(key, function (err, key) {
  //         if (err) { throw new Error(err.message) }
  //         done()
  //       })
  //     })
  //   })
  // })

  it('should write an array of map and array, map of array and map, then read', function (done) {
    // generators
    var kgen = keygen.string(helper.namespace, helper.set, {prefix: 'test/put/'})
    var mgen = metagen.constant({ttl: 1000})
    var rgen = recgen.record({list_of_list: valgen.array_of_array(), map_of_list: valgen.map_of_map()})

    // values
    var key = kgen()
    var meta = mgen(key)
    var record = rgen(key, meta)

    // write the record and then check
    client.put(key, record, meta, function (err, key, status) {
      expect(err).not.to.be.ok()

      client.get(key, function (err, record1, metadata, key) {
        if (err) { throw new Error(err.message) }
        expect(record1).to.eql(record)

        client.remove(key, function (err, key) {
          if (err) { throw new Error(err.message) }
          done()
        })
      })
    })
  })

  it('should write, read, write, and check gen', function (done) {
    // generators
    var kgen = keygen.string(helper.namespace, helper.set, {prefix: 'test/put/'})
    var mgen = metagen.constant({ttl: 1000})
    var rgen = recgen.record({i: valgen.integer(), s: valgen.string()})

    // values
    var key = kgen()
    var meta = mgen(key)
    var record = rgen(key, meta)

    // write the record then check
    client.put(key, record, meta, function (err, key1, status) {
      expect(err).not.to.be.ok()
      expect(key1).to.have.property('ns', key.ns)
      expect(key1).to.have.property('set', key.set)
      expect(key1).to.have.property('key', key.key)

      client.get(key1, function (err, record2, metadata2, key2) {
        if (err) { throw new Error(err.message) }
        expect(key2).to.have.property('ns', key.ns)
        expect(key2).to.have.property('set', key.set)
        expect(key2).to.have.property('key', key.key)
        expect(record2).to.eql(record)

        var key3 = key2
        var record3 = record2

        record3.i++

        client.put(key3, record3, meta, function (err, key4, status) {
          expect(err).not.to.be.ok()
          expect(key4).to.have.property('ns', key.ns)
          expect(key4).to.have.property('set', key.set)
          expect(key4).to.have.property('key', key.key)

          client.get(key4, function (err, record5, metadata5, key5) {
            if (err) { throw new Error(err.message) }
            expect(key5).to.have.property('ns', key.ns)
            expect(key5).to.have.property('set', key.set)
            expect(key5).to.have.property('key', key.key)
            expect(record5).to.eql(record3)
            expect(metadata5.gen).to.equal(metadata2.gen + 1)
            expect(record5.i).to.equal(record3.i)

            client.remove(key5, function (err, key) {
              if (err) { throw new Error(err.message) }
              done()
            })
          })
        })
      })
    })
  })

  it('should write, read, remove, read, write, and check gen', function (done) {
    // generators
    var kgen = keygen.string(helper.namespace, helper.set, {prefix: 'test/put/'})
    var mgen = metagen.constant({ttl: 1000})
    var rgen = recgen.record({i: valgen.integer(), s: valgen.string()})

    // values
    var key = kgen()
    var meta = mgen(key)
    var record = rgen(key, meta)

    // write the record then check
    client.put(key, record, meta, function (err, key1, status) {
      expect(err).not.to.be.ok()
      expect(key1).to.have.property('ns', key.ns)
      expect(key1).to.have.property('set', key.set)
      expect(key1).to.have.property('key', key.key)

      client.get(key1, function (err, record2, metadata2, key2) {
        if (err) { throw new Error(err.message) }
        expect(key2).to.have.property('ns', key.ns)
        expect(key2).to.have.property('set', key.set)
        expect(key2).to.have.property('key', key.key)
        expect(record2).to.eql(record)

        client.remove(key2, function (err, key3) {
          if (err) { throw new Error(err.message) }
          expect(key3).to.have.property('ns', key.ns)
          expect(key3).to.have.property('set', key.set)
          expect(key3).to.have.property('key', key.key)

          client.get(key3, function (err, record4, metadata4, key4) {
            // expect(err).to.be.ok()
            // expect(err.code).to.equal(status.AEROSPIKE_ERR_RECORD_NOT_FOUND)

            client.put(key, record, meta, function (err, key5, status) {
              expect(err).not.to.be.ok()
              expect(key5).to.have.property('ns', key.ns)
              expect(key5).to.have.property('set', key.set)
              expect(key5).to.have.property('key', key.key)

              client.get(key5, function (err, record6, metadata6, key6) {
                if (err) { throw new Error(err.message) }
                expect(key6).to.have.property('ns', key.ns)
                expect(key6).to.have.property('set', key.set)
                expect(key6).to.have.property('key', key.key)
                expect(record6).to.eql(record)
                expect(metadata6.gen).to.equal(1)

                client.remove(key6, function (err, key) {
                  if (err) { throw new Error(err.message) }
                  done()
                })
              })
            })
          })
        })
      })
    })
  })

  it('should write null for bins with empty list and map', function (done) {
    // generators
    var kgen = keygen.string(helper.namespace, helper.set, {prefix: 'test/put/'})
    var mgen = metagen.constant({ttl: 1000})
    var rgen = recgen.record({
      l: valgen.constant([1, 2, 3]),
      le: valgen.constant([]),
      m: valgen.constant({a: 1, b: 2}),
      me: valgen.constant({})
    })

    // values
    var key = kgen()
    var meta = mgen(key)
    var record = rgen(key, meta)

    // write the record then check
    client.put(key, record, meta, function (err, key1) {
      // expect(err).not.to.be.ok()
      expect(key1).to.have.property('ns', key.ns)
      expect(key1).to.have.property('set', key.set)
      expect(key1).to.have.property('key', key.key)

      client.get(key1, function (err, record2, metadata2, key2) {
        if (err) { throw new Error(err.message) }
        expect(key2).to.have.property('ns', key.ns)
        expect(key2).to.have.property('set', key.set)
        expect(key2).to.have.property('key', key.key)
        expect(record2).to.eql(record)
        expect(record2.m).to.eql({a: 1, b: 2})
        expect(record2.me).to.be.eql({})
        expect(record2.l).to.eql([1, 2, 3])
        expect(record2.le).to.be.eql([])

        client.remove(key, function (err, key) {
          if (err) { throw new Error(err.message) }
          done()
        })
      })
    })
  })

  it('should write a bin of type undefined and write should not fail', function (done) {
    // generators
    var kgen = keygen.string(helper.namespace, helper.set, {prefix: 'test/put/'})
    var mgen = metagen.constant({ttl: 1000})
    var rgen = recgen.record({
      l: valgen.constant([1, 2, 3]),
      m: valgen.constant({a: 1, b: 2})
    })

    // values
    var key = kgen()
    var meta = mgen(key)
    var record = rgen(key, meta)
    record.bin_un = undefined

    // write the record then check
    client.put(key, record, meta, function (err, key1, status) {
      // expect(err).to.be.ok()
      // expect(status.code).to.equal(client.status.AEROSPIKE_ERR_PARAM)

      client.remove(key, function (err, key, status) {
        // expect(status.code).to.equal(client.status.AEROSPIKE_ERR_RECORD_NOT_FOUND)
        done()
      })
    })
  })

  it('should write a set with empty string and write should pass', function (done) {
    // generators
    var kgen = keygen.string(helper.namespace, '', {prefix: 'test/put/'})
    var mgen = metagen.constant({ttl: 1000})
    var rgen = recgen.record({
      l: valgen.constant([1, 2, 3]),
      m: valgen.constant({a: 1, b: 2})
    })

    // values
    var key = kgen()
    var meta = mgen(key)
    var record = rgen(key, meta)
    // write the record then check
    client.put(key, record, meta, function (err, key1, status) {
      expect(err).not.to.be.ok()

      client.get(key1, function (err, bins, meta, key2) {
        if (err) { throw new Error(err.message) }
        expect(bins.m).to.eql({a: 1, b: 2})
        expect(bins.l).to.eql([1, 2, 3])

        client.remove(key2, function (err, key3) {
          if (err) { throw new Error(err.message) }
          done()
        })
      })
    })
  })

  it('should write a map with undefined entry and verify the record', function (done) {
    // generators
    var kgen = keygen.string(helper.namespace, helper.set, {prefix: 'test/put/'})
    var mgen = metagen.constant({ttl: 1000})
    var rgen = recgen.record({
      l: valgen.constant([1, 2, 3, undefined]),
      m: valgen.constant({a: 1, b: 2, c: undefined})
    })

    // values
    var key = kgen()
    var meta = mgen(key)
    var record = rgen(key, meta)
    // write the record then check
    client.put(key, record, meta, function (err, key1, status) {
      expect(err).not.to.be.ok()

      client.get(key1, function (err, bins, meta, key2) {
        if (err) { throw new Error(err.message) }
        expect(bins.m).to.eql({a: 1, b: 2, c: null})
        expect(bins.l).to.eql([1, 2, 3, null])

        client.remove(key2, function (err, key3) {
          if (err) { throw new Error(err.message) }
          done()
        })
      })
    })
  })

  it('should write an object with boolean value and should fail', function (done) {
    // generators
    var kgen = keygen.string(helper.namespace, helper.set, {prefix: 'test/put/'})
    var mgen = metagen.constant({ttl: 1000})

    // values
    var key = kgen()
    var meta = mgen(key)
    var record = {boolbin: true}

    // write the record then check
    client.put(key, record, meta, function (err, key1) {
      // expect(err).to.be.ok()
      // expect(err.code).to.equal(status.AEROSPIKE_ERR_PARAM)
      done()
    })
  })

  it('should write a key with undefined value and it should fail gracefully', function (done) {
    // generators
    var mgen = metagen.constant({ttl: 1000})

    // values
    var key = client.key(helper.namespace, helper.set, undefined)
    var meta = mgen(key)
    var record = { }

    // write the record then check
    client.put(key, record, meta, function (err, key1) {
      // expect(err).to.be.ok()
      // expect(err.code).to.equal(status.AEROSPIKE_ERR_PARAM)
      done()
    })
  })

  it('should check generation and then update record only if generation is equal (CAS)', function (done) {
    // generators
    var kgen = keygen.integer(helper.namespace, helper.set)
    var mgen = metagen.constant({ttl: 1000})
    var rgen = recgen.record({i: valgen.integer(), s: valgen.string()})

    // values
    var key = kgen()
    var meta = mgen(key)
    var record = rgen(key, meta)

    // write the record then check
    client.put(key, record, meta, function (err, key, status) {
      expect(err).not.to.be.ok()

      // check the content of the record
      client.get(key, function (err, record, metadata, key) {
        if (err) { throw new Error(err.message) }
        var mgen = metagen.constant({gen: 1})
        var meta = mgen(key)
        var writePolicy = {gen: client.policy.gen.EQ}

        client.put(key, record, meta, writePolicy, function (err, key, status) {
          expect(err).not.to.be.ok()

          client.get(key, function (err, record, metadata, key) {
            if (err) { throw new Error(err.message) }
            expect(metadata.gen).to.equal(2)

            client.remove(key, function (err, key) {
              if (err) { throw new Error(err.message) }
              done()
            })
          })
        })
      })
    })
  })
})
