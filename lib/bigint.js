// *****************************************************************************
// Copyright 2013-2020 Aerospike, Inc.
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

// keep eslint happy
const BigInt = global.BigInt || (() => {})
const MIN_INT64 = BigInt(-2) ** BigInt(63)
const MAX_INT64 = BigInt(2) ** BigInt(63) - BigInt(1)

exports.BigInt = global.BigInt ||
  (() => { throw new Error('BigInt not supported on this version of Node.js') })
exports.bigIntSupported = !!global.BigInt

exports.isInt64 = function (value) {
  return MIN_INT64 <= BigInt(value) && BigInt(value) <= MAX_INT64
}
