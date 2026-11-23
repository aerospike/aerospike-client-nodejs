// *****************************************************************************
// Copyright 2026 Aerospike, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
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

/* global expect, describe, it */

import { expect } from 'chai'
import * as Aerospike from '../lib/aerospike.js'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const native = require('../lib/native')

const bits = Aerospike.bitwise
const opcodes = native.bitOperations

// The operation objects carry bitOffset, bitSize and value at runtime. The
// public Operation type only declares op, bin and value.
type BitOp = {
  op: number
  bin: string
  bitOffset: number
  bitSize: number
  value?: boolean
}

describe('bitwise operation objects #noserver', function () {
  it('count() is a read of BIT_COUNT over the given range', function () {
    const op = bits.count('flags', 0, 16) as unknown as BitOp
    expect(opcodes.BIT_COUNT).to.be.a('number')
    expect(op.op).to.equal(opcodes.BIT_COUNT)
    expect(op.op).to.not.equal(opcodes.BIT_GET)
    expect(op.op).to.not.equal(opcodes.BIT_LSCAN)
    expect(op.bin).to.equal('flags')
    expect(op.bitOffset).to.equal(0)
    expect(op.bitSize).to.equal(16)
  })

  it('lscan and rscan use different opcodes', function () {
    const left = bits.lscan('flags', 0, 16, true) as unknown as BitOp
    const right = bits.rscan('flags', 0, 16, true) as unknown as BitOp
    expect(left.op).to.equal(opcodes.BIT_LSCAN)
    expect(right.op).to.equal(opcodes.BIT_RSCAN)
    expect(left.op).to.not.equal(right.op)
    expect(left.value).to.equal(true)
    expect(right.value).to.equal(true)
  })
})
