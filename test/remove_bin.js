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

const { expect } = require('chai')
/* global describe, context, it */

const Aerospike = require('../lib/aerospike')
const helper = require('./test_helper')

const keygen = helper.keygen

const status = Aerospike.status
const AerospikeError = Aerospike.AerospikeError

describe('client.put(null bin)', function () {
  const client = helper.client

  context('with simple put null value', function () {
    it('delete bin using null put', function () {
      const key = keygen.string(helper.namespace, helper.set, { prefix: 'test/remove_bin/' })()

      return client.put(key, { str: 'abcde' })
        .then(() => {
          client.put(key, { str: null })
            .then(() => {
              client.get(key, function (err, bins, meta) {
                expect(err).to.be.instanceof(AerospikeError).with.property('code', status.ERR_RECORD_NOT_FOUND)
              })
            })
        })
    })
  })
})
