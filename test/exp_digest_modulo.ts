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

describe('exp.digestModulo wire shape #noserver', function () {
  it('packs the divisor as the single operand', function () {
    expect(exp.digestModulo(3)).to.eql([
      { op: native.exp.ops.DIGEST_MODULO, count: 2 },
      { op: native.exp.ops.VAL_INT, intVal: 3 }
    ])
  })

  it('keeps a different divisor instead of dropping it', function () {
    const expr = exp.digestModulo(7)
    expect(expr).to.not.eql([
      { op: native.exp.ops.DIGEST_MODULO, count: 1 }
    ])
    expect(expr).to.deep.include({ op: native.exp.ops.VAL_INT, intVal: 7 })
  })
})
