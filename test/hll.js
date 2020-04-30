// *****************************************************************************
// Copyright 2020 Aerospike, Inc.
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

/* eslint-env mocha */

const Aerospike = require('../lib/aerospike')
const helper = require('./test_helper')

const hll = Aerospike.hll
const status = Aerospike.status

const {
  assertError,
  assertRecordEql,
  assertResultEql,
  assertResultSatisfy,
  cleanup,
  createRecord,
  expectError,
  initState,
  operate
} = require('./util/statefulAsyncTest')

const isDouble = (number) => typeof number === 'number' && parseInt(number, 10) !== number

describe('client.operate() - HyperLogLog operations', function () {
  helper.skipUnlessVersion('>= 4.9.0', this)

  // HLL object representing the set ('jaguar', 'leopard', 'lion', 'tiger')
  // with an index bit size of 8, and minhash bit size of 0.
  const hllCats = Buffer.from([0, 8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 16, 0, 0, 0, 0,
    0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])

  describe('hll.init', function () {
    it('initializes a HLL bin value', function () {
      return initState()
        .then(createRecord({ foo: 'bar' }))
        .then(operate([
          hll.init('hll', 10),
          hll.describe('hll')
        ]))
        .then(assertResultEql({ hll: [10, 0] }))
        .then(cleanup())
    })

    it('initializes a HLL bin value with minhash bits', function () {
      return initState()
        .then(createRecord({ foo: 'bar' }))
        .then(operate([
          hll.init('hll', 10, 6),
          hll.describe('hll')
        ]))
        .then(assertResultEql({ hll: [10, 6] }))
        .then(cleanup())
    })

    it('re-initializes an existing HLL bin', function () {
      return initState()
        .then(createRecord({ foo: 'bar' }))
        .then(operate(hll.add('hll', ['tiger', 'leopard'], 10)))
        .then(operate([
          hll.init('hll', 12, 4),
          hll.describe('hll')
        ]))
        .then(assertResultEql({ hll: [12, 4] }))
        .then(cleanup())
    })

    context('with HLL policy', function () {
      context('with create-only write flag', function () {
        const policy = {
          writeFlags: hll.writeFlags.CREATE_ONLY
        }

        it('returns an error if the bin already exists', function () {
          return initState()
            .then(createRecord({ foo: 'bar' }))
            .then(operate(hll.add('hll', ['tiger'], 8)))
            .then(expectError())
            .then(operate(
              hll.init('hll', 10).withPolicy(policy)
            ))
            .then(assertError(status.ERR_BIN_EXISTS))
            .then(cleanup())
        })

        context('with no-fail write flag', function () {
          const policy = {
            writeFlags: hll.writeFlags.CREATE_ONLY | hll.writeFlags.NO_FAIL
          }

          it('does not re-initialize the bin', function () {
            return initState()
              .then(createRecord({ foo: 'bar' }))
              .then(operate(hll.add('hll', ['tiger', 'cheetah'], 8)))
              .then(operate(
                hll.init('hll', 12).withPolicy(policy)
              ))
              .then(operate(hll.getCount('hll')))
              .then(assertResultEql({ hll: 2 }))
              .then(cleanup())
          })
        })
      })

      context('with update-only write flag', function () {
        const policy = {
          writeFlags: hll.writeFlags.UPDATE_ONLY
        }

        it('returns an error if the bin does not yet exist', function () {
          return initState()
            .then(createRecord({ foo: 'bar' }))
            .then(expectError())
            .then(operate(
              hll.init('hll', 10, 6).withPolicy(policy)
            ))
            .then(assertError(status.ERR_BIN_NOT_FOUND))
            .then(cleanup())
        })

        context('with no-fail write flag', function () {
          const policy = {
            writeFlags: hll.writeFlags.UPDATE_ONLY | hll.writeFlags.NO_FAIL
          }

          it('does not initialize the bin', function () {
            return initState()
              .then(createRecord({ foo: 'bar' }))
              .then(operate(
                hll.init('hll', 10, 6).withPolicy(policy)
              ))
              .then(assertRecordEql({ foo: 'bar' }))
              .then(cleanup())
          })
        })
      })
    })
  })

  describe('hll.add', function () {
    it('initializes a new HLL value if it does not exist', function () {
      return initState()
        .then(createRecord({ foo: 'bar' }))
        .then(operate(hll.add('hll', ['jaguar', 'tiger', 'tiger', 'leopard', 'lion', 'jaguar'], 8)))
        .then(assertResultEql({ hll: 4 }))
        .then(assertRecordEql({ hll: hllCats, foo: 'bar' }))
        .then(cleanup())
    })

    it('returns an error if the bin is of wrong type', function () {
      return initState()
        .then(createRecord({ hll: 'not a HLL set' }))
        .then(expectError())
        .then(operate(hll.add('hll', ['jaguar', 'tiger', 'tiger', 'leopard', 'lion', 'jaguar'], 8)))
        .then(assertError(status.ERR_BIN_INCOMPATIBLE_TYPE))
        .then(cleanup())
    })

    context('with HLL policy', function () {
      context('with create-only write flag', function () {
        const policy = {
          writeFlags: hll.writeFlags.CREATE_ONLY
        }

        it('returns an error if bin already exist', async function () {
          return initState()
            .then(createRecord({ foo: 'bar' }))
            .then(operate(hll.init('hll', 12)))
            .then(expectError())
            .then(operate(hll.add('hll', ['tiger', 'tiger', 'leopard'], 8).withPolicy(policy)))
            .then(assertError(status.ERR_BIN_EXISTS))
            .then(cleanup())
        })

        context('with no-fail write flag', function () {
          const policy = {
            writeFlags: hll.writeFlags.CREATE_ONLY | hll.writeFlags.NO_FAIL
          }

          it('does not update the bin if it already exists', async function () {
            return initState()
              .then(createRecord({ foo: 'bar' }))
              .then(operate(hll.add('hll', ['tiger', 'lion'], 8)))
              .then(operate(hll.add('hll', ['tiger', 'leopard', 'cheetah'], 8).withPolicy(policy)))
              .then(operate(hll.getCount('hll')))
              .then(assertResultEql({ hll: 2 }))
              .then(cleanup())
          })
        })
      })
    })
  })

  describe('hll.setUnion', function () {
    it('sets a union of the HLL objects with the HLL bin', function () {
      return initState()
        .then(createRecord({ foo: 'bar' }))
        .then(operate([
          hll.add('hll', ['tiger', 'lynx', 'cheetah', 'tiger'], 8),
          hll.setUnion('hll', [hllCats]),
          hll.getCount('hll')
        ]))
        .then(assertResultEql({ hll: 6 }))
        .then(cleanup())
    })

    it('returns an error if the index bit count does not match', function () {
      return initState()
        .then(createRecord({ foo: 'bar' }))
        .then(expectError())
        .then(operate([
          hll.add('hll', ['tiger', 'lynx', 'cheetah', 'tiger'], 12),
          hll.setUnion('hll', [hllCats]) // index bit size = 8
        ]))
        .then(assertError(status.ERR_OP_NOT_APPLICABLE))
        .then(cleanup())
    })

    context('with HLL policy', function () {
      context('with create-only write flag', function () {
        const policy = {
          writeFlags: hll.writeFlags.CREATE_ONLY
        }

        it('returns an error if the bin already exists', function () {
          return initState()
            .then(createRecord({ foo: 'bar' }))
            .then(expectError())
            .then(operate([
              hll.add('hll', ['tiger', 'lynx', 'cheetah', 'tiger'], 8),
              hll.setUnion('hll', [hllCats]).withPolicy(policy)
            ]))
            .then(assertError(status.ERR_BIN_EXISTS))
            .then(cleanup())
        })

        context('with no-fail write flag', function () {
          const policy = {
            writeFlags: hll.writeFlags.CREATE_ONLY | hll.writeFlags.NO_FAIL
          }

          it('does not update the bin', function () {
            return initState()
              .then(createRecord({ foo: 'bar' }))
              .then(operate([
                hll.add('hll', ['tiger'], 8),
                hll.setUnion('hll', [hllCats]).withPolicy(policy),
                hll.getCount('hll')
              ]))
              .then(assertResultEql({ hll: 1 }))
              .then(cleanup())
          })
        })
      })

      context('with update-only write flag', function () {
        const policy = {
          writeFlags: hll.writeFlags.UPDATE_ONLY
        }

        it('returns an error if the bin does not exist', function () {
          return initState()
            .then(createRecord({ foo: 'bar' }))
            .then(expectError())
            .then(operate(
              hll.setUnion('hll', [hllCats]).withPolicy(policy)
            ))
            .then(assertError(status.ERR_BIN_NOT_FOUND))
            .then(cleanup())
        })

        context('with no-fail write flag', function () {
          const policy = {
            writeFlags: hll.writeFlags.UPDATE_ONLY | hll.writeFlags.NO_FAIL
          }

          it('does not create the bin', function () {
            return initState()
              .then(createRecord({ foo: 'bar' }))
              .then(operate(
                hll.setUnion('hll', [hllCats]).withPolicy(policy)
              ))
              .then(assertRecordEql({ foo: 'bar' }))
              .then(cleanup())
          })
        })
      })

      context('with allow-fold write flag', function () {
        const policy = {
          writeFlags: hll.writeFlags.ALLOW_FOLD
        }

        it('folds the result to the lowest index bit size', function () {
          return initState()
            .then(createRecord({ foo: 'bar' }))
            .then(operate([
              hll.add('hll', ['tiger', 'lynx', 'cheetah', 'tiger'], 12),
              hll.setUnion('hll', [hllCats]).withPolicy(policy), // index bit size = 8
              hll.describe('hll')
            ]))
            .then(assertResultEql({ hll: [8, 0] }))
            .then(cleanup())
        })
      })
    })
  })

  describe('hll.refreshCount', function () {
    it('updates and then returns the cached count', function () {
      return initState()
        .then(createRecord({ foo: 'bar' }))
        .then(operate([
          hll.add('hll', ['tiger', 'lynx', 'cheetah', 'tiger'], 8),
          hll.add('hll', ['lion', 'tiger', 'puma', 'puma']),
          hll.fold('hll', 6),
          hll.refreshCount('hll')
        ]))
        .then(assertResultEql({ hll: 5 }))
        .then(cleanup())
    })
  })

  describe('hll.fold', function () {
    it('folds the index bit count to the specified value', function () {
      return initState()
        .then(createRecord({ foo: 'bar' }))
        .then(operate([
          hll.init('hll', 16),
          hll.fold('hll', 8),
          hll.describe('hll')
        ]))
        .then(assertResultEql({ hll: [8, 0] }))
        .then(cleanup())
    })

    it('returns an error if the minhash count is not zero', function () {
      return initState()
        .then(createRecord({ foo: 'bar' }))
        .then(expectError())
        .then(operate([
          hll.init('hll', 16, 8),
          hll.fold('hll', 8)
        ]))
        .then(assertError(status.ERR_OP_NOT_APPLICABLE))
        .then(cleanup())
    })
  })

  describe('hll.getCount', function () {
    it('returns the estimated number of elements in the bin', function () {
      return initState()
        .then(createRecord({ foo: 'bar' }))
        .then(operate([
          hll.add('hll', ['leopard', 'tiger', 'tiger', 'jaguar'], 8),
          hll.getCount('hll')
        ]))
        .then(assertResultEql({ hll: 3 }))
        .then(cleanup())
    })
  })

  describe('hll.getUnion', function () {
    it('returns the union of the HLL objects with the HLL bin', function () {
      return initState()
        .then(createRecord({ foo: 'bar' }))
        .then(operate([
          hll.add('hll', ['leopard', 'lynx', 'tiger', 'tiger', 'cheetah', 'lynx'], 8),
          hll.getUnion('hll', [hllCats])
        ]))
        .then(assertResultSatisfy(({ hll }) => Buffer.isBuffer(hll)))
        .then(cleanup())
    })
  })

  describe('hll.getUnionCount', function () {
    it('returns the element count of the union of the HLL objects with the HLL bin', function () {
      return initState()
        .then(createRecord({ foo: 'bar' }))
        .then(operate([
          hll.add('hll', ['leopard', 'lynx', 'tiger', 'tiger', 'cheetah', 'lynx'], 8),
          hll.getUnionCount('hll', [hllCats])
        ]))
        .then(assertResultEql(({ hll: 6 })))
        .then(cleanup())
    })
  })

  describe('hll.getIntersectCount', function () {
    it('returns the element count of the intersection of the HLL objects with the HLL bin', function () {
      return initState()
        .then(createRecord({ foo: 'bar' }))
        .then(operate([
          hll.add('hll', ['leopard', 'lynx', 'tiger', 'tiger', 'cheetah', 'lynx'], 8),
          hll.getIntersectCount('hll', [hllCats])
        ]))
        .then(assertResultEql(({ hll: 2 })))
        .then(cleanup())
    })
  })

  describe('hll.getSimilarity', function () {
    it('returns the similarity of the HLL objects', function () {
      return initState()
        .then(createRecord({ foo: 'bar' }))
        .then(operate([
          hll.add('hll', ['leopard', 'lynx', 'tiger', 'tiger', 'cheetah', 'lynx'], 8),
          hll.getSimilarity('hll', [hllCats])
        ]))
        .then(assertResultSatisfy(({ hll }) => isDouble(hll)))
        .then(cleanup())
    })
  })

  describe('hll.describe', function () {
    it('returns the index and minhash bit counts', function () {
      return initState()
        .then(createRecord({ foo: 'bar' }))
        .then(operate([
          hll.init('hll', 16, 5),
          hll.describe('hll')
        ]))
        .then(assertResultEql({ hll: [16, 5] }))
        .then(cleanup())
    })

    it('returns the index count, with minhash zero', function () {
      return initState()
        .then(createRecord({ foo: 'bar' }))
        .then(operate([
          hll.init('hll', 16),
          hll.describe('hll')
        ]))
        .then(assertResultEql({ hll: [16, 0] }))
        .then(cleanup())
    })
  })
})
