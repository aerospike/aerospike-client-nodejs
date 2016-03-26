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
const operations = as.operations
const cdt_operations = as.cdt_operations

function populateOp (op, bin, props) {
  var obj = {}
  obj.operation = op
  obj.bin = bin
  for (var prop in props) {
    obj[prop] = props[prop]
  }
  return obj
}

function populateCdtOp (op, bin, props) {
  var obj = {}
  obj.cdtOperation = op
  obj.bin = bin
  for (var prop in props) {
    obj[prop] = props[prop]
  }
  return obj
}

module.exports = {
  read: function read (bin) {
    return populateOp(operations.READ, bin)
  },
  write: function write (bin, value) {
    return populateOp(operations.WRITE, bin, {value: value})
  },
  incr: function incr (bin, value) {
    return populateOp(operations.INCR, bin, {value: value})
  },
  append: function append (bin, value) {
    return populateOp(operations.APPEND, bin, {value: value})
  },
  prepend: function prepend (bin, value) {
    return populateOp(operations.PREPEND, bin, {value: value})
  },
  touch: function touch (bin, ttl) {
    return populateOp(operations.TOUCH, bin, {ttl: ttl})
  },
  listAppend: function listAppend (bin, value) {
    return populateCdtOp(cdt_operations.LIST_APPEND, bin, {value: value})
  },
  listAppendItems: function listAppendItems (bin, list) {
    return populateCdtOp(cdt_operations.LIST_APPEND_ITEMS, bin,
      {list: list})
  },
  listInsert: function listInsert (bin, index, value) {
    return populateCdtOp(cdt_operations.LIST_INSERT, bin,
      {index: index, value: value})
  },
  listInsertItems: function listInsertItems (bin, index, list) {
    return populateCdtOp(cdt_operations.LIST_INSERT_ITEMS, bin,
      {index: index, list: list})
  },
  listPop: function listPop (bin, index) {
    return populateCdtOp(cdt_operations.LIST_POP, bin, {index: index})
  },
  listPopRange: function listPopRange (bin, index, count) {
    return populateCdtOp(cdt_operations.LIST_POP_RANGE, bin,
      {index: index, count: count})
  },
  listRemove: function listRemove (bin, index) {
    return populateCdtOp(cdt_operations.LIST_REMOVE, bin, {index: index})
  },
  listRemoveRange: function listRemoveRange (bin, index, count) {
    return populateCdtOp(cdt_operations.LIST_REMOVE_RANGE, bin,
      {index: index, count: count})
  },
  listClear: function listClear (bin) {
    return populateCdtOp(cdt_operations.LIST_CLEAR, bin)
  },
  listSet: function listSet (bin, index, value) {
    return populateCdtOp(cdt_operations.LIST_SET, bin,
      {index: index, value: value})
  },
  listTrim: function listTrim (bin, index, count) {
    return populateCdtOp(cdt_operations.LIST_TRIM, bin,
      {index: index, count: count})
  },
  listGet: function listGet (bin, index) {
    return populateCdtOp(cdt_operations.LIST_GET, bin, {index: index})
  },
  listGetRange: function listGetRange (bin, index, count) {
    return populateCdtOp(cdt_operations.LIST_GET_RANGE, bin,
      {index: index, count: count})
  },
  listSize: function listSize (bin) {
    return populateCdtOp(cdt_operations.LIST_SIZE, bin)
  }
}
