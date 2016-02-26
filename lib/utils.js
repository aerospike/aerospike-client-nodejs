// *****************************************************************************
// Copyright 2016 Aerospike, Inc.
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

function parseHostString (host) {
  host = host.split(':')
  return {
    addr: host[0] || 'localhost',
    port: parseInt(host[1], 10) || 3000
  }
}

function parseHostsString (str) {
  if (!str || !/^([a-z0-9-_\.]+(:\d+)?,?)+$/i.test(str)) {
    throw new Error('Invalid aerospike connection string: ' + str)
  }

  return str
      .split(',')
      .filter(function (x) { return !!x })
      .map(parseHostString)
}

module.exports = {
  parseHostString: parseHostString,
  parseHostsString: parseHostsString
}
