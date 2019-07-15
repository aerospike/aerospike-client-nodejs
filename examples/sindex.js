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
const Aerospike = require('aerospike')
const shared = require('./shared')

shared.runner()

async function sindexCreate (client, argv) {
  const options = {
    ns: argv.namespace,
    set: argv.set,
    bin: argv.bin,
    index: argv.index
  }

  let type = argv.type.toUpperCase()
  switch (type) {
    case 'NUMERIC':
      options.datatype = Aerospike.indexDataType.NUMERIC
      break
    case 'STRING':
      type = 'STRING'
      options.datatype = Aerospike.indexDataType.STRING
      break
    case 'GEO2DSPHERE':
      type = 'GEO2DSPHERE'
      options.datatype = Aerospike.indexDataType.GEO2DSPHERE
      break
    default:
      throw new Error(`Unsupported index type: ${argv.type}`)
  }

  await client.createIndex(options)
  console.info(`Creating ${type} index "${options.index}" on bin "${options.bin}"`)
}

async function sindexRemove (client, argv) {
  await client.indexRemove(argv.namespace, argv.index)
  console.info(`Removing index "${argv.index}"`)
}

exports.command = 'sindex <command>'
exports.describe = 'Manage secondary indexes'
exports.builder = yargs => {
  return yargs
    .command({
      command: 'create <bin> <index> <type>',
      desc: 'Create a secondary index',
      handler: shared.run(sindexCreate),
      builder: {
        type: {
          choices: ['numeric', 'string', 'geo2dsphere'],
          hidden: true
        }
      }
    })
    .command({
      command: 'remove <index>',
      desc: 'Remove a secondary index',
      handler: shared.run(sindexRemove)
    })
}
