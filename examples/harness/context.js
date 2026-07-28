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

const path = require('path')
const semver = require('semver')
const Aerospike = require('./aerospikeClient')
const { ExampleSkipError } = require('./errors')

const UDF_USERDIR = path.normalize(path.join(__dirname, '..', 'lua'))

function buildClientConfig (args) {
  const defaultPolicy = {
    timeout: args.totalTimeout,
    totalTimeout: args.totalTimeout
  }
  const config = {
    hosts: [{ addr: args.host, port: args.port }],
    policies: {
      apply: defaultPolicy,
      batch: defaultPolicy,
      info: defaultPolicy,
      operate: defaultPolicy,
      query: defaultPolicy,
      read: defaultPolicy,
      remove: defaultPolicy,
      scan: defaultPolicy,
      write: defaultPolicy
    },
    modlua: {
      userPath: UDF_USERDIR
    },
    log: {
      level: Aerospike.log.WARN
    }
  }

  if (args.user) {
    config.user = args.user
    config.password = args.password
  }

  return config
}

async function createConnectedClient (args) {
  const config = buildClientConfig(args)
  Aerospike.setDefaultLogging(config.log)
  const client = Aerospike.client(config)
  await client.connect()
  return client
}

function createExampleContext (client, args, console) {
  const config = client.config
  const policy = { ...config.policies.read }
  const writePolicy = { ...config.policies.write }
  const batchPolicy = { ...config.policies.batch }

  const context = {
    client,
    args,
    console,
    ns: args.namespace,
    set: args.set,
    policy,
    writePolicy,
    batchPolicy,
    skipUnless (condition, reason) {
      if (!condition) {
        throw new ExampleSkipError(reason)
      }
    },
    requireEnterprise () {
      context.skipUnless(args.enterprise, 'requires Enterprise edition')
    },
    requireStrongConsistency () {
      context.skipUnless(args.scMode, 'requires strong consistency mode')
    },
    requireAuth () {
      context.skipUnless(args.user, 'requires authentication')
    },
    requireTls () {
      context.skipUnless(args.tlsEnabled, 'requires TLS')
    },
    requireMinServerVersion (version) {
      if (!args.serverVersion) {
        throw new ExampleSkipError(`requires server version ${version} or later`)
      }
      if (!semver.gte(args.serverVersion, version)) {
        throw new ExampleSkipError(`requires server version ${version} or later`)
      }
    }
  }

  return context
}

module.exports = {
  buildClientConfig,
  createConnectedClient,
  createExampleContext
}
