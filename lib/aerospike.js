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

'use strict'

var as = require('../build/Release/aerospike.node')
var LargeList = require('./llist.js')
var stream = require('stream')
var inherits = require('util').inherits

// ****************************************************************************
// RecordStream - used for Scan and Query operations
// ****************************************************************************

function RecordStream () {}

inherits(RecordStream, stream)

RecordStream.prototype.writable = false
RecordStream.prototype.readable = true
RecordStream.prototype._read = function () {}

// ****************************************************************************
// Streaming Scan Operation
// ****************************************************************************

// wrapper function around query_foreach function.
// This wrapper receives results from V8 layer and emits 'data' event
// to node.js layer.
// On error, emits 'error' event.
// When all the results are consumed it emits 'end' event.
var execute = function execute () {
  var self = this
  var rs = new RecordStream()

  var onResult = function onResult (res, key) {
    rs.emit('data', res)
  }

  var onError = function onError (error) {
    rs.emit('error', error)
  }

  var onEnd = function onEnd (end) {
    if (!self.isQuery && self.hasUDF) {
      self.scanId = end
      rs.emit('end', end)
    } else {
      rs.emit('end')
    }
  }

  if (self.isQuery) {
    // it is a query request.
    if (self.hasUDF) {
      // query UDF is not supported currently.
      throw new Error('Query UDF feature not supported')
    } else {
      // normal query and query aggregation is invoked here.
      self.foreach(onResult, onError, onEnd)
    }
  } else {
    // it is a scan request
    if (self.hasUDF) {
      // scan with a UDF - so background scan.
      // background scan does not return records. callback for record is NULL.
      self.foreach(null, onError, onEnd)
    } else {
      // it is a foreground scan or scan aggregation.
      self.foreach(onResult, onError, onEnd)
    }
  }
  return rs
}

var Info = function info (scanId, callback) {
  var self = this
  self.queryInfo(scanId, callback)
}

var query = function query (ns, set, options) {
  if (typeof set !== 'string') {
    set = ''
  }

  if (!options) {
    options = null
  }

  var queryObj = this.createQuery(ns, set, options)
  var queryProto = Object.getPrototypeOf(queryObj)

  if (!queryProto.execute) {
    queryProto.execute = execute
  }

  if (!queryProto.Info) {
    queryProto.Info = Info
  }

  return queryObj
}

var createIntegerIndex = function createIntegerIndex (options, callback) {
  var policy
  var set
  if (options && options.policy) {
    policy = options.policy
  }
  if (options && options.set) {
    set = options.set
  }
  this.indexCreate(
    options.ns
    , set
    , options.bin
    , options.index
    , as.indexType.NUMERIC
    , policy
    , callback
  )
}

var createStringIndex = function createStringIndex (options, callback) {
  var policy
  var set
  if (options && options.policy) {
    policy = options.policy
  }
  if (options && options.set) {
    set = options.set
  }
  this.indexCreate(
    options.ns
    , set
    , options.bin
    , options.index
    , as.indexType.STRING
    , policy
    , callback
  )
}

var createGeo2DSphereIndex =
function createGeo2DSphereIndex (options, callback) {
  var policy
  var set
  if (options && options.policy) {
    policy = options.policy
  }
  if (options && options.set) {
    set = options.set
  }
  this.indexCreate(
    options.ns
    , set
    , options.bin
    , options.index
    , as.indexType.GEO2DSPHERE
    , policy
    , callback
  )
}

var parseOperateArgs = function parseOperateArgs (args) {
  var arglength = args.length
  var options = {}
  options.callback = args[arglength - 1]

  if (arglength === 3) {
    options.policy = undefined
    options.metadata = undefined
  } else if (arglength === 4) {
    options.metadata = args[arglength - 2]
    options.policy = undefined
  } else if (arglength === 5) {
    options.policy = args[arglength - 2]
    options.metadata = args[arglength - 3]
  }

  return options
}

var add = function add (key, bins, metadata, policy, callback) {
  var options = parseOperateArgs(arguments)
  // populate ops from bins argument here
  var ops = []
  var prop

  for (prop in bins) {
    ops.push(aerospike.operator.incr(prop, bins[prop]))
  }
  this.operate(key, ops, options.metadata, options.policy, options.callback)
}

var append = function append (key, bins, metadata, policy, callback) {
  var options = parseOperateArgs(arguments)
  // populate ops from bins argument here
  var ops = []
  var prop

  for (prop in bins) {
    ops.push(aerospike.operator.append(prop, bins[prop]))
  }
  this.operate(key, ops, options.metadata, options.policy, options.callback)
}

var prepend = function prepend (key, bins, metadata, policy, callback) {
  var options = parseOperateArgs(arguments)
  // populate ops from bins argument here
  var ops = []
  var prop

  for (prop in bins) {
    ops.push(aerospike.operator.prepend(prop, bins[prop]))
  }

  this.operate(key, ops, options.metadata, options.policy, options.callback)
}

// ****************************************************************************
// `aerospike` shim
// ****************************************************************************

var aerospike = {
  key: as.key,
  status: as.status,
  policy: as.policy,
  language: as.language,
  log: as.log,
  scanPriority: as.scanPriority,
  predicates: as.predicates,
  indexType: as.indexType,
  scanStatus: as.scanStatus,
  Double: as.Double
}

aerospike.client = function client (config) {
  config = config || {}
  
  config.hosts = config.hosts || process.env.AEROSPIKE_HOSTS || "localhost"
  
  if (typeof config.hosts == 'string') {
    config.hosts = parseHostsString(config.hosts);
  }
  
  var client = as.client(config)
  if (client === null) {
    throw new Error('Client object creation failed - null value returned')
  }

  var proto = Object.getPrototypeOf(client)
  if (!proto.createQuery) {
    proto.createQuery = proto.query
    proto.query = query
  }

  if (!proto.createIntegerIndex) {
    proto.createIntegerIndex = createIntegerIndex
  }

  if (!proto.createStringIndex) {
    proto.createStringIndex = createStringIndex
  }

  if (!proto.createGeo2DSphereIndex) {
    proto.createGeo2DSphereIndex = createGeo2DSphereIndex
  }

  if (!proto.LargeList) {
    proto.LargeList = LargeList
  }

  if (!proto.add) {
    proto.add = add
  }

  if (!proto.append) {
    proto.append = append
  }

  if (!proto.prepend) {
    proto.prepend = prepend
  }

  return client
}

var populateOp = function populateOp (op, bin, props) {
  var obj = {}
  obj.operation = op
  obj.bin = bin
  for (var prop in props) {
    obj[prop] = props[prop]
  }
  return obj
}

var populateCdtOp = function populateCdtOp (op, bin, props) {
  var obj = {}
  obj.cdtOperation = op
  obj.bin = bin
  for (var prop in props) {
    obj[prop] = props[prop]
  }
  return obj
}

var readOp = function read (bin) {
  return populateOp(as.operations.READ, bin)
}

var writeOp = function write (bin, value) {
  return populateOp(as.operations.WRITE, bin, {value: value})
}

var incrOp = function incr (bin, value) {
  return populateOp(as.operations.INCR, bin, {value: value})
}

var appendOp = function append (bin, value) {
  return populateOp(as.operations.APPEND, bin, {value: value})
}

var prependOp = function prepend (bin, value) {
  return populateOp(as.operations.PREPEND, bin, {value: value})
}

var touchOp = function touch (bin, ttl) {
  return populateOp(as.operations.TOUCH, bin, {ttl: ttl})
}

var listAppendOp = function listAppend (bin, value) {
  return populateCdtOp(as.cdt_operations.LIST_APPEND, bin, {value: value})
}

var listAppendItemsOp = function listAppendItems (bin, list) {
  return populateCdtOp(as.cdt_operations.LIST_APPEND_ITEMS, bin,
    {list: list})
}

var listInsertOp = function listInsert (bin, index, value) {
  return populateCdtOp(as.cdt_operations.LIST_INSERT, bin,
    {index: index, value: value})
}

var listInsertItemsOp = function listInsertItems (bin, index, list) {
  return populateCdtOp(as.cdt_operations.LIST_INSERT_ITEMS, bin,
    {index: index, list: list})
}

var listPopOp = function listPop (bin, index) {
  return populateCdtOp(as.cdt_operations.LIST_POP, bin, {index: index})
}

var listPopRangeOp = function listPopRange (bin, index, count) {
  return populateCdtOp(as.cdt_operations.LIST_POP_RANGE, bin,
    {index: index, count: count})
}

var listRemoveOp = function listRemove (bin, index) {
  return populateCdtOp(as.cdt_operations.LIST_REMOVE, bin, {index: index})
}

var listRemoveRangeOp = function listRemoveRange (bin, index, count) {
  return populateCdtOp(as.cdt_operations.LIST_REMOVE_RANGE, bin,
    {index: index, count: count})
}

var listClearOp = function listClear (bin) {
  return populateCdtOp(as.cdt_operations.LIST_CLEAR, bin)
}

var listSetOp = function listSet (bin, index, value) {
  return populateCdtOp(as.cdt_operations.LIST_SET, bin,
    {index: index, value: value})
}

var listTrimOp = function listTrim (bin, index, count) {
  return populateCdtOp(as.cdt_operations.LIST_TRIM, bin,
    {index: index, count: count})
}

var listGetOp = function listGet (bin, index) {
  return populateCdtOp(as.cdt_operations.LIST_GET, bin, {index: index})
}

var listGetRangeOp = function listGetRange (bin, index, count) {
  return populateCdtOp(as.cdt_operations.LIST_GET_RANGE, bin,
    {index: index, count: count})
}

var listSizeOp = function listSize (bin) {
  return populateCdtOp(as.cdt_operations.LIST_SIZE, bin)
}

aerospike.operator = {
  read: readOp,
  write: writeOp,
  incr: incrOp,
  append: appendOp,
  prepend: prependOp,
  touch: touchOp,
  listAppend: listAppendOp,
  listAppendItems: listAppendItemsOp,
  listInsert: listInsertOp,
  listInsertItems: listInsertItemsOp,
  listPop: listPopOp,
  listPopRange: listPopRangeOp,
  listRemove: listRemoveOp,
  listRemoveRange: listRemoveRangeOp,
  listClear: listClearOp,
  listSet: listSetOp,
  listTrim: listTrimOp,
  listGet: listGetOp,
  listGetRange: listGetRangeOp,
  listSize: listSizeOp
}

var equalFilter = function equalFilter (args) {
  var obj = {}
  obj.predicate = as.predicates.EQUAL
  if (typeof arguments[1] === 'number') {
    obj.type = as.indexType.NUMERIC
  } else if (typeof arguments[1] === 'string') {
    obj.type = as.indexType.STRING
  }
  obj.bin = arguments[0]
  obj.val = arguments[1]
  return obj
}

var rangeFilter = function rangeFilter (args) {
  var obj = {}
  obj.predicate = as.predicates.RANGE
  obj.type = as.indexType.NUMERIC
  obj.bin = arguments[0]
  obj.min = arguments[1]
  obj.max = arguments[2]
  return obj
}

var geoWithinFilter = function geoWithinFilter (args) {
  var obj = {}
  obj.predicate = as.predicates.RANGE
  obj.type = as.indexType.GEO2DSPHERE
  obj.bin = arguments[0]
  obj.val = arguments[1]
  return obj
}

var geoContainsFilter = function geoContainsFilter (args) {
  var obj = {}
  obj.predicate = as.predicates.RANGE
  obj.type = as.indexType.GEO2DSPHERE
  obj.bin = arguments[0]
  obj.val = arguments[1]
  return obj
}

aerospike.filter = {
  equal: equalFilter,
  range: rangeFilter,
  geoWithin: geoWithinFilter,
  geoContains: geoContainsFilter
}

function GeoJSON (strval) {
  if (this instanceof GeoJSON) {
    this.str = strval
  } else {
    return new GeoJSON(strval)
  }
}
aerospike.GeoJSON = GeoJSON

function parseHostsString(str) {
    if (!str || !/^([a-z0-9-_\.]+(:\d+)?,?)+$/i.test(str)) {
        throw new Error("Invalid aerospike connection string: " + str);
    }

    return str
            .split(',')
            .filter(function (x) {return !!x})
            .map(function (host) {
                var temp = host.split(':');
                return {
                    addr: temp[0] || 'localhost',
                    port: parseInt(temp[1]) || 3000
                }
            });
}

module.exports = aerospike
