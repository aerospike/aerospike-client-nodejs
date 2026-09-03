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
import type { AerospikeBins, AerospikeRecord, KeyOptions } from '../lib/aerospike.js'
import { expect } from 'chai'
import * as helper from './test_helper.ts'

const bits = Aerospike.bitwise
const strings = Aerospike.strings
const status = Aerospike.status

describe('bitwise.b64Encode()', function () {
  const client = helper.client
  const keygen = helper.keygen

  helper.skipUnlessVersion('>= 8.1.3', this)

  let b64EncodeSupported = false

  before(async function () {
    const key = keygen.string(helper.namespace, helper.set, { prefix: 'test/bitwise_b64_probe' })()
    await client.put(key, { blob: Buffer.from([1, 1, 1, 1, 1]) })
    try {
      await client.operate(key, [bits.b64Encode('blob')])
      b64EncodeSupported = true
    } catch (error: any) {
      if (error.code !== status.ERR_REQUEST_INVALID) {
        throw error
      }
    }
  })

  helper.skipUnless(this, () => b64EncodeSupported, 'bit b64Encode requires 8.1.3.0-105+')

  async function putKey (bins: AerospikeBins): Promise<KeyOptions> {
    const key = keygen.string(helper.namespace, helper.set, { prefix: 'test/bitwise_b64' })()
    await client.put(key, bins)
    return key
  }

  it('encodes the whole blob as base64', async function () {
    const blob = Buffer.from([1, 1, 1, 1, 1])
    const key = await putKey({ blob })
    const result: AerospikeRecord = await client.operate(key, [bits.b64Encode('blob')])
    expect(result.bins.blob).to.eql(blob.toString('base64'))
  })

  it('encodes from a byte offset through the end', async function () {
    const blob = Buffer.from([1, 1, 1, 1, 1])
    const key = await putKey({ blob })
    const result: AerospikeRecord = await client.operate(key, [
      bits.b64EncodeFrom('blob', 1)
    ])
    expect(result.bins.blob).to.eql(Buffer.from([1, 1, 1, 1]).toString('base64'))
  })

  it('b64Encode(bin, offset) matches b64EncodeFrom', async function () {
    const blob = Buffer.from([1, 1, 1, 1, 1])
    const key = await putKey({ blob })
    const result: AerospikeRecord = await client.operate(key, [
      bits.b64Encode('blob', 1)
    ])
    expect(result.bins.blob).to.eql(Buffer.from([1, 1, 1, 1]).toString('base64'))
  })

  it('encodes a byte range', async function () {
    const blob = Buffer.from([1, 1, 1, 1, 1])
    const key = await putKey({ blob })
    const result: AerospikeRecord = await client.operate(key, [
      bits.b64EncodeRange('blob', 1, 2)
    ])
    expect(result.bins.blob).to.eql(Buffer.from([1, 1]).toString('base64'))
  })

  it('b64Encode(bin, offset, size) matches b64EncodeRange', async function () {
    const blob = Buffer.from([1, 1, 1, 1, 1])
    const key = await putKey({ blob })
    const result: AerospikeRecord = await client.operate(key, [
      bits.b64Encode('blob', 1, 2)
    ])
    expect(result.bins.blob).to.eql(Buffer.from([1, 1]).toString('base64'))
  })

  it('counts size back from the end when invertSize is true', async function () {
    const blob = Buffer.from([0x01, 0x42, 0x03, 0x04, 0x05])
    const key = await putKey({ blob })
    const result: AerospikeRecord = await client.operate(key, [
      bits.b64EncodeRange('blob', 1, 1, true)
    ])
    expect(result.bins.blob).to.eql(Buffer.from([0x42, 0x03, 0x04]).toString('base64'))
  })

  it('invertSize with size 0 encodes from offset to end', async function () {
    const blob = Buffer.from([0x01, 0x42, 0x03, 0x04, 0x05])
    const key = await putKey({ blob })
    const result: AerospikeRecord = await client.operate(key, [
      bits.b64EncodeRange('blob', 1, 0, true)
    ])
    expect(result.bins.blob).to.eql(Buffer.from([0x42, 0x03, 0x04, 0x05]).toString('base64'))
  })

  it('supports a negative byte offset', async function () {
    const blob = Buffer.from([1, 2, 3, 4, 5])
    const key = await putKey({ blob })
    const result: AerospikeRecord = await client.operate(key, [
      bits.b64EncodeFrom('blob', -2)
    ])
    expect(result.bins.blob).to.eql(Buffer.from([4, 5]).toString('base64'))
  })

  it('is the inverse of strings.b64Decode', async function () {
    const blob = Buffer.from([0xde, 0xad, 0xbe, 0xef])
    const key = await putKey({ blob })
    const encoded: AerospikeRecord = await client.operate(key, [bits.b64Encode('blob')])
    const text = encoded.bins.blob as string
    const strKey = await putKey({ s: text })
    const decoded: AerospikeRecord = await client.operate(strKey, [
      strings.b64Decode('s')
    ])
    expect(Buffer.from(decoded.bins.s as Buffer)).to.eql(blob)
  })
})
