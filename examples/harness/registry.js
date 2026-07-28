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

const validation = require('./fixtures/validation')
const {
  emptyFixture,
  validateAndCleanup,
  fixture,
  scanDefaultSetFixture,
  queryCleanup
} = require('./fixtures/recipes')

const connect = require('../doc/connect')
const putGet = require('../doc/putGet')
const getDocExample = require('../doc/get')
const existsExample = require('../doc/exists')
const serverInfo = require('../doc/serverInfo')
const add = require('../doc/add')
const append = require('../doc/append')
const prepend = require('../doc/prepend')
const deleteExample = require('../doc/delete')
const replace = require('../doc/replace')
const operate = require('../doc/operate')
const batch = require('../doc/batch')
const scanParallel = require('../doc/scanParallel')
const queryInteger = require('../doc/queryInteger')
const userDefinedFunction = require('../doc/userDefinedFunction')

const examples = [
  { name: 'Connect', runExample: connect.runExample, fixture: emptyFixture() },
  { name: 'ServerInfo', runExample: serverInfo.runExample, fixture: emptyFixture() },
  { name: 'PutGet', runExample: putGet.runExample, fixture: validateAndCleanup(validation.putGet, 'putgetkey') },
  { name: 'Get', runExample: getDocExample.runExample, fixture: fixture(validation.getSetup, validation.getValidate, validation.getCleanup) },
  { name: 'Exists', runExample: existsExample.runExample, fixture: validateAndCleanup(validation.exists, 'existskey') },
  { name: 'Add', runExample: add.runExample, fixture: validateAndCleanup(validation.add, 'addkey') },
  { name: 'Append', runExample: append.runExample, fixture: validateAndCleanup(validation.append, 'appendkey') },
  { name: 'Prepend', runExample: prepend.runExample, fixture: validateAndCleanup(validation.prepend, 'prependkey') },
  {
    name: 'Delete',
    runExample: deleteExample.runExample,
    fixture: fixture(
      validation.setupDelete,
      validation.deleteValidate,
      async (client, args) => {
        const support = require('./fixtures/support')
        await support.deleteKeys(client, args, ['deletekey', 'durabledeletekey'])
      }
    )
  },
  {
    name: 'Replace',
    runExample: replace.runExample,
    fixture: fixture(
      validation.setupReplace,
      validation.replace,
      async (client, args) => {
        const support = require('./fixtures/support')
        await support.deleteKeys(client, args, ['replacekey', 'replaceonlykey'])
      }
    )
  },
  {
    name: 'Operate',
    runExample: operate.runExample,
    fixture: fixture(validation.setupOperate, validation.operate, async (client, args) => {
      const support = require('./fixtures/support')
      await support.deleteKeys(client, args, ['opkey'])
    })
  },
  {
    name: 'Batch',
    runExample: batch.runExample,
    fixture: fixture(validation.setupBatch, validation.batch, async (client, args) => {
      const support = require('./fixtures/support')
      await support.deleteRange(client, args, 'batchkey', 1, 8)
    })
  },
  {
    name: 'ScanParallel',
    runExample: scanParallel.runExample,
    fixture: scanDefaultSetFixture(
      validation.setupScanDefaultSet,
      validation.scanDefaultSet,
      validation.cleanupScanDefaultSet
    )
  },
  {
    name: 'QueryInteger',
    runExample: queryInteger.runExample,
    fixture: queryCleanup(
      validation.setupQueryInteger,
      validation.queryInteger,
      validation.cleanupQueryInteger
    )
  },
  {
    name: 'UserDefinedFunction',
    runExample: userDefinedFunction.runExample,
    fixture: fixture(
      validation.setupUserDefinedFunction,
      validation.userDefinedFunction,
      validation.cleanupUserDefinedFunction
    )
  }
]

const names = examples.map(entry => entry.name)

function resolveExampleNames (requested) {
  if (requested.length === 1 && requested[0].toLowerCase() === 'all') {
    return names
  }
  return requested
}

function getExample (name) {
  return examples.find(entry => entry.name.toLowerCase() === name.toLowerCase())
}

module.exports = {
  examples,
  names,
  resolveExampleNames,
  getExample
}
