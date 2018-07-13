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
const shared = require('./shared')

shared.runner()

async function udfRegister (client, argv) {
  let job = await client.udfRegister(argv.file)
  await job.waitUntilDone()
  console.info('UDF module registered successfully')
}

exports.command = 'udfRegister <file>'
exports.describe = 'Register a UDF with the cluster'
exports.handler = shared.run(udfRegister)
