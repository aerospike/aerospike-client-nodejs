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

const Command = require('./command')
const AerospikeError = require('../error')

class InfoResponse {
  constructor (host, info, error) {
    this.host = host
    this.info = info
    this.error = error
  }
}

class InfoAllCommand extends Command {
  constructor (client, name, args, callback) {
    super(client, name, args, callback)
    this.error = null
    this.info = []
    let infoCb = this.processInfo.bind(this) // per-host info response
    this.args = this.args.concat([infoCb])
  }

  convertResult () {
    return this.info
  }

  processInfo (err, response, host) {
    let error = AerospikeError.fromASError(err)
    this.error = this.error || error
    this.info.push(new InfoResponse(host, response, error))
  }
}

module.exports = InfoAllCommand
