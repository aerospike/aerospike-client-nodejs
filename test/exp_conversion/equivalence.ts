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

/* global describe, it */

import { expect } from 'chai';
import { compileIn, differences, Results } from './helpers.ts';
import { FUZZ_COUNT } from './corpus.ts';

// Each set is compiled by the legacy and the fast conversion, each in its own
// process, and must give the same bytes, errors and log messages.
describe('Expression conversion: fast path matches the legacy path #noserver', function () {
  this.timeout(120000)

  function expectSame (set: string, expectedCases: number) {
    const legacy: Results = compileIn('legacy', set)
    const fast: Results = compileIn('fast', set)
    expect(Object.keys(fast)).to.have.length(expectedCases)
    expect(differences(legacy, fast)).to.eql([])
    return fast
  }

  it('compiles every node kind the exp builders emit to the same bytes', function () {
    const fast = expectSame('builders', 64)
    const failed = Object.entries(fast).filter(([, result]) => result.out.startsWith('ERROR'))
    expect(failed.map(([name]) => name)).to.eql([])
  })

  it('reads hand-built nodes the same way: inherited, hidden, getter, exotic and polluted', function () {
    expectSame('shapes', 30)
  })

  it('rejects malformed nodes the same way, with the same log messages', function () {
    const fast = expectSame('invalid', 18)
    const accepted = Object.entries(fast).filter(([, result]) => !result.out.startsWith('ERROR'))
    expect(accepted.map(([name]) => name)).to.eql([])
  })

  it(`gives the same result for ${FUZZ_COUNT} random expressions`, function () {
    const fast = expectSame('fuzz', FUZZ_COUNT)
    const outcomes = Object.values(fast).map(result => result.out.startsWith('ERROR') ? 'error' : 'ok')
    // the fuzz must exercise both outcomes
    expect(outcomes.filter(o => o === 'ok').length).to.be.greaterThan(FUZZ_COUNT / 4)
    expect(outcomes.filter(o => o === 'error').length).to.be.greaterThan(FUZZ_COUNT / 10)
  })

  it('compiles the same in a worker thread, which then exits cleanly', function () {
    const main: Results = compileIn('fast', 'builders')
    const worker: Results = compileIn('fast', 'builders', 'worker')
    expect(differences(main, worker)).to.eql([])
  })
})

describe('Expression conversion: fast path #noserver', function () {
  this.timeout(120000)

  it('throws for entries the legacy path cannot take, without crashing', function () {
    const fast: Results = compileIn('fast', 'fastOnly')
    for (const [name, result] of Object.entries(fast)) {
      expect(result.out, name).to.match(/^ERROR: /)
    }
  })

  it('is selected by default and is faster than the legacy path', function () {
    const legacy = compileIn('legacy', 'timing').nsPerCompile
    const fast = compileIn('fast', 'timing').nsPerCompile
    expect(fast).to.be.lessThan(legacy / 2)
  })
})
