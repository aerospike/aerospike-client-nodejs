// *****************************************************************************
// Copyright 2013-2019 Aerospike, Inc.
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

/* eslint-env mocha */

const Aerospike = require('../lib/aerospike')
const helper = require('./test_helper')
const { sleep } = helper.util

const setgen = helper.valgen.string({
  prefix: 'test/trunc/',
  random: true,
  length: { min: 6, max: 6 }
})
const keygen = helper.keygen
const metagen = helper.metagen
const recgen = helper.recgen
const putgen = helper.putgen

describe('client.truncate() #slow', function () {
  helper.skipUnlessVersion('>= 3.12.0', this)

  const client = helper.client

  // Generates a number of records; the callback function is called with a list
  // of the record keys.
  function genRecords (kgen, noRecords, done) {
    const generators = {
      keygen: kgen,
      recgen: recgen.constant({ a: 'foo', b: 'bar' }),
      metagen: metagen.constant({ ttl: 300 })
    }
    return putgen.put(noRecords, generators)
  }

  // Checks to verify that records that are supposed to have been truncated
  // are gone and that records that are supposed to remain still exist. If some
  // truncated records still exist it will try again every pollInt ms.
  async function checkRecords (truncated, remaining, pollInt) {
    const results = await client.batchRead(truncated.concat(remaining))
    for (const result of results) {
      const expectExist = !!remaining.find(record => record.key.equals(result.record.key))
      switch (result.status) {
        case Aerospike.status.OK:
          if (!expectExist) {
            await sleep(pollInt)
            return checkRecords(truncated, remaining, pollInt)
          }
          break
        case Aerospike.status.ERR_RECORD_NOT_FOUND:
          if (expectExist) throw new Error("Truncate removed record it wasn't supposed to: " + result.record.key)
          break
        default:
          throw new Error('Unexpected batchRead status code: ' + result.status)
      }
    }
  }

  it('deletes all records in the set', async function () {
    const ns = helper.namespace
    const set = setgen()
    const noRecords = 5
    const pollIntMs = 10 // Poll interval in ms to check whether records have been removed

    const kgen = keygen.string(ns, set, { prefix: 'test/trunc/', random: false })
    const records = await genRecords(kgen, noRecords)
    await sleep(5)
    await client.truncate(ns, set, 0)
    await checkRecords(records, [], pollIntMs)
  })

  it('deletes all records with an older update timestamp', async function () {
    this.timeout(15000)
    const ns = helper.namespace
    const set = setgen()
    const noRecordsToDelete = 5
    const noRecordsToRemain = 2
    const pollIntMs = 100 // Poll interval in ms to check whether records have been removed
    const allowanceMs = 5000 // Test will fail if client and server clocks differ by more than this many ms!

    let kgen = keygen.string(ns, set, { prefix: 'test/trunc/del/', random: false })
    const batchToDelete = await genRecords(kgen, noRecordsToDelete)
    await sleep(allowanceMs)
    const timeNanos = Date.now() * 1000000
    await sleep(allowanceMs)
    kgen = keygen.string(ns, set, { prefix: 'test/trunc/rem/', random: false })
    const batchToRemain = await genRecords(kgen, noRecordsToRemain)
    await sleep(5)
    await client.truncate(ns, set, timeNanos)
    await checkRecords(batchToDelete, batchToRemain, pollIntMs)
  })
})
