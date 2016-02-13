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

const as = require('../build/Release/aerospike.node')

// const LegacyCallbackHandler = function (self, cb, err) {
//   var args = Array.prototype.slice.call(arguments, 2)
//   cb.apply(self, args)
// }

const NodejsCallbackHandler = function (self, cb, err) {
  if (err && err.code !== as.status.AEROSPIKE_OK) {
    cb.call(self, err)
  } else {
    var args = Array.prototype.slice.call(arguments, 3)
    args.unshift(null)
    cb.apply(self, args)
  }
}

function Client (config) {
  this._client = as.client(config)
  this._callback_handler = NodejsCallbackHandler
}

Client.prototype.connect = function (cb) {
  var self = this
  this._client.connect(function (err) {
    self._callback_handler(self, cb, err, this)
  })
}

Client.prototype.get = function (key, policy, cb) {
  var self = this
  if (typeof policy === 'function') cb = policy
  this._client.get(key, policy, function (err, record, metadata, key) {
    self._callback_handler(self, cb, err, record, metadata, key)
  })
}

module.exports = Client
