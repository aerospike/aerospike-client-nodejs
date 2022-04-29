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

describe('client.batchApply()', function () {
  const client = helper.client

  before(function () {
    const nrecords = 10
    const generators = {
      keygen: keygen.string(helper.namespace, helper.set, { prefix: 'test/batch_apply/', random: false }),
      recgen: recgen.record({
        i: valgen.integer(),
        s: valgen.string(),
        str2: valgen.string('hello'),
        l: () => [1, 2, 3],
        m: () => { return { a: 1, b: 2, c: 3 } }
      }),
      metagen: metagen.constant({ ttl: 1000 })
    }
    helper.udf.register('udf.lua')
    return putgen.put(nrecords, generators)
  })

  context('with batch apply', function () {
    helper.skipUnlessVersion('>= 6.0.0', this)

    it('apply udf on batch of records', function (done) {
      const batchRecords = [
        new Key(helper.namespace, helper.set, 'test/batch_apply/1'),
        new Key(helper.namespace, helper.set, 'test/batch_apply/2'),
        new Key(helper.namespace, helper.set, 'test/batch_apply/3'),
        new Key(helper.namespace, helper.set, 'test/batch_apply/4'),
        new Key(helper.namespace, helper.set, 'test/batch_apply/5')
      ]
      const policy = new Aerospike.BatchPolicy({
        totalTimeout: 1500
      })
      const udf = {
        module: 'udf',
        funcname: 'withArguments',
        args: [[1, 2, 3]]
      }

      client.batchApply(batchRecords, udf, policy, function (err, results) {
        expect(err).not.to.be.ok()
        expect(results.length).to.equal(5)
        results.forEach(function (result) {
          // console.log(util.inspect(result, true, 10, true))
          expect(result.status).to.equal(Aerospike.status.OK)
          expect(result.record.bins.SUCCESS).to.eql([1, 2, 3])
        })
        done()
      })
    })
  })
})
