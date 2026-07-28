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

const SCAN_SEED_BEGIN = 1
const SCAN_SEED_END = 10
const SCAN_SEED_PREFIX = 'scankey'
const SCAN_SEED_BIN = 'scanbin'

async function putGet (client, args) {
  const readPolicy = { ...client.config.policies.read }
  const record = await client.select(support.key(args, 'putgetkey'), ['bin1'], readPolicy)
  if (!record) {
    throw new Error('PutGet verification failed: record not found for putgetkey.')
  }
  if (record.bins.bin1 !== 'value1') {
    throw new Error(`PutGet verification failed: expected bin1=value1, got ${JSON.stringify(record.bins.bin1)}.`)
  }
  const header = await client.get(support.key(args, 'putgetkey'), readPolicy)
  if (!header || !header.gen) {
    throw new Error('PutGet verification failed: record header was not populated.')
  }
}

async function exists (client, args) {
  await support.assertNotExists(client, args, 'existskey')
}

async function getSetup (client, args) {
  await support.putBins(client, args, 'docreadkey', {
    report: 'sample-report',
    location: 'sample-location'
  })
}

async function getValidate (client, args) {
  await support.assertExists(client, args, 'docreadkey')
  await support.assertBin(client, args, 'docreadkey', 'report', 'sample-report')
  await support.assertBin(client, args, 'docreadkey', 'location', 'sample-location')
}

async function getCleanup (client, args) {
  await support.deleteKeys(client, args, ['docreadkey'])
}

async function add (client, args) {
  await support.assertBin(client, args, 'addkey', 'addbin', 45)
}

async function append (client, args) {
  await support.assertBin(client, args, 'appendkey', 'appendbin', 'Hello World')
}

async function prepend (client, args) {
  await support.assertBin(client, args, 'prependkey', 'prependbin', 'Hello World')
}

async function setupDelete (client, args) {
  await support.putBins(client, args, 'deletekey', { bin: 'value' })
  await support.putBins(client, args, 'durabledeletekey', { bin: 'durablevalue' })
}

async function deleteValidate (client, args) {
  await support.assertNotExists(client, args, 'deletekey')
  await support.assertNotExists(client, args, 'durabledeletekey')
}

async function setupReplace (client, args) {
  await support.deleteKeys(client, args, ['replacekey', 'replaceonlykey'])
  await support.putBins(client, args, 'replacekey', { bin1: 'value1', bin2: 'value2' })
}

async function replace (client, args) {
  const readPolicy = { ...client.config.policies.read }
  const record = await client.get(support.key(args, 'replacekey'), readPolicy)
  if (!record) {
    throw new Error('Replace verification failed: replacekey record not found.')
  }
  if (record.bins.bin1 != null || record.bins.bin2 != null) {
    throw new Error('Replace verification failed: bins removed by replace should be absent.')
  }
  if (record.bins.bin3 !== 'value3') {
    throw new Error(`Replace verification failed: expected bin3=value3, got ${JSON.stringify(record.bins.bin3)}.`)
  }
  await support.assertNotExists(client, args, 'replaceonlykey')
}

async function setupOperate (client, args) {
  await support.putBins(client, args, 'opkey', {
    optintbin: 7,
    optstringbin: 'string value'
  })
}

async function operate (client, args) {
  await support.assertBin(client, args, 'opkey', 'optintbin', 11)
  await support.assertBin(client, args, 'opkey', 'optstringbin', 'new string')
}

async function setupBatch (client, args) {
  for (let i = 1; i <= 8; i++) {
    await support.putBins(client, args, `batchkey${i}`, { batchbin: `batchvalue${i}` })
  }
}

async function batch (client, args) {
  for (let i = 1; i <= 8; i++) {
    await support.assertBin(client, args, `batchkey${i}`, 'batchbin', `batchvalue${i}`)
  }
}

async function setupScanDefaultSet (client, args) {
  await cleanupScanDefaultSet(client, args)
  for (let i = SCAN_SEED_BEGIN; i <= SCAN_SEED_END; i++) {
    await support.putBins(client, args, `${SCAN_SEED_PREFIX}${i}`, { [SCAN_SEED_BIN]: i })
  }
}

async function scanDefaultSet (client, args) {
  const expected = new Set()
  for (let i = SCAN_SEED_BEGIN; i <= SCAN_SEED_END; i++) {
    expected.add(i)
  }

  const scan = client.scan(args.namespace, args.set)
  const stream = scan.foreach()
  await new Promise((resolve, reject) => {
    stream.on('data', record => {
      const value = record.bins[SCAN_SEED_BIN]
      if (typeof value === 'number' && value >= SCAN_SEED_BEGIN && value <= SCAN_SEED_END) {
        expected.delete(value)
      }
    })
    stream.on('error', reject)
    stream.on('end', resolve)
  })

  if (expected.size > 0) {
    throw new Error(`Scan verification failed: seeded scanbin values were not scanned: ${[...expected].join(', ')}.`)
  }
}

async function cleanupScanDefaultSet (client, args) {
  await support.deleteRange(client, args, SCAN_SEED_PREFIX, SCAN_SEED_BEGIN, SCAN_SEED_END)
}

async function setupQueryInteger (client, args) {
  await support.createIndex(client, args, 'queryindexint', 'querybinint')
  await support.putIntegerRange(client, args, 'querykeyint', 'querybinint', 1, 50)
}

async function queryInteger (client, args) {
  for (let i = 14; i <= 18; i++) {
    await support.assertBin(client, args, `querykeyint${i}`, 'querybinint', i)
  }
}

async function cleanupQueryInteger (client, args) {
  await support.dropIndexQuietly(client, args, 'queryindexint')
  await support.deleteRange(client, args, 'querykeyint', 1, 50)
}

async function setupUserDefinedFunction (client, args) {
  await cleanupUserDefinedFunction(client, args)
  await support.registerUdf(client, 'record_example.lua')
  await support.putBins(client, args, 'udfkey2', { udfbin2: 'string value' })
  await support.putBins(client, args, 'udfkey7', { udfbin7: [64, 3702, -5] })
}

async function userDefinedFunction (client, args) {
  await support.assertBin(client, args, 'udfkey1', 'udfbin1', 'string value')
  await support.assertBin(client, args, 'udfkey2', 'udfbin2', 'string value')
  await support.assertBin(client, args, 'udfkey3', 'udfbin3', 'first')
}

async function cleanupUserDefinedFunction (client, args) {
  await support.removeUdfQuietly(client, 'record_example.lua')
  await support.deleteKeys(client, args, [
    'udfkey1', 'udfkey2', 'udfkey3', 'udfkey4', 'udfkey5', 'udfkey7'
  ])
}

module.exports = {
  putGet,
  exists,
  getSetup,
  getValidate,
  getCleanup,
  add,
  append,
  prepend,
  setupDelete,
  deleteValidate,
  setupReplace,
  replace,
  setupOperate,
  operate,
  setupBatch,
  batch,
  setupScanDefaultSet,
  scanDefaultSet,
  cleanupScanDefaultSet,
  setupQueryInteger,
  queryInteger,
  cleanupQueryInteger,
  setupUserDefinedFunction,
  userDefinedFunction,
  cleanupUserDefinedFunction
}
