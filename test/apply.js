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

/* global expect, describe, it, before, after */

const Aerospike = require('../lib/aerospike')
const helper = require('./test_helper')

const keygen = helper.keygen

describe('client.apply()', function () {
  let client = helper.client
  let key = keygen.string(helper.namespace, helper.set, {prefix: 'test/apply/'})()

  before(() => helper.udf.register('udf.lua')
    .then(() => client.put(key, {'foo': 'bar'}, {ttl: 1000})))

  after(() => helper.udf.remove('udf.lua')
    .then(() => client.remove(key)))

  it('should invoke an UDF to without any args', function (done) {
    var udfArgs = { module: 'udf', funcname: 'withoutArguments' }
    client.apply(key, udfArgs, function (error, result) {
      if (error) throw error
      expect(result).to.equal(1)
      done()
    })
  })

  it('should invoke an UDF with arguments', function (done) {
    var udfArgs = { module: 'udf', funcname: 'withArguments', args: [42] }
    client.apply(key, udfArgs, function (error, result) {
      if (error) throw error
      expect(result).to.equal(42)
      done()
    })
  })

  it('should invoke an UDF with apply policy', function (done) {
    var applypolicy = {timeout: 1500}
    var udfArgs = { module: 'udf', funcname: 'withArguments', args: [[1, 2, 3]] }
    client.apply(key, udfArgs, applypolicy, function (error, result) {
      if (error) throw error
      expect(result).to.eql([1, 2, 3])
      done()
    })
  })

  it('should return an error if the user-defined function does not exist', function (done) {
    var udfArgs = { module: 'udf', funcname: 'not-such-function' }
    client.apply(key, udfArgs, function (error, result) {
      expect(error.code).to.equal(Aerospike.status.ERR_UDF)
      done()
    })
  })

  it('should return an error if the UDF arguments are invalid', function (done) {
    var udfArgs = { module: 'udf', funcname: 'noop', args: 42 } // args should always be an array
    client.apply(key, udfArgs, function (error, result) {
      expect(error.code).to.equal(Aerospike.status.ERR_PARAM)
      done()
    })
  })

  it('should return a Promise that resolves to the return value of the UDF function', function () {
    var udfArgs = { module: 'udf', funcname: 'withoutArguments' }

    return client.apply(key, udfArgs)
      .then(result => expect(result).to.be(1))
  })
})
