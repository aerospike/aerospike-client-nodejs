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
