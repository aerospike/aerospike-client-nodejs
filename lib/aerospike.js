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
const execute = function execute () {
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

const Info = function info (scanId, callback) {
  var self = this
  self.queryInfo(scanId, callback)
}

const query = function query (ns, set, options) {
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

const createIntegerIndex = function createIntegerIndex (options, callback) {
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

const createStringIndex = function createStringIndex (options, callback) {
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

const createGeo2DSphereIndex = function createGeo2DSphereIndex (options, callback) {
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

const parseOperateArgs = function parseOperateArgs (args) {
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

const add = function add (key, bins, metadata, policy, callback) {
  var options = parseOperateArgs(arguments)
  // populate ops from bins argument here
  var ops = []
  var prop

  for (prop in bins) {
    ops.push(aerospike.operator.incr(prop, bins[prop]))
  }
  this.operate(key, ops, options.metadata, options.policy, options.callback)
}

const append = function append (key, bins, metadata, policy, callback) {
  var options = parseOperateArgs(arguments)
  // populate ops from bins argument here
  var ops = []
  var prop

  for (prop in bins) {
    ops.push(aerospike.operator.append(prop, bins[prop]))
  }
  this.operate(key, ops, options.metadata, options.policy, options.callback)
}

const prepend = function prepend (key, bins, metadata, policy, callback) {
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

function Aerospike () {
  this.key = as.key,
  this.status = as.status,
  this.status_ok = this.status.AEROSPIKE_OK,
  this.policy = as.policy,
  this.language = as.language,
  this.log = as.log,
  this.scanPriority = as.scanPriority,
  this.predicates = as.predicates,
  this.indexType = as.indexType,
  this.scanStatus = as.scanStatus,
  this.Double = as.Double

  this._currentClient = {}
  this.proto = {}
}

Aerospike.prototype._client = function client (config) {
  let client = as.client(config)
  if (client === null) {
    throw new Error('Client object creation failed - null value returned')
  }

  this.proto = Object.getPrototypeOf(client)

  // TODO: implement subclases
  // if (!proto.createQuery) {
  //   proto.createQuery = proto.query
  //   proto.query = query
  // }

  // if (!proto.createIntegerIndex) {
  //   proto.createIntegerIndex = createIntegerIndex
  // }
  //
  // if (!proto.createStringIndex) {
  //   proto.createStringIndex = createStringIndex
  // }
  //
  // if (!proto.createGeo2DSphereIndex) {
  //   proto.createGeo2DSphereIndex = createGeo2DSphereIndex
  // }
  //
  // if (!proto.LargeList) {
  //   proto.LargeList = LargeList
  // }
  //
  // if (!proto.add) {
  //   proto.add = add
  // }
  //
  // if (!proto.append) {
  //   proto.append = append
  // }
  //
  // if (!proto.prepend) {
  //   proto.prepend = prepend
  // }

  return client
}

Aerospike.prototype.connect = function connect (config, cb) {
  const status_ok = this.status_ok
  this._currentClient = this._client(config)

  this._currentClient.connect(function connectCb (er) {
    if (er.code != status_ok) {
      return cb(er)
    }

    return cb(null)
  })
}

// Aerospike.prototype.put = function put (key, bins, metadata, cb) {
//   const status_ok = this.status_ok
//   this._currentClient.put(key, bins, metadata, function putCb(er, key) {
//     if (er != status_ok) {
//       return cb(er)
//     }
//     // pass codes as status anyhow to userland
//     // This will probably not be useful for most node devs, but
//     // having compat in mind
//     return cb(null, key, er.code)
//   })
// }
//
// Aerospike.prototype.get = function get (key, cb) {
//   const status_ok = this.status_ok
//   this._currentClient.get(key, bins, metadata, function getCb(er, rec, meta) {
//     if (er != status_ok) {
//       return cb(er)
//     }
//     // er.code: compat
//     return cb(null, rec, meta, er.code)
//   })
// }

Aerospike.prototype.add = function add (key, bins, metadata, policy, cb) {
  const status_ok = this.status_ok
  this._currentClient.add(key, bins, metadata, policy, function addCb (er, record, metadata, key) {

    if (er.code != status_ok) {
      return cb(er)
    }

    return cb(null, null)
  })
}

Aerospike.prototype.append = function append (key, bins, metadata, policy, cb) {
  const status_ok = this.status_ok
  this._currentClient.append(key, bins, metadata, policy, function appendCb (er, record, metadata, key) {

    if (er.code != status_ok) {
      return cb(er)
    }

    return cb(null, null)
  })
}

Aerospike.prototype.batchExists = function batchExists (keys, policy, cb) {
  const status_ok = this.status_ok
  if (typeof policy === 'function') cb = policy
  
  this._currentClient.batchExists(keys, policy, function batchExistsCb (er, results) {

    if (er.code != status_ok) {
      return cb(er)
    }
    // return er as status
    return cb(null, results, er)
  })
}

Aerospike.prototype.batchGet = function batchGet (keys, policy, cb) {
  const status_ok = this.status_ok
  this._currentClient.batchGet(keys, policy, function batchGetCb (er, results) {

    if (er.code != status_ok) {
      return cb(er)
    }

    return cb(null, null)
  })
}

Aerospike.prototype.batchSelect = function batchSelect (keys, policy, cb) {
  const status_ok = this.status_ok
  this._currentClient.batchSelect(keys, policy, function batchSelectCb (er, results) {

    if (er.code != status_ok) {
      return cb(er)
    }

    return cb(null, null)
  })
}

Aerospike.prototype.close = function close () {
  return this._currentClient.close()
}


Aerospike.prototype.createIntegerIndex = function createIntegerIndex (args, cb) {
  const status_ok = this.status_ok
  this._currentClient.createIntegerIndex(args, function createIntegerIndexCb (er) {

    if (er.code != status_ok) {
      return cb(er)
    }

    return cb(null, null)
  })
}

Aerospike.prototype.createStringIndex = function createStringIndex (args, cb) {
  const status_ok = this.status_ok
  this._currentClient.createStringIndex(args, function createStringIndexCb (er) {

    if (er.code != status_ok) {
      return cb(er)
    }

    return cb(null, null)
  })
}

Aerospike.prototype.createGeo2DSphereIndex = function createGeo2DSphereIndex (args, cb) {
  const status_ok = this.status_ok
  this._currentClient.createGeo2DSphereIndex(args, function createGeo2DSphereIndexCb (er) {

    if (er.code != status_ok) {
      return cb(er)
    }

    return cb(null, null)
  })
}

Aerospike.prototype.execute = function execute (key, udfArgs, policy, cb) {
  const status_ok = this.status_ok
  this._currentClient.execute(key, udfArgs, policy, function executeCb (er, res, key) {

    if (er.code != status_ok) {
      return cb(er)
    }

    return cb(null, null)
  })
}

Aerospike.prototype.exists = function exists (key, policy, cb) {
  const status_ok = this.status_ok
  this._currentClient.exists(key, policy, function existsCb (er, metadata, key) {

    if (er.code != status_ok) {
      return cb(er)
    }

    return cb(null, null)
  })
}

Aerospike.prototype.get = function get (key, policy, cb) {
  const status_ok = this.status_ok

  if (typeof policy === 'function') cb = policy

  this._currentClient.get(key, policy, function getCb (er, record, metadata, key) {
    if (er.code != status_ok) {
      return cb(er)
    }
    // return er as status
    return cb(null, record, metadata, key, er)
  })
}

Aerospike.prototype.info = function info (request, host, policy, cb) {
  const status_ok = this.status_ok
  this._currentClient.info(request, host, policy, function infoCb (er, response, host) {

    if (er.code != status_ok) {
      return cb(er)
    }

    return cb(null, null)
  })
}

Aerospike.prototype.indexCreateWait = function indexCreateWait (namespace, index, pollInterval, cb) {
  const status_ok = this.status_ok
  this._currentClient.indexCreateWait(namespace, index, pollInterval, function indexCreateWaitCb (er) {

    if (er.code != status_ok) {
      return cb(er)
    }

    return cb(null, null)
  })
}

Aerospike.prototype.indexRemove = function indexRemove (namespace, index, policy, cb) {
  const status_ok = this.status_ok
  this._currentClient.indexRemove(namespace, index, policy, function indexRemoveCb (er) {

    if (er.code != status_ok) {
      return cb(er)
    }

    return cb(null, null)
  })
}

// TODO: LargeList
// Aerospike.prototype.LargeList = function LargeList (, cb) {
//   this._currentClient.LargeList(, function LargeListCb () {
//
//     if (er.code != status_ok) {
//       return cb(er)
//     }
//
//     return cb(null, null)
//   })
// }

Aerospike.prototype.operate = function operate (key, operations, metadata, policy, cb) {
  const status_ok = this.status_ok
  this._currentClient.operate(key, operations, metadata, policy, function operateCb (er, record, metadata, key) {

    if (er.code != status_ok) {
      return cb(er)
    }

    return cb(null, null)
  })
}

Aerospike.prototype.prepend = function prepend (key, bins, metadata, policy, cb) {
  const status_ok = this.status_ok
  this._currentClient.prepend(key, bins, metadata, policy, function prependCb (er, record, metadata, key) {

    if (er.code != status_ok) {
      return cb(er)
    }

    return cb(null, null)
  })
}

Aerospike.prototype.put = function put (key, record, metadata, policy, cb) {
  const status_ok = this.status_ok

  if (typeof policy === 'function') cb = policy

  this._currentClient.put(key, record, metadata, policy, function putCb (er, key) {

    if (er.code != status_ok) {
      return cb(er)
    }
    // return er as status
    return cb(null, key, er)
  })
}

// TODO: QueryClass
// Aerospike.prototype.query = function query (, cb) {
//   this._currentClient.query(, function queryCb () {
//
//     if (er.code != status_ok) {
//       return cb(er)
//     }
//
//     return cb(null, null)
//   })
// }

Aerospike.prototype.remove = function remove (key, policy, cb) {
  const status_ok = this.status_ok
  if (typeof policy === 'function') cb = policy

  this._currentClient.remove(key, policy, function removeCb (er, key) {
    if (er.code != status_ok) {
      return cb(er)
    }
    // return er as status
    return cb(null, key, er)
  })
}

Aerospike.prototype.select = function select (key, bins, policy, cb) {
  const status_ok = this.status_ok
  if (typeof policy === 'function') cb = policy

  this._currentClient.select(key, bins, policy, function selectCb (er, record, metadata, key) {

    if (er.code != status_ok) {
      return cb(er)
    }
    // return er as status
    return cb(null, record, metadata, key, er)
  })
}

Aerospike.prototype.udfRegister = function udfRegister (udfModule, policy, cb) {
  const status_ok = this.status_ok
  this._currentClient.udfRegister(udfModule, policy, function udfRegisterCb (er) {

    if (er.code != status_ok) {
      return cb(er)
    }

    return cb(null, null)
  })
}

Aerospike.prototype.udfRegisterWait = function udfRegisterWait (udfFilename, pollInterval, policy, cb) {
  const status_ok = this.status_ok
  this._currentClient.udfRegisterWait(udfFilename, pollInterval, policy, function udfRegisterWaitCb (er) {

    if (er.code != status_ok) {
      return cb(er)
    }

    return cb(null, null)
  })
}

Aerospike.prototype.udfRemove = function udfRemove (udfModule, policy, cb) {
  const status_ok = this.status_ok
  this._currentClient.udfRemove(udfModule, policy, function udfRemoveCb () {

    if (er.code != status_ok) {
      return cb(er)
    }

    return cb(null, null)
  })
}

Aerospike.prototype.updateLogging = function updateLogging (logConfig) {
  return this._currentClient.updateLogging(logConfig)
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

Aerospike.prototype.operator = {
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

Aerospike.prototype.filter = {
  equal: equalFilter,
  range: rangeFilter,
  geoWithin: geoWithinFilter,
  geoContains: geoContainsFilter
}


Aerospike.prototype.GeoJSON = function GeoJSON (strval) {
  if (this instanceof GeoJSON) {
    this.str = strval
  } else {
    return new GeoJSON(strval)
  }
}

module.exports = new Aerospike()
