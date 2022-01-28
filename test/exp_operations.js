// *****************************************************************************
// Copyright 2021 Aerospike, Inc.
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
const exp = Aerospike.expressions
const op = Aerospike.operations
const expop = Aerospike.exp_operations
const lists = Aerospike.lists
const GeoJSON = Aerospike.GeoJSON

const FILTERED_OUT = Aerospike.status.FILTERED_OUT

const helper = require('./test_helper')
const keygen = helper.keygen
const temp_bin = "ExpVar"

describe('Aerospike.exp_operations', function () {
  helper.skipUnlessVersion('>= 5.0.0', this)

  const client = helper.client

  async function createRecord (bins, meta = null) {
    const key = keygen.string(helper.namespace, helper.set, { prefix: 'test/exp' })()
    await client.put(key, bins, meta)
    return key
  }

  async function applyExp (key, bin, expression, flags) {
    //const policy = { filterExpression: expression }
    const ops = [op.read(bin), 
                  expop.read(temp_bin, exp.add(exp.binInt(bin), exp.int(2)), flags)]//,exp.and(exp.binExists(bin), exp.lists(bin))]
    // const ops = [op.read(bin)]
    const result = await client.operate(key, ops, {})
    return result.bins[bin]
  }

  it('builds up a filter expression value', function () {
    const filter = exp.eq(exp.binInt('intVal'), exp.int(42))
    expect(filter).to.be.an('array')
  })

  describe('exp_operations on arithmetic expressions', function () {
    describe('int bin add expression', function () {
      it('evaluates exp_read op to true if an temp bin equals the sum of bin and given value', async function () {
        const key = await createRecord({ intVal: 2 })
        const ops = [ 
                    expop.read(temp_bin, 
                        exp.add(exp.binInt('intVal'), exp.binInt('intVal')), 
                        0),
                    op.read('intVal')
                  ]
        const result = await client.operate(key, ops, {})
        //console.log(result)
        expect(result.bins.intVal).to.eql(2)
        expect(result.bins.ExpVar).to.eql(4)
      })
      it('evaluates exp_read op to true if an temp bin equals the sum of bin and given value', async function () {
        const key = await createRecord({ intVal: 2 })
        const ops = [ 
                    expop.write('intVal', 
                        exp.add(exp.binInt('intVal'), exp.binInt('intVal')), 
                        0),
                    op.read('intVal')
                  ]
        const result = await client.operate(key, ops, {})
        //console.log(result)
        expect(result.bins.intVal).to.eql(4)
      })
    })
  })
})
