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
require('./test_helper')

describe('ApplyPolicy', function () {
  describe('new ApplyPolicy', function () {
    it('sets the policy values from a value object', function () {
      let subject = new Aerospike.ApplyPolicy({
        socketTimeout: 1000,
        totalTimeout: 2000,
        maxRetries: 1,
        gen: Aerospike.policy.gen.EQ,
        key: Aerospike.policy.key.SEND,
        commitLevel: 2,
        ttl: 3600,
        durableDelete: true
      })

      expect(subject.socketTimeout).to.be(1000)
      expect(subject.totalTimeout).to.be(2000)
      expect(subject.maxRetries).to.be(1)
      expect(subject.gen).to.be(Aerospike.policy.gen.EQ)
      expect(subject.key).to.be(Aerospike.policy.key.SEND)
      expect(subject.commitLevel).to.be(2)
      expect(subject.ttl).to.be(3600)
      expect(subject.durableDelete).to.be(true)
    })
  })
})

describe('WritePolicy', function () {
  describe('new WritePolicy', function () {
    it('sets the policy values from a value object', function () {
      let subject = new Aerospike.WritePolicy({
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

describe('ReadPolicy', function () {
  describe('new ReadPolicy', function () {
    it('sets the policy values from a value object', function () {
      let subject = new Aerospike.ReadPolicy({
        socketTimeout: 1000,
        totalTimeout: 2000,
        maxRetries: 1,
        key: Aerospike.policy.key.SEND,
        replica: Aerospike.policy.replica.MASTER,
        consistencyLevel: Aerospike.policy.consistencyLevel.ONE
      })

      expect(subject.socketTimeout).to.be(1000)
      expect(subject.totalTimeout).to.be(2000)
      expect(subject.maxRetries).to.be(1)
      expect(subject.key).to.be(Aerospike.policy.key.SEND)
      expect(subject.replica).to.be(Aerospike.policy.replica.MASTER)
      expect(subject.consistencyLevel).to.be(Aerospike.policy.consistencyLevel.ONE)
    })
  })
})

describe('BatchPolicy', function () {
  describe('new BatchPolicy', function () {
    it('sets the policy values from a value object', function () {
      let subject = new Aerospike.BatchPolicy({
        socketTimeout: 1000,
        totalTimeout: 2000,
        maxRetries: 1,
        consistencyLevel: Aerospike.policy.consistencyLevel.ONE,
        allowInline: false,
        sendSetName: true
      })

      expect(subject.socketTimeout).to.be(1000)
      expect(subject.totalTimeout).to.be(2000)
      expect(subject.maxRetries).to.be(1)
      expect(subject.consistencyLevel).to.be(Aerospike.policy.consistencyLevel.ONE)
      expect(subject.allowInline).to.be(false)
      expect(subject.sendSetName).to.be(true)
    })
  })
})

describe('InfoPolicy', function () {
  describe('new InfoPolicy', function () {
    it('sets the policy values from a value object', function () {
      let subject = new Aerospike.InfoPolicy({
        timeout: 1000,
        sendAsIs: true,
        checkBounds: false
      })

      expect(subject.timeout).to.be(1000)
      expect(subject.sendAsIs).to.be(true)
      expect(subject.checkBounds).to.be(false)
    })
  })
})

describe('RemovePolicy', function () {
  describe('new RemovePolicy', function () {
    it('sets the policy values from a value object', function () {
      let subject = new Aerospike.RemovePolicy({
        socketTimeout: 1000,
        totalTimeout: 2000,
        maxRetries: 1,
        generation: 1234,
        key: Aerospike.policy.key.SEND,
        gen: Aerospike.policy.gen.EQ,
        commitLevel: 2,
        durableDelete: true
      })

      expect(subject.socketTimeout).to.be(1000)
      expect(subject.totalTimeout).to.be(2000)
      expect(subject.maxRetries).to.be(1)
      expect(subject.generation).to.be(1234)
      expect(subject.key).to.be(Aerospike.policy.key.SEND)
      expect(subject.gen).to.be(Aerospike.policy.gen.EQ)
      expect(subject.commitLevel).to.be(2)
      expect(subject.durableDelete).to.be(true)
    })
  })
})
