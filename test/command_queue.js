// *****************************************************************************
// Copyright 2013-2019 Aerospike, Inc.
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
  it('queues commands it cannot process immediately', function () {
    const test = function (Aerospike, config, done) {
      config = Object.assign(config, { log: { level: Aerospike.log.OFF } })
      Aerospike.setupGlobalCommandQueue({ maxCommandsInProcess: 5, maxCommandsInQueue: 5 })
      Aerospike.connect(config)
        .then(client => {
          const cmds = Array.from({ length: 10 }, (_, i) =>
            client.put(new Aerospike.Key('test', 'test', i), { i: i }))
          Promise.all(cmds)
            .then(results => done(results.length))
            .then(() => client.close())
        })
    }
    return helper.runInNewProcess(test, helper.config)
      .then(result => expect(result).to.equal(10))
  })

  it('rejects commands it cannot queue', function () {
    const test = function (Aerospike, config, done) {
      config = Object.assign(config, { log: { level: Aerospike.log.OFF } }) // disable logging for this test to suppress C client error messages
      Aerospike.setupGlobalCommandQueue({ maxCommandsInProcess: 5, maxCommandsInQueue: 1 })
      Aerospike.connect(config)
        .then(client => {
          const cmds = Array.from({ length: 10 }, (_, i) =>
            client.put(new Aerospike.Key('test', 'test', i), { i: i }))
          Promise.all(cmds)
            .then(() => done('All commands processed successfully'))
            .catch(error => done(error.message))
            .then(() => client.close())
        })
    }
    return helper.runInNewProcess(test, helper.config)
      .then(error => expect(error).to.match(/Async delay queue full/))
  })

  it('throws an error when trying to configure command queue after client connect', function () {
    const test = function (Aerospike, config, done) {
      config = Object.assign(config, { log: { level: Aerospike.log.OFF } })
      Aerospike.connect(config)
        .then(client => {
          try {
            Aerospike.setupGlobalCommandQueue({ maxCommandsInProcess: 5, maxCommandsInQueue: 1 })
            done('Successfully setup command queue')
          } catch (error) {
            done(error.message)
          }
          client.close()
        })
    }
    return helper.runInNewProcess(test, helper.config)
      .then(error => expect(error).to.match(/Command queue has already been initialized!/))
  })
})
