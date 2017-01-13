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

const HOST_RE = /^(\[[0-9a-f:]+\]|(?:\d{1,3}\.){3}\d{1,3}|[a-z][a-z0-9\-\.]+)(?::([a-z][a-z0-9\-\.]+))?(?::(\d+))?$/i

function parseHostString (hostString) {
  var parts = hostString.match(HOST_RE)
  if (!parts) {
    throw new Error('Invalid host address: ' + host)
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

function print (err, results) {
  if (err) {
    console.error(err.message)
  } else {
    results = Array.from(arguments)
      .slice(1)
      .filter(function (elem) {
        return typeof elem !== 'undefined'
      })
    console.info.apply(null, ['Response: '].concat(results))
  }
}

function kvlistToMap (kvList, MapConstructor) {
  MapConstructor = MapConstructor || Map
  var map = new MapConstructor()
  for (var i = 0; i < kvList.length; i = i + 2) {
    var key = kvList[i]
    var value = kvList[i + 1]
    map.set(key, value)
  }
  return map
}

module.exports = {
  parseHostString: parseHostString,
  parseHostsString: parseHostsString,
  print: print,
  kvlistToMap: kvlistToMap
}
