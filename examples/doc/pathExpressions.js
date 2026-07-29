// *****************************************************************************
// Copyright 2026 Aerospike, Inc.
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

const Aerospike = require('../harness/aerospikeClient')

const Context = Aerospike.cdt.Context
const USER_KEY = 'pathexprkey'
const MULTIPLIER = 3.7

async function runExample ({ client, ns, set, writePolicy, console }) {
  const key = new Aerospike.Key(ns, set, USER_KEY)
  const addAllChildren = new Context().addAllChildren()

  const modExpression = Aerospike.exp.mul(
    Aerospike.exp.loopVarFloat(Aerospike.exp.loopVarPart.VALUE),
    Aerospike.exp.float(MULTIPLIER)
  )

  const modifyByPath = Aerospike.exp.modifyByPath(
    Aerospike.exp.binList('floatList'),
    Aerospike.exp.type.LIST,
    modExpression,
    Aerospike.exp.pathModifyFlags.DEFAULT,
    addAllChildren
  )

  const ops = [
    Aerospike.exp.operations.write('floatList', modifyByPath, Aerospike.exp.expWriteFlags.DEFAULT)
  ]

  await client.operate(key, ops, null, writePolicy)
  const result = await client.get(key)
  console.info(`PathExpressions floatList=${JSON.stringify(result.bins.floatList)}`)
}

module.exports = { name: 'PathExpressions', runExample, USER_KEY, MULTIPLIER }
