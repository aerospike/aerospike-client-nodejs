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

const exp = Aerospike.exp
const strings = Aerospike.strings
const VAL_UINT = native.exp.ops.VAL_UINT

describe('exp.string wire encoding #noserver', function () {
  it('regexReplace packs regex flags then policy flags (CLIENT-4824)', function () {
    const regexFlags =
      strings.regexFlags.GLOBAL | strings.regexFlags.CASE_INSENSITIVE
    const policyFlags = strings.writeFlags.NO_FAIL
    const expr = exp.string.regexReplace(
      { flags: policyFlags },
      'a',
      'b',
      regexFlags,
      exp.binStr('x')
    )
    const uints = expr.filter((node) => node.op === VAL_UINT)
    expect(uints.some((node) => node.uintVal === regexFlags)).to.equal(true)
    expect(uints.some((node) => node.uintVal === policyFlags)).to.equal(true)
  })

  it('snipStart packs one int after SNIP and no policy uint', function () {
    const expr = exp.string.snipStart(null, 5, exp.binStr('x'))
    const ints = expr.filter((node) => node.op === native.exp.ops.VAL_INT)
    expect(ints.some((node) => node.intVal === 5)).to.equal(true)
    const uints = expr.filter((node) => node.op === VAL_UINT)
    expect(uints).to.have.length(0)
    const vops = expr.filter((node) => node.op === native.exp.ops.CALL_VOP_START)
    expect(vops.some((node) => node.count === 2)).to.equal(true)
  })

  it('exposes CREATE_ONLY write flag as 1', function () {
    expect(strings.writeFlags.CREATE_ONLY).to.equal(1)
    expect(strings.writeFlags.UPDATE_ONLY).to.equal(2)
    expect(strings.writeFlags.NO_FAIL).to.equal(4)
  })
})
