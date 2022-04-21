// *****************************************************************************
// Copyright 2022 Aerospike, Inc.
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
/* global expect */

const Aerospike = require('../lib/aerospike')
const helper = require('./test_helper')
// const util = require('util')

const keygen = helper.keygen
const metagen = helper.metagen
const recgen = helper.recgen
const putgen = helper.putgen
const valgen = helper.valgen

const Key = Aerospike.Key

describe('client.batchRemove()', function () {
  const client = helper.client

  before(function () {
    const nrecords = 10
    const generators = {
      keygen: keygen.string(helper.namespace, helper.set, { prefix: 'test/batch_remove/', random: false }),
      recgen: recgen.record({
        i: valgen.integer(),
        s: valgen.string(),
        str2: valgen.string('hello'),
        l: () => [1, 2, 3],
        m: () => { return { a: 1, b: 2, c: 3 } }
      }),
      metagen: metagen.constant({ ttl: 1000 })
    }
    return putgen.put(nrecords, generators)
  })

  context('with batch remove', function () {
    helper.skipUnlessVersion('>= 6.0.0', this)
    it('removes batch of records', function (done) {
      const batchRecords = [
        new Key(helper.namespace, helper.set, 'test/batch_remove/1'),
        new Key(helper.namespace, helper.set, 'test/batch_remove/2'),
        new Key(helper.namespace, helper.set, 'test/batch_remove/3'),
        new Key(helper.namespace, helper.set, 'test/batch_remove/4'),
        new Key(helper.namespace, helper.set, 'test/batch_remove/5')
      ]

      client.batchRemove(batchRecords, function (err, results) {
        expect(err).not.to.be.ok()
        expect(results.length).to.equal(5)
        results.forEach(function (result) {
          expect(result.status).to.equal(Aerospike.status.OK)
          // expect(results.record.bins).to.be.empty()
          // console.log(util.inspect(result, true, 10, true))
        })
        done()
      })
    })
  })
})
