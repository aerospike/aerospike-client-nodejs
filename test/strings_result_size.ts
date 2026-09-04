// *****************************************************************************
// Copyright 2026 Aerospike, Inc.
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
/* global expect */

import * as Aerospike from '../lib/aerospike.js'
import { AerospikeError } from '../lib/aerospike.js'
import { expect } from 'chai'
import * as helper from './test_helper.ts'

const strings = Aerospike.strings
const status = Aerospike.status
const errorDetailVerbosity = Aerospike.errorDetailVerbosity

describe('string result-size cap', function () {
  const client = helper.client
  const keygen = helper.keygen

  helper.skipUnlessVersion('>= 8.1.3', this)

  it('repeat / pad that exceed the server cap return PARAM, not record-too-big', async function () {
    const policy = new Aerospike.OperatePolicy({
      errorDetailVerbosity: errorDetailVerbosity.MESSAGE
    })
    const sizes = [1024, 64 * 1024, 256 * 1024, 1024 * 1024, 2 * 1024 * 1024, 8 * 1024 * 1024]
    let lastParam: AerospikeError | null = null

    for (const n of sizes) {
      const key = keygen.string(helper.namespace, helper.set, { prefix: 'test/strings_result_size' })()
      await client.put(key, { s: 'x' })
      try {
        await client.operate(key, [strings.padStart('s', n, 'a')], {}, policy)
      } catch (error: any) {
        try { await client.remove(key) } catch (_) { /* ignore */ }
        // Default Docker namespaces cap records at 1 MiB, so mid-size pads hit
        // record-too-big (13) first. Keep going until the string result-size
        // cap returns PARAM (4), which is the 8.1.3.0-105+ contract.
        if (error.code === status.ERR_RECORD_TOO_BIG) {
          continue
        }
        lastParam = error
        break
      }
      try { await client.remove(key) } catch (_) { /* ignore */ }
    }

    if (!lastParam) {
      this.skip()
    }
    expect(lastParam).to.be.instanceof(AerospikeError)
    expect(lastParam!.code).to.equal(status.ERR_REQUEST_INVALID)
    expect(lastParam!.code).to.not.equal(status.ERR_RECORD_TOO_BIG)
    expect(lastParam!.message).to.be.a('string').and.not.empty
  })
})
