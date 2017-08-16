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

/* global context, expect, describe, it */

const helper = require('./test_helper')
const keygen = helper.keygen

describe('client.exists()', function () {
  let client = helper.client

  context('Promises', function () {
    it('returns true if the record exists', function () {
      let key = keygen.string(helper.namespace, helper.set, {prefix: 'test/exists/'})()

      return client.put(key, {str: 'abcde'})
        .then(() => client.exists(key))
        .then(result => expect(result).to.be(true))
        .then(() => client.remove(key))
    })

    it('returns false if the record does not exist', function () {
      let key = keygen.string(helper.namespace, helper.set, {prefix: 'test/exists/'})()

      return client.exists(key)
        .then(result => expect(result).to.be(false))
    })
  })

  context('Callbacks', function () {
    it('returns true if the record exists', function (done) {
      let key = keygen.string(helper.namespace, helper.set, {prefix: 'test/exists/'})()

      client.put(key, {str: 'abcde'}, error => {
        if (error) throw error
        client.exists(key, (error, result) => {
          if (error) throw error
          expect(result).to.be(true)
          client.remove(key, error => {
            if (error) throw error
            done()
          })
        })
      })
    })

    it('returns false if the record does not exist', function (done) {
      let key = keygen.string(helper.namespace, helper.set, {prefix: 'test/exists/'})()

      client.exists(key, (error, result) => {
        if (error) throw error
        expect(result).to.be(false)
        done()
      })
    })
  })
})
