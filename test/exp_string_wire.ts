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
  it('regexReplace packs regex flags as VAL_UINT (CLIENT-4955)', function () {
    const flags = strings.regexFlags.GLOBAL | strings.regexFlags.CASE_INSENSITIVE
    const expr = exp.string.regexReplace(null, 'a', 'b', flags, exp.binStr('x'))
    const flagNode = expr.find(
      (node) => node.op === VAL_UINT && node.uintVal === flags
    )
    expect(flagNode).to.exist
  })
})
