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

const pThrottle = require('p-throttle')

const Aerospike = require('../../lib/aerospike')
const Record = require('../../lib/record')
const helper = require('../test_helper')

function createRecords (putCall, generator, recordsToCreate, maxConcurrent, callback) {
  let currentRecordNo = 0
  let inFlight = 0

  const creator = function (record, err) {
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
      const putCb = creator.bind(this, record)
      const policy = generator.policy()
      const meta = { ttl: record.ttl, gen: record.gen }
      putCall(record.key, record.bins, meta, policy, putCb)
      inFlight++
    } else if (currentRecordNo > recordsToCreate && inFlight === 0) {
      callback(null)
    }
  }

  for (let i = 0; i < Math.min(maxConcurrent, recordsToCreate); i++) {
    creator(null, null)
  }
}

function put (n, options, callback) {
  const policy = options.policy || new Aerospike.WritePolicy({
    totalTimeout: 1000,
    exists: Aerospike.policy.exists.CREATE_OR_REPLACE
  })

  const generator = {
    key: options.keygen,
    bins: options.recgen,
    metadata: options.metagen,
    policy: function () { return policy }
  }

  let putCall = helper.client.put.bind(helper.client)
  if (options.throttle) {
    const { limit, interval } = options.throttle
    putCall = pThrottle(putCall, limit, interval)
  }

  if (callback) {
    createRecords(putCall, generator, n, 200, callback)
  } else {
    return new Promise((resolve, reject) => {
      const records = []
      createRecords(putCall, generator, n, 200, record => {
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
  put
}
