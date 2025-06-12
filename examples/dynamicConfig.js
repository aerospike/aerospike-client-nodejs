#!/usr/bin/env node
// *****************************************************************************
// Copyright 2025 Aerospike, Inc.
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

async function dynamicConfig (client, argv) {
  const config = {
    hosts: [
      { addr: argv.hosts, port: argv.port}
    ],
    configProvider: {
      path: argv.dcp,
      interval: 1
    }
  }
  if(argv.user){
    config.user = argv.user
  }

  if(argv.password){
    config.password = argv.password
  }
  let cli = null
  try{
    console.log("Connecting...")
    cli = await Aerospike.connect(config)
    console.log("Connected!")
  }
  catch(error){
    console.log("Failed with: " + str(error))
  }
  finally{
    if(client){
      await cli.close()
    }
  }
}

exports.command = 'dynamicConfig'
exports.describe = 'Dynamic Config'
exports.handler = shared.run(dynamicConfig)
exports.builder = {
  'dynamic_config_path': {
    alias: 'dcp',
    describe: 'Path of dynamic config',
    type: 'string',
    default: './example_config/config.yml'
  }
}
