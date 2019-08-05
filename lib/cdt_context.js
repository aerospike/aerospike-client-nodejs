// *****************************************************************************
// Copyright 2019 Aerospike, Inc.
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

const LIST_INDEX = 0x10
const LIST_RANK = 0x11
const LIST_VALUE = 0x13
const MAP_INDEX = 0x20
const MAP_RANK = 0x21
const MAP_KEY = 0x22
const MAP_VALUE = 0x23

class CdtContext {
  constructor () {
    this.items = []
  }

  addListIndex (index) {
    return this.add(LIST_INDEX, index)
  }

  addListRank (rank) {
    return this.add(LIST_RANK, rank)
  }

  addListValue (value) {
    return this.add(LIST_VALUE, value)
  }

  addMapIndex (index) {
    return this.add(MAP_INDEX, index)
  }

  addMapRank (rank) {
    return this.add(MAP_RANK, rank)
  }

  addMapKey (key) {
    return this.add(MAP_KEY, key)
  }

  addMapValue (value) {
    return this.add(MAP_VALUE, value)
  }

  /** @private **/
  add (type, value) {
    this.items.push([type, value])
    return this
  }
}

module.exports = CdtContext
