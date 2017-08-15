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

const Aerospike = require('../../lib/aerospike')
const Record = require('../../lib/record')
const helper = require('../test_helper')

function createRecords (client, generator, recordsToCreate, maxConcurrent, callback) {
  var currentRecordNo = 0
  var inFlight = 0

  var creator = function (record, err) {
    if (err) {
      console.error('ERROR: %s [%d] in %s at %s:%d\n%s', err.message, err.code, err.func, err.file, err.line, err.stack)
      throw err
    }
    if (record) {
      callback(record)
      inFlight--
    }
    currentRecordNo++
    if (currentRecordNo <= recordsToCreate && inFlight < maxConcurrent) {
      record = new Record(generator.key(), generator.bins(), generator.metadata())
      let putCb = creator.bind(this, record)
      let policy = generator.policy()
      let meta = { ttl: record.ttl, gen: record.gen }
      client.put(record.key, record.bins, meta, policy, putCb)
      inFlight++
    } else if (currentRecordNo > recordsToCreate && inFlight === 0) {
      callback(null)
    }
  }

  for (var i = 0; i < Math.min(maxConcurrent, recordsToCreate); i++) {
    creator(null, null)
  }
}

function put (n, keygen, recgen, metagen, policy, callback) {
  if (typeof policy === 'function') {
    callback = policy
    policy = null
  }
  policy = policy || { exists: Aerospike.policy.exists.CREATE_OR_REPLACE, timeout: 1000 }
  var generator = {
    key: keygen,
    bins: recgen,
    metadata: metagen,
    policy: function () { return policy }
  }
  if (callback) {
    createRecords(helper.client, generator, n, 200, callback)
  } else {
    return new Promise((resolve, reject) => {
      let records = []
      createRecords(helper.client, generator, n, 200, record => {
        if (record) {
          records.push(record)
        } else {
          resolve(records)
        }
      })
    })
  }
}

module.exports = {
  put: put
}
