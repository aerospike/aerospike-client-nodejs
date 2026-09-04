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

import { expect } from 'chai'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const { names, examples } = require('../examples/harness/registry.js')
const {
  CANONICAL_EXAMPLE_NAMES,
  EXPECTED_REGISTRY_SIZE
} = require('../examples/harness/expectedRegistry.js')
const { verifyRegistry } = require('../examples/harness/verifyRegistry.js')

describe('examples harness registry #noserver', function () {
  it('matches the canonical example list and size', function () {
    expect(examples).to.have.lengthOf(EXPECTED_REGISTRY_SIZE)
    expect(names).to.have.lengthOf(EXPECTED_REGISTRY_SIZE)
    expect([...names].sort()).to.eql([...CANONICAL_EXAMPLE_NAMES].sort())
  })

  it('has unique names and required hooks', function () {
    expect(verifyRegistry()).to.eql([])
  })
})
