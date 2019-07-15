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

const shared = require('./shared')

shared.runner()

async function info (client, argv) {
  const request = argv.requests.join('\n')
  if (argv.all) {
    return infoAll(client, request)
  } else if (argv.addr) {
    return infoHost(client, request, argv.addr)
  } else {
    return infoAny(client, request)
  }
}

async function infoAny (client, request) {
  const response = await client.infoAny(request)
  if (response) {
    console.info(response.trim())
  } else {
    console.info('Invalid request')
  }
}

async function infoAll (client, request) {
  const responses = await client.infoAll(request)
  if (responses.some((response) => response.info)) {
    responses.map((response) => {
      console.info(`${response.host.node_id}:`)
      console.info(response.info.trim())
    })
  } else {
    console.info('Invalid request')
  }
}

async function infoHost (client, request, host) {
  const response = await client.info(request, host)
  if (response) {
    console.info(response.trim())
  } else {
    console.info('Invalid request')
  }
}

exports.command = 'info <requests...>'
exports.describe = 'Send an info request to the cluster'
exports.handler = shared.run(info)
exports.builder = {
  any: {
    describe: 'Send request to a single, randomly selected cluster node',
    type: 'boolean',
    group: 'Command:',
    conflicts: ['all', 'addr']
  },
  all: {
    describe: 'Send request to all cluster nodes',
    type: 'boolean',
    group: 'Command:',
    conflicts: ['any', 'addr']
  },
  addr: {
    describe: 'Send request to specified cluster node',
    type: 'string',
    group: 'Command:',
    conflicts: ['any', 'all']
  }
}
