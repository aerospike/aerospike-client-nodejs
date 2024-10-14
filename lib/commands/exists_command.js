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

const status = require('../status')
const Command = require('./command')
const Record = require('../record')

module.exports = asCommand => class ExistsCommand extends Command(asCommand) {
  constructor (client, key, args, callback) {
    if (key) {
      args = [key].concat(args)
    }
    super(client, args, callback)
    this.key = key
  }

  convertResponse (error, bins, metadata) {
    error = this.convertError(error)
    if (error && error.code === status.ERR_RECORD_NOT_FOUND) {
      if (this.key) {
        return [null, this.convertResult({ ttl: null, gen: null })]
      }
      return [null, false]
    } else if (error) {
      return [error, null]
    } else {
      if (this.key) {
        return [null, this.convertResult(metadata)]
      }
      return [null, true]
    }
  }

  convertResult (metadata) {
    return new Record(this.key, null, metadata)
  }
}
