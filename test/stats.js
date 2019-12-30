// *****************************************************************************
// Copyright 2018-2019 Aerospike, Inc.
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
const client = helper.client

describe('Client#stats', function () {
  before(function (done) {
    // Send an async command to each node ensure we have at least 1 async
    // connection open. At least 1 sync connection has been opened to send some
    // info commands.
    client.scan(helper.namespace, 'noSuchSet').foreach().on('end', done)
  })

  it('returns command queue stats', function () {
    const stats = client.stats()
    expect(stats.commands).to.not.be.empty()
    expect(stats.commands.inFlight).to.be.at.least(0)
    expect(stats.commands.queued).to.be.at.least(0)
  })

  it('returns cluster node stats', function () {
    const stats = client.stats()
    expect(stats.nodes).to.be.an('array').that.is.not.empty()

    const node = stats.nodes.pop()
    expect(node.name).to.be.a('string').of.length(15)
    for (const connStats of [node.syncConnections, node.asyncConnections]) {
      expect(connStats.inPool).to.be.at.least(1)
      expect(connStats.inUse).to.be.at.least(0)
      expect(connStats.opened).to.be.at.least(1)
      expect(connStats.closed).to.be.at.least(0)
    }
  })
})
