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

const as = require('../build/Release/aerospike.node')

const Client = require('./client.js')
const dataTypes = require('./data_types.js')
const filter = require('./filter.js')
const operator = require('./operator.js')

const client = function client (config) {
  return new Client(config)
}

const connect = function connect (config, callback) {
  if (typeof config === 'function') {
    callback = config
    config = {}
  }
  var client = new Client(config)
  client.connect(callback)
  return client
}

const key = function key (ns, set, key) {
  return new dataTypes.Key(ns, set, key)
}

module.exports = {
  Client: Client,
  AerospikeError: dataTypes.AerospikeError,
  Double: dataTypes.Double,
  GeoJSON: dataTypes.GeoJSON,
  Key: dataTypes.Key,
  client: client,
  connect: connect,
  filter: filter,
  indexType: as.indexType,
  key: key,
  language: as.language,
  log: as.log,
  operator: operator,
  policy: as.policy,
  predicates: as.predicates,
  scanPriority: as.scanPriority,
  scanStatus: as.scanStatus,
  status: as.status
}
