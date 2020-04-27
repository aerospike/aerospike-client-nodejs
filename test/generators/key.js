// *****************************************************************************
// Copyright 2013-2017 Aerospike, Inc.
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

var Key = require('../../lib/key')
var valgen = require('./value')

//
// Returns a generator for bytes keys.
//
function bytes (namespace, set, options) {
  var bgen = valgen.bytes(options)
  return function () {
    return new Key(namespace, set, bgen())
  }
}

//
// Returns a generator for string keys.
//
function string (namespace, set, options) {
  var sgen = valgen.string(options)
  return function () {
    return new Key(namespace, set, sgen())
  }
}

//
// Returns a generator for integer keys.
//
function integer (namespace, set, options) {
  var igen = valgen.integer(options)
  return function () {
    return new Key(namespace, set, igen())
  }
}

function range (keygen, end, start) {
  start = start || 0
  end = end || start + 1
  var a = []
  for (var i = 0; i < end; i++) {
    a.push(keygen())
  }
  return a
}

module.exports = {
  bytes,
  integer,
  string,
  range
}
