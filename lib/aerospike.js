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
const Operator = require('./operator.js')
const Filter = require('./filter.js')

const client = function client (config) {
  return new Client(config)
}

const connect = function connect (config, cb) {
  if (typeof config === 'function') {
    cb = config
    config = {}
  }
  return client(config).connect(cb)
}

Aerospike.GeoJSON = function GeoJSON (strval) {
  if (this instanceof GeoJSON) {
    this.str = strval
  } else {
    return new GeoJSON(strval)
  }
}


module.exports = {
  Client: Client,
  Double: as.Double,
  client: client,
  connect: connect,
  filter: Filter,
  indexType: as.indexType,
  key: as.key,
  language: as.language,
  log: as.log,
  operator: Operator,
  policy: as.policy,
  predicates: as.predicates,
  scanPriority: as.scanPriority,
  scanStatus: as.scanStatus,
  status: as.status
}
