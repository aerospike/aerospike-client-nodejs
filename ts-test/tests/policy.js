// *****************************************************************************
// Copyright 2013-2024 Aerospike, Inc.
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
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-env mocha */
/* global expect */
/* eslint-disable no-unused-expressions */
var aerospike_1 = require("aerospike");
var chai_1 = require("chai");
var BasePolicy = aerospike_1.default.BasePolicy;
require('./test_helper');
context('Client Policies #noserver', function () {
    describe('BasePolicy', function () {
        describe('new BasePolicy', function () {
            it('sets the policy values from a value object', function () {
                var subject = new BasePolicy({
                    socketTimeout: 200,
                    totalTimeout: 0,
                    maxRetries: 2,
                    compress: true
                });
                (0, chai_1.expect)(subject.socketTimeout).to.equal(200);
                (0, chai_1.expect)(subject.totalTimeout).to.equal(0);
                (0, chai_1.expect)(subject.maxRetries).to.equal(2);
                (0, chai_1.expect)(subject.compress).to.be.true;
            });
        });
    });
    describe('ApplyPolicy', function () {
        describe('new ApplyPolicy', function () {
            it('sets the policy values from a value object', function () {
                var subject = new aerospike_1.default.ApplyPolicy({
                    socketTimeout: 1000,
                    totalTimeout: 2000,
                    maxRetries: 1,
                    key: aerospike_1.default.policy.key.SEND,
                    commitLevel: aerospike_1.default.policy.commitLevel.MASTER,
                    ttl: 3600,
                    durableDelete: true,
                    onLockingOnly: true
                });
                (0, chai_1.expect)(subject.socketTimeout).to.equal(1000);
                (0, chai_1.expect)(subject.totalTimeout).to.equal(2000);
                (0, chai_1.expect)(subject.maxRetries).to.equal(1);
                (0, chai_1.expect)(subject.key).to.equal(aerospike_1.default.policy.key.SEND);
                (0, chai_1.expect)(subject.commitLevel).to.equal(aerospike_1.default.policy.commitLevel.MASTER);
                (0, chai_1.expect)(subject.ttl).to.equal(3600);
                (0, chai_1.expect)(subject.durableDelete).to.be.true;
                (0, chai_1.expect)(subject.onLockingOnly).to.be.true;
            });
        });
    });
    describe('WritePolicy', function () {
        describe('new WritePolicy', function () {
            it('sets the policy values from a value object', function () {
                var subject = new aerospike_1.default.WritePolicy({
                    socketTimeout: 1000,
                    totalTimeout: 2000,
                    maxRetries: 1,
                    compressionThreshold: 500,
                    key: aerospike_1.default.policy.key.SEND,
                    gen: aerospike_1.default.policy.gen.EQ,
                    exists: aerospike_1.default.policy.exists.CREATE,
                    commitLevel: aerospike_1.default.policy.commitLevel.MASTER,
                    durableDelete: true,
                    onLockingOnly: true
                });
                (0, chai_1.expect)(subject.socketTimeout).to.equal(1000);
                (0, chai_1.expect)(subject.totalTimeout).to.equal(2000);
                (0, chai_1.expect)(subject.maxRetries).to.equal(1);
                (0, chai_1.expect)(subject.compressionThreshold).to.equal(500);
                (0, chai_1.expect)(subject.key).to.equal(aerospike_1.default.policy.key.SEND);
                (0, chai_1.expect)(subject.gen).to.equal(aerospike_1.default.policy.gen.EQ);
                (0, chai_1.expect)(subject.exists).to.equal(aerospike_1.default.policy.exists.CREATE);
                (0, chai_1.expect)(subject.commitLevel).to.equal(aerospike_1.default.policy.commitLevel.MASTER);
                (0, chai_1.expect)(subject.durableDelete).to.be.true;
                (0, chai_1.expect)(subject.onLockingOnly).to.be.true;
            });
        });
    });
    describe('ReadPolicy', function () {
        describe('new ReadPolicy', function () {
            it('sets the policy values from a value object', function () {
                var subject = new aerospike_1.default.ReadPolicy({
                    socketTimeout: 1000,
                    totalTimeout: 2000,
                    maxRetries: 1,
                    key: aerospike_1.default.policy.key.SEND,
                    replica: aerospike_1.default.policy.replica.MASTER,
                    readModeAP: aerospike_1.default.policy.readModeAP.ONE,
                    readModeSC: aerospike_1.default.policy.readModeSC.SESSION,
                });
                (0, chai_1.expect)(subject.socketTimeout).to.equal(1000);
                (0, chai_1.expect)(subject.totalTimeout).to.equal(2000);
                (0, chai_1.expect)(subject.maxRetries).to.equal(1);
                (0, chai_1.expect)(subject.key).to.equal(aerospike_1.default.policy.key.SEND);
                (0, chai_1.expect)(subject.replica).to.equal(aerospike_1.default.policy.replica.MASTER);
                (0, chai_1.expect)(subject.readModeAP).to.equal(aerospike_1.default.policy.readModeAP.ONE);
                (0, chai_1.expect)(subject.readModeSC).to.equal(aerospike_1.default.policy.readModeSC.SESSION);
            });
        });
    });
    describe('BatchPolicy', function () {
        describe('new BatchPolicy', function () {
            it('sets the policy values from a value object', function () {
                var subject = new aerospike_1.default.BatchPolicy({
                    socketTimeout: 1000,
                    totalTimeout: 2000,
                    maxRetries: 1,
                    readModeAP: aerospike_1.default.policy.readModeAP.ONE,
                    readModeSC: aerospike_1.default.policy.readModeSC.SESSION,
                    allowInline: false,
                    sendSetName: true
                });
                (0, chai_1.expect)(subject.socketTimeout).to.equal(1000);
                (0, chai_1.expect)(subject.totalTimeout).to.equal(2000);
                (0, chai_1.expect)(subject.maxRetries).to.equal(1);
                (0, chai_1.expect)(subject.readModeAP).to.equal(aerospike_1.default.policy.readModeAP.ONE);
                (0, chai_1.expect)(subject.readModeSC).to.equal(aerospike_1.default.policy.readModeSC.SESSION);
                (0, chai_1.expect)(subject.allowInline).to.be.false;
                (0, chai_1.expect)(subject.sendSetName).to.be.true;
            });
        });
    });
    describe('InfoPolicy', function () {
        describe('new InfoPolicy', function () {
            it('sets the policy values from a value object', function () {
                var subject = new aerospike_1.default.InfoPolicy({
                    timeout: 1000,
                    sendAsIs: true,
                    checkBounds: false
                });
                (0, chai_1.expect)(subject.timeout).to.equal(1000);
                (0, chai_1.expect)(subject.sendAsIs).to.be.true;
                (0, chai_1.expect)(subject.checkBounds).to.be.false;
            });
        });
    });
    describe('RemovePolicy', function () {
        describe('new RemovePolicy', function () {
            it('sets the policy values from a value object', function () {
                var subject = new aerospike_1.default.RemovePolicy({
                    socketTimeout: 1000,
                    totalTimeout: 2000,
                    maxRetries: 1,
                    generation: 1234,
                    key: aerospike_1.default.policy.key.SEND,
                    gen: aerospike_1.default.policy.gen.EQ,
                    commitLevel: aerospike_1.default.policy.commitLevel.MASTER,
                    durableDelete: true
                });
                (0, chai_1.expect)(subject.socketTimeout).to.equal(1000);
                (0, chai_1.expect)(subject.totalTimeout).to.equal(2000);
                (0, chai_1.expect)(subject.maxRetries).to.equal(1);
                (0, chai_1.expect)(subject.generation).to.equal(1234);
                (0, chai_1.expect)(subject.key).to.equal(aerospike_1.default.policy.key.SEND);
                (0, chai_1.expect)(subject.gen).to.equal(aerospike_1.default.policy.gen.EQ);
                (0, chai_1.expect)(subject.commitLevel).to.equal(aerospike_1.default.policy.commitLevel.MASTER);
                (0, chai_1.expect)(subject.durableDelete).to.be.true;
            });
        });
    });
    describe('OperatePolicy', function () {
        describe('new OperatePolicy', function () {
            it('sets the policy values from a value object', function () {
                var subject = new aerospike_1.default.OperatePolicy({
                    socketTimeout: 1000,
                    totalTimeout: 2000,
                    maxRetries: 1,
                    key: aerospike_1.default.policy.key.SEND,
                    gen: aerospike_1.default.policy.gen.EQ,
                    replica: aerospike_1.default.policy.replica.MASTER,
                    readModeAP: aerospike_1.default.policy.readModeAP.ONE,
                    readModeSC: aerospike_1.default.policy.readModeSC.SESSION,
                    commitLevel: aerospike_1.default.policy.commitLevel.MASTER,
                    durableDelete: true
                });
                (0, chai_1.expect)(subject.socketTimeout).to.equal(1000);
                (0, chai_1.expect)(subject.totalTimeout).to.equal(2000);
                (0, chai_1.expect)(subject.maxRetries).to.equal(1);
                (0, chai_1.expect)(subject.key).to.equal(aerospike_1.default.policy.key.SEND);
                (0, chai_1.expect)(subject.gen).to.equal(aerospike_1.default.policy.gen.EQ);
                (0, chai_1.expect)(subject.replica).to.equal(aerospike_1.default.policy.replica.MASTER);
                (0, chai_1.expect)(subject.readModeAP).to.equal(aerospike_1.default.policy.readModeAP.ONE);
                (0, chai_1.expect)(subject.readModeSC).to.equal(aerospike_1.default.policy.readModeSC.SESSION);
                (0, chai_1.expect)(subject.commitLevel).to.equal(aerospike_1.default.policy.commitLevel.MASTER);
                (0, chai_1.expect)(subject.durableDelete).to.be.true;
            });
        });
    });
    describe('ScanPolicy', function () {
        describe('new ScanPolicy', function () {
            it('sets the policy values from a value object', function () {
                var subject = new aerospike_1.default.ScanPolicy({
                    socketTimeout: 1000,
                    totalTimeout: 2000,
                    maxRetries: 1,
                    durableDelete: true,
                    recordsPerSecond: 100
                });
                (0, chai_1.expect)(subject.socketTimeout).to.equal(1000);
                (0, chai_1.expect)(subject.totalTimeout).to.equal(2000);
                (0, chai_1.expect)(subject.maxRetries).to.equal(1);
                (0, chai_1.expect)(subject.durableDelete).to.be.true;
                (0, chai_1.expect)(subject.recordsPerSecond).to.equal(100);
            });
        });
    });
    describe('QueryPolicy', function () {
        describe('new QueryPolicy', function () {
            it('sets the policy values from a value object', function () {
                var subject = new aerospike_1.default.QueryPolicy({
                    socketTimeout: 1000,
                    totalTimeout: 2000,
                    maxRetries: 1,
                    failOnClusterChange: true,
                    infoTimeout: 5000
                });
                (0, chai_1.expect)(subject.socketTimeout).to.equal(1000);
                (0, chai_1.expect)(subject.totalTimeout).to.equal(2000);
                (0, chai_1.expect)(subject.maxRetries).to.equal(1);
                (0, chai_1.expect)(subject.failOnClusterChange).to.equal(true);
                (0, chai_1.expect)(subject.infoTimeout).to.equal(5000);
            });
        });
    });
    describe('BatchWritePolicy', function () {
        describe('new BatchWritePolicy', function () {
            it('sets the policy values from a value object', function () {
                var subject = new aerospike_1.default.BatchWritePolicy({
                    commitLevel: aerospike_1.default.policy.commitLevel.MASTER,
                    durableDelete: true,
                    exists: aerospike_1.default.policy.exists.CREATE_OR_REPLACE,
                    filterExpression: aerospike_1.exp.eq(aerospike_1.exp.binInt('i'), aerospike_1.exp.int(37)),
                    gen: aerospike_1.default.policy.gen.EQ,
                    key: aerospike_1.default.policy.key.SEND,
                    ttl: 2048,
                    onLockingOnly: true
                });
                (0, chai_1.expect)(subject.commitLevel).to.equal(aerospike_1.default.policy.commitLevel.MASTER);
                (0, chai_1.expect)(subject.durableDelete).to.equal(true);
                (0, chai_1.expect)(subject.exists).to.equal(aerospike_1.default.policy.exists.CREATE_OR_REPLACE);
                (0, chai_1.expect)(subject.filterExpression).to.eql(aerospike_1.exp.eq(aerospike_1.exp.binInt('i'), aerospike_1.exp.int(37)));
                (0, chai_1.expect)(subject.gen).to.equal(aerospike_1.default.policy.gen.EQ);
                (0, chai_1.expect)(subject.key).to.equal(aerospike_1.default.policy.key.SEND);
                (0, chai_1.expect)(subject.ttl).to.equal(2048);
                (0, chai_1.expect)(subject.onLockingOnly).to.be.true;
            });
        });
    });
    describe('BatchApplyPolicy', function () {
        describe('new BatchApplyPolicy', function () {
            it('sets the policy values from a value object', function () {
                var subject = new aerospike_1.default.BatchApplyPolicy({
                    commitLevel: aerospike_1.default.policy.commitLevel.MASTER,
                    durableDelete: true,
                    filterExpression: aerospike_1.exp.eq(aerospike_1.exp.binInt('i'), aerospike_1.exp.int(37)),
                    key: aerospike_1.default.policy.key.SEND,
                    ttl: 2048,
                    onLockingOnly: true
                });
                (0, chai_1.expect)(subject.commitLevel).to.equal(aerospike_1.default.policy.commitLevel.MASTER);
                (0, chai_1.expect)(subject.durableDelete).to.be.true;
                (0, chai_1.expect)(subject.filterExpression).to.eql(aerospike_1.exp.eq(aerospike_1.exp.binInt('i'), aerospike_1.exp.int(37)));
                (0, chai_1.expect)(subject.key).to.equal(aerospike_1.default.policy.key.SEND);
                (0, chai_1.expect)(subject.ttl).to.equal(2048);
                (0, chai_1.expect)(subject.onLockingOnly).to.be.true;
            });
        });
    });
});
