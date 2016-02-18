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

const status = Aerospike.status
const op = Aerospike.operator

describe('client.operate()', function () {
  var client = helper.client

  describe('operator.incr()', function () {
    it('should increment bin with integer value', function (done) {
      var key = keygen.string(helper.namespace, helper.set, {prefix: 'test/incr/int'})()

      client.put(key, {i: 123}, function (err) {
        if (err) { throw new Error(err.message) }
        var ops = [
          op.incr('i', 432)
        ]

        client.operate(key, ops, function (err) {
          if (err) { throw new Error(err.message) }

          client.get(key, function (err, record2) {
            if (err) { throw new Error(err.message) }
            expect(record2['i']).to.equal(555)

            client.remove(key, function (err) {
              if (err) { throw new Error(err.message) }
              done()
            })
          })
        })
      })
    })

    it('should increment bin with double value', function (done) {
      var key = keygen.string(helper.namespace, helper.set, {prefix: 'test/incr/double'})()

      client.put(key, {f: 3.14159}, function (err) {
        if (err) { throw new Error(err.message) }
        var ops = [
          op.incr('f', 2.71828)
        ]

        client.operate(key, ops, function (err) {
          if (err) { throw new Error(err.message) }

          client.get(key, function (err, record2) {
            if (err) { throw new Error(err.message) }
            expect(record2['f']).to.equal(5.85987)

            client.remove(key, function (err) {
              if (err) { throw new Error(err.message) }
              done()
            })
          })
        })
      })
    })

    it('should increment bin with aerospike.Double() value', function (done) {
      var key = keygen.string(helper.namespace, helper.set, {prefix: 'test/incr/Double'})()

      client.put(key, {f: 3.14159}, function (err) {
        if (err && err.code !== status.AEROSPIKE_OK) { throw new Error(err.message) }
        var ops = [
          op.incr('f', Aerospike.Double(1.0))
        ]

        client.operate(key, ops, function (err) {
          if (err && err.code !== status.AEROSPIKE_OK) { throw new Error(err.message) }

          client.get(key, function (err, record2) {
            if (err && err.code !== status.AEROSPIKE_OK) { throw new Error(err.message) }
            expect(record2['f']).to.equal(4.14159)

            client.remove(key, function (err) {
              if (err && err.code !== status.AEROSPIKE_OK) { throw new Error(err.message) }
              done()
            })
          })
        })
      })
    })
  })

  it('should append a bin', function (done) {
    // generators
    var kgen = keygen.string(helper.namespace, helper.set, {prefix: 'test/get/'})
    var mgen = metagen.constant({ttl: 1000})
    var rgen = recgen.constant({i: 123, s: 'abc'})

    // values
    var key = kgen()
    var meta = mgen(key)
    var record = rgen(key, meta)

    // write the record then check
    client.put(key, record, meta, function (err, key) {
      if (err) { throw new Error(err.message) }
      var ops = [
        op.append('s', 'def')
      ]

      client.operate(key, ops, function (err, record1, metadata1, key1) {
        expect(err).not.to.be.ok()

        client.get(key, function (err, record2, metadata2, key2) {
          if (err) { throw new Error(err.message) }
          expect(record['i']).to.equal(record2['i'])
          expect(record['s'] + 'def').to.equal(record2['s'])

          client.remove(key2, function (err, key) {
            if (err) { throw new Error(err.message) }
            done()
          })
        })
      })
    })
  })

  it('should prepend and read a bin', function (done) {
    // generators
    var kgen = keygen.string(helper.namespace, helper.set, {prefix: 'test/get/'})
    var mgen = metagen.constant({ttl: 1000})
    var rgen = recgen.constant({i: 123, s: 'abc'})

    // values
    var key = kgen()
    var meta = mgen(key)
    var record = rgen(key, meta)

    // write the record then check
    client.put(key, record, meta, function (err, key) {
      if (err) { throw new Error(err.message) }
      var ops = [
        op.prepend('s', 'def'),
        op.read('s')
      ]

      client.operate(key, ops, function (err, record1, metadata1, key1) {
        expect(err).to.not.be.ok()
        expect(record1['i']).to.equal(undefined)
        expect('def' + record['s']).to.equal(record1['s'])

        client.get(key, function (err, record2, metadata2, key2) {
          if (err) { throw new Error(err.message) }
          expect(record['i']).to.equal(record2['i'])
          expect('def' + record['s']).to.equal(record2['s'])

          client.remove(key2, function (err, key) {
            if (err) { throw new Error(err.message) }
            done()
          })
        })
      })
    })
  })

  it('should touch a record(refresh ttl) ', function (done) {
    // generators
    var kgen = keygen.string(helper.namespace, helper.set, {prefix: 'test/get/'})
    var mgen = metagen.constant({ttl: 1000})
    var rgen = recgen.constant({i: 123, s: 'abc'})

    // values
    var key = kgen()
    var meta = mgen(key)
    var record = rgen(key, meta)

    // TEST LOGIC
    // 1.Write a record to an aerospike server.
    // 2.Read the record, to get the ttl and calculate
    //   the difference in the ttl written and the ttl returned by server.
    // 3.Touch the record with a definite ttl.
    // 4.Read the record and calculate the difference in the ttl between the
    //  touch ttl value and read ttl value.
    // 5.Compare the difference with the earlier difference calculated.
    // 6.This is to account for the clock asynchronicity between
    //   the client and the server machines.
    // 7.Server returns a number, at which the record expires according the server clock.
    // 8.The client calculates the time in seconds, and gives back ttl. In the case , where
    //   clocks are not synchronous between server and client, the ttl client calculates may not
    //   be accurate to the user. Nevertheless server expires the record in the correct time.

    // write the record then check
    client.put(key, record, meta, function (err, key) {
      if (err) { throw new Error(err.message) }
      var ops = [
        op.touch(2592000)
      ]

      client.get(key, function (err, record3, metadata3, key3) {
        if (err) { throw new Error(err.message) }
        var ttl_diff = metadata3.ttl - meta.ttl

        client.operate(key, ops, function (err, record1, metadata1, key1) {
          expect(err).to.not.be.ok()

          client.get(key1, function (err, record2, metadata2, key2) {
            if (err) { throw new Error(err.message) }
            expect(record['i']).to.equal(record2['i'])
            expect(record['s']).to.equal(record2['s'])
            expect(2592000 + ttl_diff + 10).to.be.above(metadata2.ttl)
            expect(2592000 + ttl_diff - 10).to.be.below(metadata2.ttl)

            client.remove(key2, function (err, key) {
              if (err) { throw new Error(err.message) }
              done()
            })
          })
        })
      })
    })
  })

  it('should prepend using prepend API and verify the bin', function (done) {
    // generators
    var kgen = keygen.string(helper.namespace, helper.set, {prefix: 'test/get/'})
    var mgen = metagen.constant({ttl: 1000})
    var rgen = recgen.constant({i: 123, s: 'abc'})

    // values
    var key = kgen()
    var meta = mgen(key)
    var record = rgen(key, meta)

    // write the record then check
    client.put(key, record, meta, function (err, key) {
      if (err) { throw new Error(err.message) }
      var bin = {s: 'def'}

      client.prepend(key, bin, function (err, record1, metadata1, key1) {
        expect(err).not.to.be.ok()

        client.get(key, function (err, record2, metadata2, key2) {
          if (err) { throw new Error(err.message) }
          expect(record['i']).to.equal(record2['i'])
          expect('def' + record['s']).to.equal(record2['s'])

          client.remove(key2, function (err, key) {
            if (err) { throw new Error(err.message) }
            done()
          })
        })
      })
    })
  })

  it('should prepend using prepend API and verify the bin with metadata', function (done) {
    // generators
    var kgen = keygen.string(helper.namespace, helper.set, {prefix: 'test/get/'})
    var mgen = metagen.constant({ttl: 1000})
    var rgen = recgen.constant({i: 123, s: 'abc'})

    // values
    var key = kgen()
    var meta = mgen(key)
    var record = rgen(key, meta)

    // write the record then check
    client.put(key, record, meta, function (err, key) {
      if (err) { throw new Error(err.message) }
      var bin = {s: 'def'}

      client.prepend(key, bin, meta, function (err, record1, metadata1, key1) {
        expect(err).not.to.be.ok()

        client.get(key, function (err, record2, metadata2, key2) {
          expect(err).not.to.be.ok()
          expect(record['i']).to.equal(record2['i'])
          expect('def' + record['s']).to.equal(record2['s'])

          client.remove(key2, function (err, key) {
            if (err) { throw new Error(err.message) }
            done()
          })
        })
      })
    })
  })

  it('should append a bin using append API and verify the bin', function (done) {
    // generators
    var kgen = keygen.string(helper.namespace, helper.set, {prefix: 'test/get/'})
    var mgen = metagen.constant({ttl: 1000})
    var rgen = recgen.constant({i: 123, s: 'abc'})

    // values
    var key = kgen()
    var meta = mgen(key)
    var record = rgen(key, meta)

    // write the record then check
    client.put(key, record, meta, function (err, key) {
      if (err) { throw new Error(err.message) }
      var bin = {s: 'def'}

      client.append(key, bin, function (err, record1, metadata1, key1) {
        expect(err).not.to.be.ok()

        client.get(key, function (err, record2, metadata2, key2) {
          if (err) { throw new Error(err.message) }
          expect(record['i']).to.equal(record2['i'])
          expect(record['s'] + 'def').to.equal(record2['s'])

          client.remove(key2, function (err, key) {
            if (err) { throw new Error(err.message) }
            done()
          })
        })
      })
    })
  })

  it('should append a bin using append API and verify the bin with metadata', function (done) {
    // generators
    var kgen = keygen.string(helper.namespace, helper.set, {prefix: 'test/get/'})
    var mgen = metagen.constant({ttl: 1000})
    var rgen = recgen.constant({i: 123, s: 'abc'})

    // values
    var key = kgen()
    var meta = mgen(key)
    var record = rgen(key, meta)

    // write the record then check
    client.put(key, record, meta, function (err, key) {
      if (err) { throw new Error(err.message) }
      var bin = {s: 'def'}

      client.append(key, bin, meta, function (err, record1, metadata1, key1) {
        expect(err).not.to.be.ok()

        client.get(key, function (err, record2, metadata2, key2) {
          if (err) { throw new Error(err.message) }
          expect(record['i']).to.equal(record2['i'])
          expect(record['s'] + 'def').to.equal(record2['s'])

          client.remove(key2, function (err, key) {
            if (err) { throw new Error(err.message) }
            done()
          })
        })
      })
    })
  })

  it('should add a value to a bin and verify', function (done) {
    // generators
    var kgen = keygen.string(helper.namespace, helper.set, {prefix: 'test/get/'})
    var mgen = metagen.constant({ttl: 1000})
    var rgen = recgen.constant({i: 123, s: 'abc'})

    // values
    var key = kgen()
    var meta = mgen(key)
    var record = rgen(key, meta)

    // write the record then check
    client.put(key, record, meta, function (err, key) {
      if (err) { throw new Error(err.message) }
      var bin = {i: 432}

      client.add(key, bin, function (err, record1, metadata1, key1) {
        expect(err).not.to.be.ok()

        client.get(key, function (err, record2, metadata2, key2) {
          if (err) { throw new Error(err.message) }
          expect(record['i'] + 432).to.equal(record2['i'])
          expect(record['s']).to.equal(record2['s'])

          client.remove(key2, function (err, key) {
            if (err) { throw new Error(err.message) }
            done()
          })
        })
      })
    })
  })

  it('should add a value to a bin with metadata and verify', function (done) {
    // generators
    var kgen = keygen.string(helper.namespace, helper.set, {prefix: 'test/get/'})
    var mgen = metagen.constant({ttl: 1000})
    var rgen = recgen.constant({i: 123, s: 'abc'})

    // values
    var key = kgen()
    var meta = mgen(key)
    var record = rgen(key, meta)

    // write the record then check
    client.put(key, record, meta, function (err, key) {
      if (err) { throw new Error(err.message) }
      var bin = {i: 432}

      client.add(key, bin, meta, function (err, record1, metadata1, key1) {
        expect(err).not.to.be.ok()

        client.get(key, function (err, record2, metadata2, key2) {
          if (err) { throw new Error(err.message) }
          expect(record['i'] + 432).to.equal(record2['i'])
          expect(record['s']).to.equal(record2['s'])

          client.remove(key2, function (err, key) {
            if (err) { throw new Error(err.message) }
            done()
          })
        })
      })
    })
  })

  it('should add a string value to a bin and expected fail', function (done) {
    // generators
    var kgen = keygen.string(helper.namespace, helper.set, {prefix: 'test/get/'})
    var mgen = metagen.constant({ttl: 1000})
    var rgen = recgen.constant({i: 123, s: 'abc'})

    // values
    var key = kgen()
    var meta = mgen(key)
    var record = rgen(key, meta)

    // write the record then check
    client.put(key, record, meta, function (err, key) {
      if (err) { throw new Error(err.message) }
      var bin = {i: 'str'}

      client.add(key, bin, meta, function (err, record1, metadata1, key1) {
        expect(err).to.be.ok()
        expect(err.code).to.equal(status.AEROSPIKE_ERR_PARAM)
        done()
      })
    })
  })

  it('should append a bin of type integer using append API and expected to fail', function (done) {
    // generators
    var kgen = keygen.string(helper.namespace, helper.set, {prefix: 'test/get/'})
    var mgen = metagen.constant({ttl: 1000})
    var rgen = recgen.constant({i: 123, s: 'abc'})

    // values
    var key = kgen()
    var meta = mgen(key)
    var record = rgen(key, meta)

    // write the record then check
    client.put(key, record, meta, function (err, key) {
      if (err) { throw new Error(err.message) }
      var bin = {s: 123}

      client.append(key, bin, meta, function (err, record1, metadata1, key1) {
        expect(err).to.be.ok()
        expect(err.code).to.equal(status.AEROSPIKE_ERR_PARAM)
        done()
      })
    })
  })

  it('should prepend an integer using prepend API and expect to fail', function (done) {
    // generators
    var kgen = keygen.string(helper.namespace, helper.set, {prefix: 'test/get/'})
    var mgen = metagen.constant({ttl: 1000})
    var rgen = recgen.constant({i: 123, s: 'abc'})

    // values
    var key = kgen()
    var meta = mgen(key)
    var record = rgen(key, meta)

    // write the record then check
    client.put(key, record, meta, function (err, key) {
      if (err) { throw new Error(err.message) }
      var bin = {s: 123}

      client.prepend(key, bin, meta, function (err, record1, metadata1, key1) {
        expect(err).to.be.ok()
        expect(err.code).to.equal(status.AEROSPIKE_ERR_PARAM)
        done()
      })
    })
  })

  it('should return a client error if any of the operations are invalid', function (done) {
    // generators
    var kgen = keygen.string(helper.namespace, helper.set, {prefix: 'test/get/'})
    var mgen = metagen.constant({ttl: 1000})
    var rgen = recgen.constant({i: 123, s: 'abc'})

    // values
    var key = kgen()
    var meta = mgen(key)
    var record = rgen(key, meta)

    // write the record then check
    client.put(key, record, meta, function (err, key) {
      if (err) { throw new Error(err.message) }
      var ops = [
        op.incr('i', 432),
        op.incr('i', 'str') // invalid increment with string value
      ]

      client.operate(key, ops, function (err, record1, metadata1, key1) {
        expect(err).to.be.ok()
        expect(err.code).to.equal(status.AEROSPIKE_ERR_PARAM)

        client.get(key, function (err, record2, metadata2, key2) {
          if (err) { throw new Error(err.message) }
          expect(record2['i']).to.equal(123)
          expect(record2['s']).to.equal('abc')

          client.remove(key2, function (err, key) {
            if (err) { throw new Error(err.message) }
            done()
          })
        })
      })
    })
  })
})
