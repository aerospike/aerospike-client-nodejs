// *****************************************************************************
// Copyright 2018 Aerospike, Inc.
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
  it('returns command queue stats', function () {
    const stats = client.stats()
    expect(stats.commands).to.not.be.empty()
    expect(stats.commands.inFlight).to.be.at.least(0)
    expect(stats.commands.queued).to.be.at.least(0)
  })

  it('returns cluster node stats', function () {
    const stats = client.stats()
    expect(stats.nodes).to.not.be.empty()
    expect(stats.nodes[0].name).to.be.a('string').of.length(15)
    expect(stats.nodes[0].syncConnections.inPool).to.be.at.least(0)
    expect(stats.nodes[0].syncConnections.inUse).to.be.at.least(0)
    expect(stats.nodes[0].asyncConnections.inPool).to.be.at.least(0)
    expect(stats.nodes[0].asyncConnections.inUse).to.be.at.least(0)
  })
})
