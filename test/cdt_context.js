// *****************************************************************************
// Copyright 2013-2019 Aerospike, Inc.
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

const lists = Aerospike.lists
const Context = Aerospike.cdt.Context

const {
  assertResultEql,
  cleanup,
  createRecord,
  initState,
  operate
} = require('./util/statefulAsyncTest')

describe('Aerospike.cdt.Context', function () {
  helper.skipUnlessVersion('>= 4.6.0', this)

  describe('Context.addListIndex', function () {
    it('sets the context to the nested list/map at the specified list index', function () {
      const context = new Context().addListIndex(1)

      return initState()
        .then(createRecord({ nested: [[1, 2], [5, 6], [3, 4], [5, 6]] }))
        .then(operate(lists.get('nested', 0).withContext(context)))
        .then(assertResultEql({ nested: 5 }))
        .then(cleanup)
    })
  })

  describe('Context.addListRank', function () {
    it('sets the context to the nested list/map at the specified list rank', function () {
      const context = new Context().addListRank(1)

      return initState()
        .then(createRecord({ nested: [[1, 2], [5, 6], [3, 4], [5, 6]] }))
        .then(operate(lists.get('nested', 0).withContext(context)))
        .then(assertResultEql({ nested: 3 }))
        .then(cleanup)
    })
  })

  describe('Context.addListValue', function () {
    it('sets the context to the specified list value', function () {
      const context = new Context().addListValue([5, 6])

      return initState()
        .then(createRecord({ nested: [[1, 2], [5, 6], [3, 4], [5, 6]] }))
        .then(operate(lists.get('nested', 0).withContext(context)))
        .then(assertResultEql({ nested: 5 }))
        .then(cleanup)
    })
  })

  describe('Context.addMapIndex', function () {
    it('sets the context to the nested list/map at the specified map index', function () {
      const context = new Context().addMapIndex(1)

      return initState()
        .then(createRecord({ nested: { a: [1, 2], c: [5, 6], b: [3, 4], d: [5, 6] } }))
        .then(operate(lists.get('nested', 0).withContext(context)))
        .then(assertResultEql({ nested: 3 }))
        .then(cleanup)
    })
  })

  describe('Context.addMapRank', function () {
    it('sets the context to the nested list/map at the specified map index', function () {
      const context = new Context().addMapRank(1)

      return initState()
        .then(createRecord({ nested: { a: [1, 2], c: [5, 6], b: [3, 4], d: [5, 6] } }))
        .then(operate(lists.get('nested', 0).withContext(context)))
        .then(assertResultEql({ nested: 3 }))
        .then(cleanup)
    })
  })

  describe('Context.addMapKey', function () {
    it('sets the context to the nested list/map with the specified map key', function () {
      const context = new Context().addMapKey('d')

      return initState()
        .then(createRecord({ nested: { a: [1, 2], c: [5, 6], b: [3, 4], d: [5, 6] } }))
        .then(operate(lists.get('nested', 0).withContext(context)))
        .then(assertResultEql({ nested: 5 }))
        .then(cleanup)
    })
  })

  describe('Context.addMapValue', function () {
    it('sets the context to the nested list/map value', function () {
      const context = new Context().addMapValue([5, 6])

      return initState()
        .then(createRecord({ nested: { a: [1, 2], c: [5, 6], b: [3, 4], d: [5, 6] } }))
        .then(operate(lists.get('nested', 0).withContext(context)))
        .then(assertResultEql({ nested: 5 }))
        .then(cleanup)
    })
  })
})
