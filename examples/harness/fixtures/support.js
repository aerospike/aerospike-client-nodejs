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

const path = require('path')
const Aerospike = require('../aerospikeClient')

function key (args, userKey) {
  return new Aerospike.Key(args.namespace, args.set, userKey)
}

async function deleteKeys (client, args, userKeys) {
  const writePolicy = { ...client.config.policies.write }
  for (const userKey of userKeys) {
    try {
      await client.remove(key(args, userKey), writePolicy)
    } catch (err) {
      if (err.code !== Aerospike.status.ERR_RECORD_NOT_FOUND) {
        throw err
      }
    }
  }
}

async function deleteRange (client, args, keyPrefix, begin, end) {
  for (let i = begin; i <= end; i++) {
    await deleteKeys(client, args, [`${keyPrefix}${i}`])
  }
}

async function deleteIntegerRange (client, args, begin, end) {
  for (let i = begin; i <= end; i++) {
    await deleteKeys(client, args, [i])
  }
}

async function putBins (client, args, userKey, bins) {
  const writePolicy = { ...client.config.policies.write }
  await client.put(key(args, userKey), bins, null, writePolicy)
}

async function putIntegerRange (client, args, keyPrefix, binName, begin, end) {
  for (let i = begin; i <= end; i++) {
    await putBins(client, args, `${keyPrefix}${i}`, { [binName]: i })
  }
}

async function assertNotExists (client, args, userKey) {
  const readPolicy = { ...client.config.policies.read }
  const exists = await client.exists(key(args, userKey), readPolicy)
  if (exists) {
    throw new Error(`Expected record ${userKey} to be absent`)
  }
}

async function assertExists (client, args, userKey) {
  const readPolicy = { ...client.config.policies.read }
  const exists = await client.exists(key(args, userKey), readPolicy)
  if (!exists) {
    throw new Error(`Expected record ${userKey} to exist`)
  }
}

async function assertBin (client, args, userKey, binName, expected) {
  const readPolicy = { ...client.config.policies.read }
  const record = await client.select(key(args, userKey), [binName], readPolicy)
  if (!record || record.bins[binName] !== expected) {
    const received = record ? record.bins[binName] : undefined
    throw new Error(`Expected ${binName}=${JSON.stringify(expected)}, got ${JSON.stringify(received)}`)
  }
}

async function dropIndexQuietly (client, args, indexName) {
  try {
    await client.indexRemove(args.namespace, indexName)
  } catch (err) {
    if (err.code !== Aerospike.status.ERR_INDEX_NOT_FOUND) {
      throw err
    }
  }
}

async function createIndex (client, args, indexName, binName, datatype) {
  await dropIndexQuietly(client, args, indexName)
  const job = await client.createIndex({
    ns: args.namespace,
    set: args.set,
    bin: binName,
    index: indexName,
    datatype: datatype || Aerospike.indexDataType.INTEGER,
    type: Aerospike.indexType.DEFAULT
  })
  await job.wait()
}

async function registerUdf (client, filename) {
  const scriptPath = path.join(__dirname, '..', '..', 'lua', filename)
  const job = await client.udfRegister(scriptPath)
  await job.waitUntilDone()
}

async function removeUdfQuietly (client, filename) {
  try {
    const job = await client.udfRemove(filename)
    await job.waitUntilDone()
  } catch (err) {
    if (err.code !== Aerospike.status.ERR_UDF) {
      throw err
    }
  }
}

module.exports = {
  key,
  deleteKeys,
  deleteRange,
  deleteIntegerRange,
  putBins,
  putIntegerRange,
  assertNotExists,
  assertExists,
  assertBin,
  dropIndexQuietly,
  createIndex,
  registerUdf,
  removeUdfQuietly
}
