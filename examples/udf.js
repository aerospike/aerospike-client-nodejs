#!/usr/bin/env node
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
//
const shared = require('./shared')
const path = require('path')

shared.runner()

async function udfRegister (client, argv) {
  const module = argv.module
  const job = await client.udfRegister(module)
  await job.waitUntilDone()
  console.info('UDF module registered successfully')
}

async function udfRemove (client, argv) {
  const module = path.basename(argv.module)
  const job = await client.udfRemove(module)
  await job.waitUntilDone()
  console.info('UDF module removed successfully')
}

exports.command = 'udf <command>'
exports.describe = 'Manage User-Defined Functions (UDF)'
exports.builder = yargs => {
  return yargs
    .command({
      command: 'register <module>',
      desc: 'Register a new UDF module with the cluster',
      handler: shared.run(udfRegister)
    })
    .command({
      command: 'remove <module>',
      desc: 'Remove a UDF module from the cluster',
      handler: shared.run(udfRemove)
    })
}
