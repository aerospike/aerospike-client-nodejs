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
import * as path from 'path'
import * as fs from 'fs'
import { resolvePrebuildRoot } from '../scripts/resolve-prebuild-root.js'
import { resolveNativeBinding } from '../scripts/resolve-native-binding.js'

describe('resolvePrebuildRoot #noserver', function () {
  const pkgRoot = path.join(__dirname, '..')
  const tag = `${process.platform}-${process.arch}`

  it('uses embedded prebuilds/ when present', function () {
    const embedded = path.join(pkgRoot, 'prebuilds', tag)
    if (!fs.existsSync(embedded)) {
      this.skip()
    }
    expect(resolvePrebuildRoot(pkgRoot)).to.equal(pkgRoot)
  })

  it('resolves optional @aerospike/prebuild package from node_modules', function () {
    const embedded = path.join(pkgRoot, 'prebuilds', tag)
    if (fs.existsSync(embedded)) {
      this.skip()
    }
    const optionalRoot = path.join(
      pkgRoot,
      'node_modules',
      `@aerospike/prebuild-${tag}`
    )
    if (!fs.existsSync(optionalRoot)) {
      this.skip()
    }
    expect(resolvePrebuildRoot(pkgRoot)).to.equal(optionalRoot)
  })
})

describe('resolveNativeBinding #noserver', function () {
  const pkgRoot = path.join(__dirname, '..')
  const tag = `${process.platform}-${process.arch}`
  const abi = process.versions.modules

  it('loads prebuild from embedded or optional package layout', function () {
    const embedded = path.join(pkgRoot, 'prebuilds', tag)
    const optionalRoot = path.join(
      pkgRoot,
      'node_modules',
      `@aerospike/prebuild-${tag}`
    )
    if (!fs.existsSync(embedded) && !fs.existsSync(optionalRoot)) {
      this.skip()
    }
    const binding = resolveNativeBinding(pkgRoot)
    expect(binding.endsWith('.node')).to.equal(true)
    expect(fs.existsSync(binding)).to.equal(true)
    expect(
      binding.includes(`node.abi${abi}.node`) ||
      binding.includes(`aerospike.${abi}.node`)
    ).to.equal(true)
  })
})
