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

const Aerospike = require('../lib/aerospike')
const BasePolicy = require('../lib/policies/base_policy')
require('./test_helper')

context('Client Policies #noserver', function () {
  describe('BasePolicy', function () {
    describe('new BasePolicy', function () {
      it('sets totalTimeout to zero', function () {
        const subject = new BasePolicy({
          totalTimeout: 0
        })

        expect(subject.totalTimeout).to.equal(0)
      })
    })
  })

  describe('ApplyPolicy', function () {
    describe('new ApplyPolicy', function () {
      it('sets the policy values from a value object', function () {
        const subject = new Aerospike.ApplyPolicy({
          socketTimeout: 1000,
          totalTimeout: 2000,
          maxRetries: 1,
          gen: Aerospike.policy.gen.EQ,
          key: Aerospike.policy.key.SEND,
          commitLevel: 2,
          ttl: 3600,
          durableDelete: true
        })

        expect(subject.socketTimeout).to.equal(1000)
        expect(subject.totalTimeout).to.equal(2000)
        expect(subject.maxRetries).to.equal(1)
        expect(subject.gen).to.equal(Aerospike.policy.gen.EQ)
        expect(subject.key).to.equal(Aerospike.policy.key.SEND)
        expect(subject.commitLevel).to.equal(2)
        expect(subject.ttl).to.equal(3600)
        expect(subject.durableDelete).to.be.true()
      })
    })
  })

  describe('WritePolicy', function () {
    describe('new WritePolicy', function () {
      it('sets the policy values from a value object', function () {
        const subject = new Aerospike.WritePolicy({
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

        expect(subject.socketTimeout).to.equal(1000)
        expect(subject.totalTimeout).to.equal(2000)
        expect(subject.maxRetries).to.equal(1)
        expect(subject.compressionThreshold).to.equal(500)
        expect(subject.key).to.equal(Aerospike.policy.key.SEND)
        expect(subject.gen).to.equal(Aerospike.policy.gen.EQ)
        expect(subject.exists).to.equal(Aerospike.policy.exists.CREATE)
        expect(subject.commitLevel).to.equal(2)
        expect(subject.durableDelete).to.be.true()
      })
    })
  })

  describe('ReadPolicy', function () {
    describe('new ReadPolicy', function () {
      it('sets the policy values from a value object', function () {
        const subject = new Aerospike.ReadPolicy({
          socketTimeout: 1000,
          totalTimeout: 2000,
          maxRetries: 1,
          key: Aerospike.policy.key.SEND,
          replica: Aerospike.policy.replica.MASTER,
          readModeAP: Aerospike.policy.readModeAP.ONE,
          readModeSC: Aerospike.policy.readModeSC.SESSION
        })

        expect(subject.socketTimeout).to.equal(1000)
        expect(subject.totalTimeout).to.equal(2000)
        expect(subject.maxRetries).to.equal(1)
        expect(subject.key).to.equal(Aerospike.policy.key.SEND)
        expect(subject.replica).to.equal(Aerospike.policy.replica.MASTER)
        expect(subject.readModeAP).to.equal(Aerospike.policy.readModeAP.ONE)
        expect(subject.readModeSC).to.equal(Aerospike.policy.readModeSC.SESSION)
      })
    })
  })

  describe('BatchPolicy', function () {
    describe('new BatchPolicy', function () {
      it('sets the policy values from a value object', function () {
        const subject = new Aerospike.BatchPolicy({
          socketTimeout: 1000,
          totalTimeout: 2000,
          maxRetries: 1,
          readModeAP: Aerospike.policy.readModeAP.ONE,
          readModeSC: Aerospike.policy.readModeSC.SESSION,
          allowInline: false,
          sendSetName: true
        })

        expect(subject.socketTimeout).to.equal(1000)
        expect(subject.totalTimeout).to.equal(2000)
        expect(subject.maxRetries).to.equal(1)
        expect(subject.readModeAP).to.equal(Aerospike.policy.readModeAP.ONE)
        expect(subject.readModeSC).to.equal(Aerospike.policy.readModeSC.SESSION)
        expect(subject.allowInline).to.be.false()
        expect(subject.sendSetName).to.be.true()
      })
    })
  })

  describe('InfoPolicy', function () {
    describe('new InfoPolicy', function () {
      it('sets the policy values from a value object', function () {
        const subject = new Aerospike.InfoPolicy({
          totalTimeout: 1000,
          sendAsIs: true,
          checkBounds: false
        })

        expect(subject.totalTimeout).to.equal(1000)
        expect(subject.sendAsIs).to.be.true()
        expect(subject.checkBounds).to.be.false()
      })
    })
  })

  describe('RemovePolicy', function () {
    describe('new RemovePolicy', function () {
      it('sets the policy values from a value object', function () {
        const subject = new Aerospike.RemovePolicy({
          socketTimeout: 1000,
          totalTimeout: 2000,
          maxRetries: 1,
          generation: 1234,
          key: Aerospike.policy.key.SEND,
          gen: Aerospike.policy.gen.EQ,
          commitLevel: 2,
          durableDelete: true
        })

        expect(subject.socketTimeout).to.equal(1000)
        expect(subject.totalTimeout).to.equal(2000)
        expect(subject.maxRetries).to.equal(1)
        expect(subject.generation).to.equal(1234)
        expect(subject.key).to.equal(Aerospike.policy.key.SEND)
        expect(subject.gen).to.equal(Aerospike.policy.gen.EQ)
        expect(subject.commitLevel).to.equal(2)
        expect(subject.durableDelete).to.be.true()
      })
    })
  })

  describe('OperatePolicy', function () {
    describe('new OperatePolicy', function () {
      it('sets the policy values from a value object', function () {
        const subject = new Aerospike.OperatePolicy({
          socketTimeout: 1000,
          totalTimeout: 2000,
          maxRetries: 1,
          key: Aerospike.policy.key.SEND,
          gen: Aerospike.policy.gen.EQ,
          replica: Aerospike.policy.replica.MASTER,
          readModeAP: Aerospike.policy.readModeAP.ONE,
          readModeSC: Aerospike.policy.readModeSC.SESSION,
          commitLevel: 2,
          durableDelete: true
        })
        expect(subject.socketTimeout).to.equal(1000)
        expect(subject.totalTimeout).to.equal(2000)
        expect(subject.maxRetries).to.equal(1)
        expect(subject.key).to.equal(Aerospike.policy.key.SEND)
        expect(subject.gen).to.equal(Aerospike.policy.gen.EQ)
        expect(subject.replica).to.equal(Aerospike.policy.replica.MASTER)
        expect(subject.readModeAP).to.equal(Aerospike.policy.readModeAP.ONE)
        expect(subject.readModeSC).to.equal(Aerospike.policy.readModeSC.SESSION)
        expect(subject.commitLevel).to.equal(2)
        expect(subject.durableDelete).to.be.true()
      })
    })
  })

  describe('ScanPolicy', function () {
    describe('new ScanPolicy', function () {
      it('sets the policy values from a value object', function () {
        const subject = new Aerospike.ScanPolicy({
          socketTimeout: 1000,
          totalTimeout: 2000,
          maxRetries: 1,
          failOnClusterChange: true,
          durableDelete: true
        })

        expect(subject.socketTimeout).to.equal(1000)
        expect(subject.totalTimeout).to.equal(2000)
        expect(subject.maxRetries).to.equal(1)
        expect(subject.failOnClusterChange).to.be.true()
        expect(subject.durableDelete).to.be.true()
      })
    })
  })

  describe('QueryPolicy', function () {
    describe('new QueryPolicy', function () {
      it('sets the policy values from a value object', function () {
        const subject = new Aerospike.QueryPolicy({
          socketTimeout: 1000,
          totalTimeout: 2000,
          maxRetries: 1
        })

        expect(subject.socketTimeout).to.equal(1000)
        expect(subject.totalTimeout).to.equal(2000)
        expect(subject.maxRetries).to.equal(1)
      })
    })
  })
})
