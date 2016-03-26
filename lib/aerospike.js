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

function client (config) {
  config = config || {}
  return new Client(this, config)
}

function connect (config, callback) {
  if (typeof config === 'function') {
    callback = config
    config = null
  }
  var client = this.client(config)
  client.connect(callback)
  return client
}

function key (ns, set, key) {
  return new dataTypes.Key(ns, set, key)
}

// whether event loop resources have been released
var _eventLoopReleased = false

// Release event loop resources held by the native C client library. As long as
// the resources are held the Node.js event loop cannot exit.  Once the event
// loop has been released, the client will no longer be able to process async
// commands, so this should only be called after the client instance has been
// closed.
function releaseEventLoop () {
  _eventLoopReleased = true
  if (as.get_cluster_count() > 0) {
    setTimeout(releaseEventLoop, 5)
  } else {
    as.release_as_event_loop()
  }
}

function eventLoopReleased () {
  return _eventLoopReleased
}

function Aerospike () {
  // classes && data types
  this.Client = Client
  this.AerospikeError = dataTypes.AerospikeError
  this.Double = dataTypes.Double
  this.GeoJSON = dataTypes.GeoJSON
  this.Key = dataTypes.Key

  // top-level methods exposed through Aerospike module
  this.client = client
  this.connect = connect
  this.eventLoopReleased = eventLoopReleased
  this.key = key
  this.releaseEventLoop = releaseEventLoop

  // filter && operator commands
  this.filter = filter
  this.operator = operator

  // enums imported from C client library
  this.indexType = as.indexType
  this.language = as.language
  this.log = as.log
  this.policy = as.policy
  this.predicates = as.predicates
  this.scanPriority = as.scanPriority
  this.scanStatus = as.scanStatus
  this.status = as.status
}
module.exports = new Aerospike()

// as.enable_as_logging()
as.register_as_event_loop()
