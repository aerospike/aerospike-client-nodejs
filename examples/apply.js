#!/usr/bin/env node
// *****************************************************************************
// Copyright 2013-2018 Aerospike, Inc.
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
//
const Aerospike = require('aerospike')
const shared = require('./shared')

shared.runner()

async function apply (client, argv) {
  const key = new Aerospike.Key(argv.namespace, argv.set, argv.key)

  const udfCall = {
    module: argv.module,
    funcname: argv.function,
    args: argv.args.map(arg => {
      try {
        return JSON.parse(arg)
      } catch (error) {
        return '' + arg
      }
    })
  }

  const result = await client.apply(key, udfCall)
  console.info(result)
}

exports.command = 'apply <key> <module> <function> [args...]'
exports.describe = 'Apply a User-Defined Function (UDF) to a record'
exports.handler = shared.run(apply)
