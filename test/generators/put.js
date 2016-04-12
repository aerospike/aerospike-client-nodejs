// *****************************************************************************
// Copyright 2013-2016 Aerospike, Inc.
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

const Aerospike = require('../../lib/aerospike')
const helper = require('../test_helper')

function createRecords (client, generator, recordsToCreate, maxConcurrent, callback) {
  var currentRecordNo = 0
  var inFlight = 0

  var creator = function (record, err) {
    if (err) throw err
    if (record) {
      callback(record.key, record. bins, record.meta)
      inFlight--
    }
    currentRecordNo++
    if (currentRecordNo <= recordsToCreate && inFlight < maxConcurrent) {
      record = {
        key: generator.key(),
        bins: generator.record(),
        meta: generator.metadata()
      }
      var putCb = creator.bind(this, record)
      var policy = generator.policy()
      client.put(record.key, record.bins, record.meta, policy, putCb)
      inFlight++
    } else if (currentRecordNo > recordsToCreate && inFlight === 0) {
      callback(null)
    }
  }

  for (var i = 0; i < Math.min(maxConcurrent, recordsToCreate); i++) {
    creator(null, null)
  }
}

function put (n, keygen, recgen, metagen, callback) {
  var policy = { exists: Aerospike.policy.exists.CREATE_OR_REPLACE }
  var generator = {
    key: keygen,
    record: recgen,
    metadata: metagen,
    policy: function () { return policy }
  }
  createRecords(helper.client, generator, n, 200, callback)
}

module.exports = {
  put: put
}
