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

const support = require('./support')

function emptyFixture () {
  return {}
}

function validateAndCleanup (validate, userKeys) {
  const keys = Array.isArray(userKeys) ? userKeys : [userKeys]
  return {
    setup: async (client, args) => {
      await support.deleteKeys(client, args, keys)
    },
    validate: async (client, args) => {
      await validate(client, args)
    },
    cleanup: async (client, args) => {
      await support.deleteKeys(client, args, keys)
    }
  }
}

function fixture (setup, validate, cleanup) {
  return { setup, validate, cleanup }
}

function scanDefaultSetFixture (setup, validate, cleanup) {
  return fixture(setup, validate, cleanup)
}

function queryCleanup (setup, validate, cleanup) {
  return fixture(setup, validate, cleanup)
}

module.exports = {
  emptyFixture,
  validateAndCleanup,
  fixture,
  scanDefaultSetFixture,
  queryCleanup
}
