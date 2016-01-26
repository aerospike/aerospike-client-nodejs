// *****************************************************************************
// Copyright 2013-2016 Aerospike, Inc.
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

var Aerospike = require('../../lib/aerospike')
var status = Aerospike.status

function put_done (total, done) {
  var entries = {}
  var count = 0

  return function (_key, record, metadata) {
    return function (err, key, skippy) {
      switch (err) {
        case null:
          entries[key.key] = {
            status: 0,
            key: key,
            record: record,
            metadata: metadata
          }
          break
        default:
          console.error('Error: ', err, key)
      }

      count++
      if (count >= total) {
        done(entries)
      }
    }
  }
}

function put (client, n, keygen, recgen, metagen, done) {
  var d = put_done(n, done)
  var i

  for (i = 0; i < n; i++) {
    var key = keygen()
    var metadata = metagen(key)
    var record = recgen(key, metadata)
    var callback = d(key, record, metadata)
    client.put(key, record, metadata, callback)
  }
}

module.exports = {
  put: put
}
