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

const { names, examples } = require('./registry')
const {
  CANONICAL_EXAMPLE_NAMES,
  EXPECTED_REGISTRY_SIZE
} = require('./expectedRegistry')

function verifyRegistry () {
  const errors = []

  if (examples.length !== EXPECTED_REGISTRY_SIZE) {
    errors.push(`registry has ${examples.length} entries, expected ${EXPECTED_REGISTRY_SIZE}`)
  }

  if (names.length !== EXPECTED_REGISTRY_SIZE) {
    errors.push(`names has ${names.length} entries, expected ${EXPECTED_REGISTRY_SIZE}`)
  }

  const sortedRegistry = [...names].sort()
  const sortedCanonical = [...CANONICAL_EXAMPLE_NAMES].sort()
  if (sortedRegistry.join(',') !== sortedCanonical.join(',')) {
    const missing = sortedCanonical.filter(n => !names.includes(n))
    const extra = names.filter(n => !CANONICAL_EXAMPLE_NAMES.includes(n))
    if (missing.length) {
      errors.push(`missing from registry: ${missing.join(', ')}`)
    }
    if (extra.length) {
      errors.push(`unexpected in registry: ${extra.join(', ')}`)
    }
  }

  const seen = new Set()
  for (const name of names) {
    if (seen.has(name)) {
      errors.push(`duplicate registry name: ${name}`)
    }
    seen.add(name)
  }

  for (const entry of examples) {
    if (!entry.runExample || typeof entry.runExample !== 'function') {
      errors.push(`${entry.name} missing runExample function`)
    }
    if (!entry.fixture) {
      errors.push(`${entry.name} missing fixture`)
    }
  }

  return errors
}

if (require.main === module) {
  const errors = verifyRegistry()
  if (errors.length) {
    console.error('Example registry verification failed:')
    for (const err of errors) {
      console.error(`  - ${err}`)
    }
    process.exit(1)
  }
  console.info(`Example registry OK (${EXPECTED_REGISTRY_SIZE} examples)`)
}

module.exports = { verifyRegistry }
