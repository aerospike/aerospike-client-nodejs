// *****************************************************************************
// Copyright 2013-2022 Aerospike, Inc.
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

const helper = require('./test_helper')

describe('Command Queue #slow', function () {
  it('queues commands it cannot process immediately', async function () {
    const test = async function (Aerospike, config) {
      Object.assign(config, { log: { level: Aerospike.log.OFF } })
      Aerospike.setupGlobalCommandQueue({ maxCommandsInProcess: 5, maxCommandsInQueue: 5 })
      const client = await Aerospike.connect(config)
      const cmds = Array.from({ length: 10 }, (_, i) =>
        client.put(new Aerospike.Key(helper.namespace, helper.set, i), { i })
      )
      const results = await Promise.all(cmds)
      client.close()
      return results.length
    }

    const result = await helper.runInNewProcess(test, helper.config)
      .then(() => expect(result).to.equal(10))
      .catch(error => console.error('Error:', error))
  })

  it('rejects commands it cannot queue', async function () {
    const test = async function (Aerospike, config) {
      Object.assign(config, { log: { level: Aerospike.log.OFF } }) // disable logging for this test to suppress C client error messages
      Aerospike.setupGlobalCommandQueue({ maxCommandsInProcess: 5, maxCommandsInQueue: 1 })
      const client = await Aerospike.connect(config)
      const cmds = Array.from({ length: 10 }, (_, i) =>
        client.put(new Aerospike.Key(helper.namespace, helper.set, i), { i })
      )
      try {
        await Promise.all(cmds)
        client.close()
        return 'All commands processed successfully'
      } catch (error) {
        client.close()
        return error.message
      }
    }

    const result = await helper.runInNewProcess(test, helper.config)
      .then(() => expect(result).to.match(/Async delay queue full/))
      .catch(error => console.error('Error:', error))
  })

  it('throws an error when trying to configure command queue after client connect', async function () {
    const test = async function (Aerospike, config) {
      Object.assign(config, { log: { level: Aerospike.log.OFF } })
      const client = await Aerospike.connect(config)
      try {
        Aerospike.setupGlobalCommandQueue({ maxCommandsInProcess: 5, maxCommandsInQueue: 1 })
        client.close()
        return 'Successfully setup command queue'
      } catch (error) {
        client.close()
        return error.message
      }
    }

    const result = await helper.runInNewProcess(test, helper.config)
    expect(result).to.match(/Command queue has already been initialized!/)
  })
  it('does not deadlock on extra query with failOnClusterChange info commands #389', async function () {
    const test = async function (Aerospike, config) {
      Object.assign(config, {
        log: { level: Aerospike.log.OFF },
        policies: {
          query: new Aerospike.QueryPolicy({ totalTimeout: 10000, failOnClusterChange: true })
        }
      })
      Aerospike.setupGlobalCommandQueue({ maxCommandsInProcess: 5, maxCommandsInQueue: 50 })
      const setName = 'testGlobalCommandQueueDeadlock389'

      const client = await Aerospike.connect(config)
      try {
        const job = await client.createIntegerIndex({
          ns: 'test',
          set: setName,
          bin: 'i',
          index: `idx-${setName}`
        })
        await job.wait(10)
      } catch (error) {
        // index already exists
        if (error.code !== Aerospike.status.ERR_INDEX_FOUND) throw error
      }

      const puts = Array.from({ length: 5 }, (_, i) =>
        client.put(new Aerospike.Key('test', setName, i), { i })
      )
      await Promise.all(puts)

      try {
        let results = Array.from({ length: 5 }, (_, i) => {
          const query = client.query('test', setName)
          query.where(Aerospike.filter.equal('i', i))
          return query.results()
        })
        results = await Promise.all(results)
        return results.reduce((sum, records) => sum + records.length, 0)
      } catch (error) {
        // throws "Delay queue timeout" error on deadlock
        return error.message
      }
    }

    const result = await helper.runInNewProcess(test, helper.config)
    expect(result).to.eq(5)
  })
})
