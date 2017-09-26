// *****************************************************************************
// Copyright 2013-2017 Aerospike, Inc.
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

/* global describe, it, expect */

const Aerospike = require('../lib/aerospike')
const policy = Aerospike.policy
require('./test_helper')

describe('WritePolicy', function () {
  describe('new WritePolicy', function () {
    it('sets the policy values from a value object', function () {
      let subject = new policy.WritePolicy({
        socketTimeout: 1000,
        totalTimeout: 2000,
        maxRetries: 1,
        compressionThreshold: 500,
        key: Aerospike.policy.key.SEND,
        gen: Aerospike.policy.gen.EQ,
        exists: Aerospike.policy.exists.CREATE,
        commitLevel: 2,
        durableDelete: true
      })

      expect(subject.socketTimeout).to.be(1000)
      expect(subject.totalTimeout).to.be(2000)
      expect(subject.maxRetries).to.be(1)
      expect(subject.compressionThreshold).to.be(500)
      expect(subject.key).to.be(Aerospike.policy.key.SEND)
      expect(subject.gen).to.be(Aerospike.policy.gen.EQ)
      expect(subject.exists).to.be(Aerospike.policy.exists.CREATE)
      expect(subject.commitLevel).to.be(2)
      expect(subject.durableDelete).to.be(true)
    })
  })
})
