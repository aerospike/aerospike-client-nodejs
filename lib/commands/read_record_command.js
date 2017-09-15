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
const Record = require('../record')

class ReadRecordCommand extends Command {
  constructor (client, name, args, callback) {
    super(client, name, args, callback)
    this.key = args[0]
  }

  convertResult (bins, metadata) {
    return new Record(this.key, bins, metadata)
  }
}

module.exports = ReadRecordCommand
