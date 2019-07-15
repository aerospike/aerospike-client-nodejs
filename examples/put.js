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

const Aerospike = require('aerospike')
const shared = require('./shared')

shared.runner()

async function put (client, argv) {
  const key = new Aerospike.Key(argv.namespace, argv.set, argv.key)
  const bins = shared.cli.parseBins(argv.bins)
  const meta = buildMeta(argv)
  const policy = buildPolicy(argv)
  console.info(key, bins, meta, policy)
  await client.put(key, bins, meta, policy)
}

function buildMeta (argv) {
  const meta = { }
  if (argv.ttl) {
    meta.ttl = argv.ttl
  }
  return meta
}

function buildPolicy (argv) {
  const policy = { }
  if (argv.create) {
    policy.exists = Aerospike.policy.exists.CREATE
  }
  if (argv.replace) {
    policy.exists = Aerospike.policy.exists.REPLACE
  }
  if (argv.update) {
    policy.exists = Aerospike.policy.exists.UPDATE
  }
  return policy
}

exports.command = 'put <key> <bins...>'
exports.describe = 'Write a record to the database.'
exports.handler = shared.run(put)
exports.builder = {
  'time-to-live': {
    alias: 'ttl',
    describe: 'Record\'s time-to-live in seconds',
    group: 'Command:',
    type: 'number'
  },
  create: {
    describe: 'Create a new record',
    group: 'Command:',
    requiresArg: false,
    conflicts: ['update', 'replace']
  },
  replace: {
    describe: 'Replace an existing record',
    group: 'Command:',
    requiresArg: false,
    conflicts: ['create', 'update']
  },
  update: {
    describe: 'Update an existing record',
    group: 'Command:',
    requiresArg: false,
    conflicts: ['create', 'replace']
  }
}
