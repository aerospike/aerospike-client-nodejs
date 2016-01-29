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
const aerospike = require('../lib/aerospike')
const helper = require('./test_helper')
const expect = require('expect.js')

const status = aerospike.status

describe('client.index()', function () {
  var client = helper.client

  it('should create an integer index', function (done) {
    var args = { ns: helper.namespace,
      set: helper.set,
      bin: 'integer_bin',
    index: 'integer_index' }
    client.createIntegerIndex(args, function (err) {
      expect(err).not.to.be.ok()
      done()
    })
  })

  it('should create an string index', function (done) {
    var args = { ns: helper.namespace, set: helper.set, bin: 'string_bin',
    index: 'string_index' }
    client.createStringIndex(args, function (err) {
      expect(err).not.to.be.ok()
      done()
    })
  })

  it('should create an integer index with info policy', function (done) {
    var args = { ns: helper.namespace, set: helper.set, bin: 'policy_bin',
    index: 'policy_index', policy: { timeout: 1000, send_as_is: true, check_bounds: false }}
    client.createIntegerIndex(args, function (err) {
      expect(err).not.to.be.ok()
      done()
    })
  })

  it('should drop an index', function (done) {
    client.indexRemove(helper.namespace, 'string_integer', function (err) {
      expect(err).not.to.be.ok()
      done()
    })
  })

  it('should create an integer index and wait until index creation is done', function (done) {
    var args = { ns: helper.namespace,
      set: helper.set,
      bin: 'integer_done',
    index: 'integer_index_done' }
    client.createIntegerIndex(args, function (err) {
      expect(err).not.to.be.ok()
      client.indexCreateWait(helper.namespace, 'integer_index_done', 1000, function (err) {
        expect(err).not.to.be.ok()
        done()
      })
    })
  })

  it('should create a string index and wait until index creation is done', function (done) {
    var args = { ns: helper.namespace,
      set: helper.set,
      bin: 'string_done',
    index: 'string_index_done' }
    client.createStringIndex(args, function (err) {
      expect(err).not.to.be.ok()
      client.indexCreateWait(helper.namespace, 'string_index_done', 1000, function (err) {
        expect(err).not.to.be.ok()
        done()
      })
    })
  })
})
