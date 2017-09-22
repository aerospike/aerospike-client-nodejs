// *****************************************************************************
// Copyright 2013-2017 Aerospike, Inc.
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
  var parts = hostString.match(HOST_RE)
  if (!parts) {
    throw new Error('Invalid host address: ' + hostString)
  }
  var host = {}
  host.addr = parts[1]
  var tlsName = parts[2]
  if (tlsName) {
    host.tls = tlsName
  }
  var port = parts[3]
  host.port = port ? Number.parseInt(port, 10) : 3000
  return host
}

function parseHostsString (str) {
  return str
      .split(',')
      .map(function (str) { return str.trim() })
      .filter(function (x) { return !!x })
      .map(parseHostString)
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
  parseHostsString: parseHostsString,
  print: print
}
