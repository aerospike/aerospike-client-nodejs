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

'use strict'

const HOST_RE = /^(\[[0-9a-f:]+]|(?:\d{1,3}\.){3}\d{1,3}|[a-z][a-z0-9\-.]+)(?::([a-z][a-z0-9\-.]+))?(?::(\d+))?$/i

function parseHostString (hostString) {
  const parts = hostString.match(HOST_RE)
  if (!parts) {
    throw new Error('Invalid host address: ' + hostString)
  }

  const host = {}

  let addr = parts[1]
  if (addr.startsWith('[') && addr.endsWith(']')) {
    addr = addr.substr(1, addr.length - 2)
  }
  host.addr = addr

  const tlsName = parts[2]
  if (tlsName) {
    host.tls = tlsName
  }

  const port = parts[3]
  host.port = port ? Number.parseInt(port, 10) : 3000

  return host
}

function print (err, result) {
  if (err) {
    console.error('Error:', err.message)
  } else {
    console.info('Result:', result)
  }
}

module.exports = {
  parseHostString: parseHostString,
  print: print
}
