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

require('../../lib/aerospike')
const helper = require('../test_helper')
const deasync = require('deasync')

// Throttles the number of concurrent calls to the function fn.
// fn is assumed to take a callback function as it's last paramter.
function throttle (max_concurrent, fn) {
  var current = 0
  var self = this
  return function () {
    current += 1
    deasync.loopWhile(function () { return current > max_concurrent })
    var args = Array.prototype.slice.call(arguments)
    var cb = args.pop()
    args.push(function () {
      current -= 1
      cb.apply(this, arguments)
    })
    fn.apply(self, args)
  }
}

function put_done (total, done) {
  var entries = {}
  var count = 0

  return function (key, record, metadata) {
    return function (err) {
      if (err) {
        console.error('Error: ', err, key)
      } else {
        entries[key.key] = {
          status: 0,
          key: key,
          record: record,
          metadata: metadata
        }
      }
      count++
      if (count >= total) {
        done(entries)
      }
    }
  }
}

function put (n, keygen, recgen, metagen, done) {
  var client = helper.client
  var d = put_done(n, done)
  var throttled = throttle.call(client, 200, client.put)

  for (var i = 0; i < n; i++) {
    var key = keygen()
    var metadata = metagen(key)
    var record = recgen(key, metadata)
    var callback = d(key, record, metadata)
    throttled(key, record, metadata, callback)
  }
}

module.exports = {
  put: put
}
