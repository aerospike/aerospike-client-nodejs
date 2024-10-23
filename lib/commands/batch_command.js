// *****************************************************************************
// Copyright 2013-2024 Aerospike, Inc.
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

const Command = require('./command')
const Record = require('../record')

class BatchResult {
  constructor (status, record, inDoubt) {
    this.status = status
    this.record = record
    this.inDoubt = inDoubt
  }
}

module.exports = asCommand => class BatchCommand extends Command(asCommand) {
  convertResult (results) {
    if (!results) return []

    return results.map(result => {
      const record = new Record(result.key, result.bins, result.meta)
      return new BatchResult(result.status, record, result.inDoubt)
    })
  }
}
