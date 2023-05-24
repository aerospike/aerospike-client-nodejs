// *****************************************************************************
// Copyright 2013-2023 Aerospike, Inc.
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
const Key = require('../key')
const Record = require('../record')

module.exports = asCommand => class StreamCommand extends Command(asCommand) {
  constructor (stream, args) {
    super(stream.client, args)
    this.stream = stream
  }

  callback (error, record) {
    if (error) {
      this.stream.emit('error', error)
    } else if ('state' in record) {
      this.stream.emit('end', record.state)
    } else {
      this.stream.emit('data', record)
    }
    return !this.stream.aborted
  }

  convertResult (bins, meta, asKey) {
    if (!bins) return { state: meta }
    const key = Key.fromASKey(asKey)
    return new Record(key, bins, meta)
  }
}
