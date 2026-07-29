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

const Aerospike = require('./aerospikeClient')
const semver = require('semver')

function parseNamespaceFlag (namespaceTokens, name) {
  const search = `${name}=`
  const begin = namespaceTokens.indexOf(search)
  if (begin < 0) {
    return false
  }
  const valueStart = begin + search.length
  const end = namespaceTokens.indexOf(';', valueStart)
  const value = end < 0
    ? namespaceTokens.slice(valueStart)
    : namespaceTokens.slice(valueStart, end)
  return value === 'true'
}

async function populateServerCapabilities (client, args) {
  const buildInfo = await client.infoAny('build\nedition\nrelease')
  const parsedBuild = Aerospike.info.parse(buildInfo)
  const build = parsedBuild.build || ''
  args.build = build
  args.serverVersion = semver.coerce(build)

  const edition = parsedBuild.edition
  const editionStr = edition == null ? '' : String(edition)
  args.enterprise = /Enterprise/.test(editionStr)

  const nsKey = `namespace/${args.namespace}`
  const nsInfo = await client.infoAny(nsKey)
  const parsedNs = Aerospike.info.parse(nsInfo)
  const namespaceMeta = parsedNs[nsKey]
  if (namespaceMeta && typeof namespaceMeta === 'object' && !Array.isArray(namespaceMeta)) {
    args.scMode = namespaceMeta['strong-consistency'] === true
  } else {
    const namespaceTokens = typeof namespaceMeta === 'string' ? namespaceMeta : ''
    args.scMode = parseNamespaceFlag(namespaceTokens, 'strong-consistency')
  }

  args.tlsEnabled = Boolean(args.tlsPolicy)
}

module.exports = { populateServerCapabilities, parseNamespaceFlag }
