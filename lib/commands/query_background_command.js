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

const Job = require('../job')
const Command = require('./command')

function notEmpty (value) {
  return Array.isArray(value) && value.length > 0
}

function hasFilter (queryOrScan) {
  return notEmpty(queryOrScan.filters)
}

function moduleName (queryOrScan) {
  return hasFilter(queryOrScan) ? 'query' : 'scan'
}

// This command is used for both background queries and background scans, including
// scans/queries that execute record UDFs, or one or more (write-only) operations.
module.exports = asCommand => class QueryBackgroundBaseCommand extends Command(asCommand) {
  constructor (client, ns, set, queryObj, policy, queryID, callback) {
    queryID = queryID || Job.safeRandomJobID()
    const args = [ns, set, queryObj, policy, queryID]
    super(client, args, callback)

    this.client = client
    this.queryID = queryID
    this.queryObj = queryObj
  }

  convertResult () {
    return new Job(this.client, this.queryID, moduleName(this.queryObj))
  }
}
