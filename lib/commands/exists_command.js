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

const as = require('../../build/Release/aerospike.node')
const Command = require('./command')

class ExistsCommand extends Command {
  convertResponse (error) {
    error = this.convertError(error)
    if (error && error.code === as.status.AEROSPIKE_ERR_RECORD_NOT_FOUND) {
      return [null, false]
    } else if (error) {
      return [error, null]
    } else {
      return [null, true]
    }
  }
}

module.exports = ExistsCommand
