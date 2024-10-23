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

import pThrottle from 'p-throttle';


import Aerospike, {ConfigOptions, Host, AerospikeRecord} from 'aerospike';


const Record = Aerospike.Record
import * as helper from '../test_helper';

function createRecords (putCall: any, generator: any, recordsToCreate: any, maxConcurrent: any, callback: any) {
  let currentRecordNo = 0
  let inFlight = 0

  const creator = function (this: any, record: any, err: any) {
    if (err) {
      console.error('ERROR: %s [%d] in %s at %s:%d\n%s', err.message, err.code, err.func, err.file, err.line, err.stack)
      throw err
    }
    if (record) {
      if(typeof callback === 'function'){
        callback(record)

      }
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
      if(typeof callback === 'function'){

        callback(null)
      }
    }
  }

  for (let i = 0; i < Math.min(maxConcurrent, recordsToCreate); i++) {
    creator(null, null)
  }
}

export function put (n: any, options: any, callback?: any): any {
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

  let putCall: any = helper.client.put.bind(helper.client)
  if (options.throttle) {
    const { limit, interval } = options.throttle
    putCall = pThrottle(putCall, limit, interval)
  }

  if (callback) {
    createRecords(putCall, generator, n, 200, callback)
  } else {
    return new Promise((resolve, reject) => {
      const records: AerospikeRecord[] = []
      createRecords(putCall, generator, n, 200, (record: any) => {
        if (record) {
          records.push(record)
        } else {
          resolve(records)
        }
      })
    })
  }
}
