// *****************************************************************************
// Copyright 2013-2017 Aerospike, Inc.
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
const helper = require('./test_helper')

const keygen = helper.keygen

const status = Aerospike.status
const op = Aerospike.operations

describe('client.operate()', function () {
  var client = helper.client

  describe('operations.write()', function () {
    it('should write a bin with a double value', function (done) {
      var key = keygen.string(helper.namespace, helper.set, {prefix: 'test/op.write/double'})()

      client.put(key, { bin1: 1.23, bin2: new Double(1.0) }, function (err) {
        if (err) throw err
        var ops = [
          op.write('bin1', 2.34),
          op.write('bin2', new Double(2.0))
        ]

        client.operate(key, ops, function (err, result) {
          if (err) throw err

          client.get(key, function (err, record) {
            if (err) throw err
            expect(record.bins).to.eql({ bin1: 2.34, bin2: 2.0 })

            client.remove(key, function (err) {
              if (err) throw err
              done()
            })
          })
        })
      })
    })

    it('should delete a bin by writing null to it', function (done) {
      var key = keygen.string(helper.namespace, helper.set, {prefix: 'test/op.write/null'})()

      client.put(key, {bin1: 123, bin2: 456}, function (err) {
        if (err) throw err
        var ops = [
          op.write('bin1', null)
        ]

        client.operate(key, ops, function (err, result) {
          expect(err).to.not.be.ok()

          client.get(key, function (err, record) {
            if (err) throw err
            expect(record.bins).to.eql({bin2: 456})

            client.remove(key, function (err) {
              if (err) throw err
              done()
            })
          })
        })
      })
    })
  })

  describe('operations.incr()', function () {
    it('should increment bin with integer value', function (done) {
      var key = keygen.string(helper.namespace, helper.set, {prefix: 'test/incr/int'})()

      client.put(key, {i: 123}, function (err) {
        if (err) throw err
        var ops = [
          op.incr('i', 432)
        ]

        client.operate(key, ops, function (err, result) {
          expect(err).to.not.be.ok()

          client.get(key, function (err, record2) {
            if (err) throw err
            expect(record2.bins['i']).to.equal(555)

            client.remove(key, function (err) {
              if (err) throw err
              done()
            })
          })
        })
      })
    })

    it('should increment bin with double value', function (done) {
      var key = keygen.string(helper.namespace, helper.set, {prefix: 'test/incr/double'})()

      client.put(key, {f: 3.14159}, function (err) {
        if (err) throw err
        var ops = [
          op.incr('f', 2.71828)
        ]

        client.operate(key, ops, function (err) {
          expect(err).to.not.be.ok()

          client.get(key, function (err, record2) {
            if (err) throw err
            expect(record2.bins['f']).to.equal(5.85987)

            client.remove(key, function (err) {
              if (err) throw err
              done()
            })
          })
        })
      })
    })

    it('should increment bin with Double value', function (done) {
      var key = keygen.string(helper.namespace, helper.set, {prefix: 'test/incr/Double'})()

      client.put(key, {f: 3.14159}, function (err) {
        if (err) throw err
        var ops = [
          op.incr('f', new Double(1.0))
        ]

        client.operate(key, ops, function (err) {
          expect(err).to.not.be.ok()

          client.get(key, function (err, record2) {
            if (err) throw err
            expect(record2.bins['f']).to.equal(4.14159)

            client.remove(key, function (err) {
              if (err) throw err
              done()
            })
          })
        })
      })
    })
  })

  it('should append a string value to a string bin', function (done) {
    let key = keygen.string(helper.namespace, helper.set, {prefix: 'test/operate/'})()
    let bins = {i: 123, s: 'abc'}
    let meta = {ttl: 1000}

    client.put(key, bins, meta, function (err) {
      if (err) throw err

      var ops = [
        op.append('s', 'def'),
        op.read('s')
      ]
      client.operate(key, ops, function (err, record) {
        if (err) throw err

        expect(record.bins).to.only.have.keys(['s'])
        expect(record.bins['s']).to.equal('abcdef')

        client.get(key, function (err, record2) {
          if (err) throw err

          expect(record2.bins).to.eql({ i: 123, s: 'abcdef' })

          client.remove(key, function (err) {
            if (err) throw err
            done()
          })
        })
      })
    })
  })

  it('should prepend a string value to a string bin', function (done) {
    let key = keygen.string(helper.namespace, helper.set, {prefix: 'test/operate/'})()
    let bins = {i: 123, s: 'abc'}
    let meta = {ttl: 1000}

    client.put(key, bins, meta, function (err) {
      if (err) throw err

      var ops = [
        op.prepend('s', 'def'),
        op.read('s')
      ]
      client.operate(key, ops, function (err, record) {
        if (err) throw err

        expect(record.bins).to.only.have.keys(['s'])
        expect(record.bins['s']).to.equal('defabc')

        client.get(key, function (err, record2) {
          if (err) throw err

          expect(record2.bins).to.eql({ i: 123, s: 'defabc' })

          client.remove(key, function (err) {
            if (err) throw err
            done()
          })
        })
      })
    })
  })

  it('should touch a record (refresh ttl)', function (done) {
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

    let key = keygen.string(helper.namespace, helper.set, {prefix: 'test/operate/'})()
    let bins = {i: 123, s: 'abc'}
    let meta = {ttl: 1000}

    client.put(key, bins, meta, function (err) {
      if (err) throw err

      var ops = [
        op.touch(2592000)
      ]
      client.get(key, function (err, record) {
        if (err) throw err
        var ttlDiff = record.ttl - meta.ttl

        client.operate(key, ops, function (err) {
          if (err) throw err

          client.get(key, function (err, record2) {
            if (err) throw err

            expect(record.bins).to.eql(bins)
            expect(2592000 + ttlDiff + 10).to.be.above(record2.ttl)
            expect(2592000 + ttlDiff - 10).to.be.below(record2.ttl)

            client.remove(key, function (err) {
              if (err) throw err
              done()
            })
          })
        })
      })
    })
  })

  it('should prepend using prepend API and verify the bin', function (done) {
    var key = keygen.string(helper.namespace, helper.set, {prefix: 'test/operate/'})()
    var bins = {i: 123, s: 'abc'}

    client.put(key, bins, {ttl: 1000}, function (err) {
      if (err) throw err

      var bin = {s: 'def'}
      client.prepend(key, bin, function (err) {
        if (err) throw err

        client.get(key, function (err, record) {
          if (err) throw err
          expect(record.bins['s']).to.equal('defabc')

          client.remove(key, function (err) {
            if (err) throw err
            done()
          })
        })
      })
    })
  })

  it('should append a bin using append API and verify the bin', function (done) {
    var key = keygen.string(helper.namespace, helper.set, {prefix: 'test/operate/'})()
    var bins = {i: 123, s: 'abc'}

    client.put(key, bins, {ttl: 1000}, function (err) {
      if (err) throw err

      var bin = {s: 'def'}
      client.append(key, bin, function (err) {
        if (err) throw err

        client.get(key, function (err, record) {
          if (err) throw err
          expect(record.bins['s']).to.equal('abcdef')

          client.remove(key, function (err) {
            if (err) throw err
            done()
          })
        })
      })
    })
  })

  it('should add a value to a bin and verify', function (done) {
    var key = keygen.string(helper.namespace, helper.set, {prefix: 'test/operate/'})()
    var bins = {i: 123, s: 'abc'}

    client.put(key, bins, {ttl: 1000}, function (err) {
      if (err) throw err

      var bin = {i: 432}
      client.add(key, bin, function (err) {
        if (err) throw err

        client.get(key, function (err, record) {
          if (err) throw err
          expect(record.bins['i']).to.equal(555)

          client.remove(key, function (err) {
            if (err) throw err
            done()
          })
        })
      })
    })
  })

  it('should fail to add a string value to an integer bin', function (done) {
    var key = keygen.string(helper.namespace, helper.set, {prefix: 'test/operate/'})()
    var bins = {i: 123, s: 'abc'}

    client.put(key, bins, {ttl: 1000}, function (err) {
      if (err) throw err

      var bin = {i: 'str'}
      client.add(key, bin, function (err, record) {
        expect(err.code).to.equal(status.AEROSPIKE_ERR_PARAM)

        client.remove(key, function (err) {
          if (err) throw err
          done()
        })
      })
    })
  })

  it('should fail to append an integer value to a string bin', function (done) {
    var key = keygen.string(helper.namespace, helper.set, {prefix: 'test/operate/'})()
    var bins = {i: 123, s: 'abc'}

    client.put(key, bins, {ttl: 1000}, function (err) {
      if (err) throw err

      var bin = {s: 123}
      client.append(key, bin, function (err, record) {
        expect(err.code).to.equal(status.AEROSPIKE_ERR_PARAM)

        client.remove(key, function (err) {
          if (err) throw err
          done()
        })
      })
    })
  })

  it('should fail to prepend an integer value to a string bin', function (done) {
    var key = keygen.string(helper.namespace, helper.set, {prefix: 'test/operate/'})()
    var bins = {i: 123, s: 'abc'}

    client.put(key, bins, {ttl: 1000}, function (err) {
      if (err) throw err

      var bin = {s: 123}
      client.prepend(key, bin, function (err, record) {
        expect(err.code).to.equal(status.AEROSPIKE_ERR_PARAM)

        client.remove(key, function (err) {
          if (err) throw err
          done()
        })
      })
    })
  })

  it('should return a client error if any of the operations are invalid', function (done) {
    var key = keygen.string(helper.namespace, helper.set, {prefix: 'test/operate/'})()
    var bins = {i: 123, s: 'abc'}

    client.put(key, bins, {ttl: 1000}, function (err) {
      if (err) throw err

      var ops = [
        op.incr('i', 432),
        op.incr('i', 'str')
      ]
      client.operate(key, ops, function (err, record) {
        expect(err.code).to.equal(status.AEROSPIKE_ERR_PARAM)

        client.get(key, function (err, record2) {
          if (err) throw err
          expect(record2.bins['i']).to.equal(123)
          expect(record2.bins['s']).to.equal('abc')

          client.remove(key, function (err) {
            if (err) throw err
            done()
          })
        })
      })
    })
  })

  it('should return a Promise that resolves to the result of the operation', function () {
    var key = keygen.string(helper.namespace, helper.set, {prefix: 'test/operate/'})()
    var ops = [
      op.incr('i', 432),
      op.read('i')
    ]

    return client.put(key, {i: 123})
      .then(() => client.operate(key, ops))
      .then(record => expect(record.bins['i']).to.be(555))
      .then(() => client.remove(key))
  })
})
