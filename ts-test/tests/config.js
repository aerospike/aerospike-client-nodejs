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
/* global beforeEach, afterEach, expect, describe, it */
/* eslint-disable no-unused-expressions */
var aerospike_1 = require("aerospike");
var chai_1 = require("chai");
var Config = aerospike_1.default.Config;
describe('Config #noserver', function () {
    var asHostsEnv;
    beforeEach(function () {
        asHostsEnv = process.env.AEROSPIKE_HOSTS;
        delete process.env.AEROSPIKE_HOSTS;
    });
    afterEach(function () {
        delete process.env.AEROSPIKE_HOSTS;
        if (asHostsEnv) {
            process.env.AEROSPIKE_HOSTS = asHostsEnv;
        }
    });
    describe('new Config', function () {
        it('copies config values from the passed Object', function () {
            var settings = {
                authMode: aerospike_1.default.auth.EXTERNAL_INSECURE,
                clusterName: 'testCluster',
                connTimeoutMs: 1000,
                hosts: [{ addr: 'localhost', port: 3000 }],
                log: { level: 1, file: 2 },
                loginTimeoutMs: 2000,
                maxConnsPerNode: 200,
                maxSocketIdle: 30,
                minConnsPerNode: 10,
                maxErrorRate: 100,
                errorRateWindow: 1,
                modlua: { userPath: '/user/path' },
                password: 'sekret',
                port: 3333,
                appId: "ForeverSoup",
                policies: {
                    apply: new aerospike_1.default.ApplyPolicy({ totalTimeout: 1000 }),
                    batch: new aerospike_1.default.BatchPolicy({ totalTimeout: 1000 }),
                    batchParentWrite: new aerospike_1.default.BatchPolicy({ totalTimeout: 1000 }),
                    batchWrite: new aerospike_1.default.BatchWritePolicy({ exists: aerospike_1.default.policy.exists.CREATE_OR_REPLACE }),
                    info: new aerospike_1.default.InfoPolicy({ timeout: 1000 }),
                    operate: new aerospike_1.default.OperatePolicy({ totalTimeout: 1000 }),
                    query: new aerospike_1.default.QueryPolicy({ totalTimeout: 1000 }),
                    read: new aerospike_1.default.ReadPolicy({ totalTimeout: 1000 }),
                    remove: new aerospike_1.default.RemovePolicy({ totalTimeout: 1000 }),
                    scan: new aerospike_1.default.ScanPolicy({ totalTimeout: 1000 }),
                    txnRoll: new aerospike_1.default.BatchPolicy({ totalTimeout: 1000 }),
                    txnVerify: new aerospike_1.default.BatchPolicy({ totalTimeout: 1000 }),
                    write: new aerospike_1.default.WritePolicy({ totalTimeout: 1000 })
                },
                rackAware: true,
                rackId: 42,
                sharedMemory: { key: 1234 },
                tenderInterval: 1000,
                tls: { enable: true },
                user: 'admin'
            };
            var config = new Config(settings);
            (0, chai_1.expect)(config).to.have.property('authMode');
            (0, chai_1.expect)(config).to.have.property('appId');
            (0, chai_1.expect)(config).to.have.property('clusterName');
            (0, chai_1.expect)(config).to.have.property('connTimeoutMs');
            (0, chai_1.expect)(config).to.have.property('maxErrorRate');
            (0, chai_1.expect)(config).to.have.property('errorRateWindow');
            (0, chai_1.expect)(config).to.have.property('hosts');
            (0, chai_1.expect)(config).to.have.property('log');
            (0, chai_1.expect)(config).to.have.property('loginTimeoutMs');
            (0, chai_1.expect)(config).to.have.property('maxConnsPerNode');
            (0, chai_1.expect)(config).to.have.property('maxSocketIdle');
            (0, chai_1.expect)(config).to.have.property('minConnsPerNode');
            (0, chai_1.expect)(config).to.have.property('modlua');
            (0, chai_1.expect)(config).to.have.property('password');
            (0, chai_1.expect)(config).to.have.property('policies');
            (0, chai_1.expect)(config).to.have.property('port');
            (0, chai_1.expect)(config).to.have.property('rackAware');
            (0, chai_1.expect)(config).to.have.property('rackId');
            (0, chai_1.expect)(config).to.have.property('sharedMemory');
            (0, chai_1.expect)(config).to.have.property('tenderInterval');
            (0, chai_1.expect)(config).to.have.property('tls');
            (0, chai_1.expect)(config).to.have.property('user');
            var policies = config.policies;
            (0, chai_1.expect)(policies.apply).to.be.instanceof(aerospike_1.default.ApplyPolicy);
            (0, chai_1.expect)(policies.batch).to.be.instanceof(aerospike_1.default.BatchPolicy);
            (0, chai_1.expect)(policies.batchWrite).to.be.instanceof(aerospike_1.default.BatchWritePolicy);
            (0, chai_1.expect)(policies.batchParentWrite).to.be.instanceof(aerospike_1.default.BatchPolicy);
            (0, chai_1.expect)(policies.info).to.be.instanceof(aerospike_1.default.InfoPolicy);
            (0, chai_1.expect)(policies.operate).to.be.instanceof(aerospike_1.default.OperatePolicy);
            (0, chai_1.expect)(policies.query).to.be.instanceof(aerospike_1.default.QueryPolicy);
            (0, chai_1.expect)(policies.read).to.be.instanceof(aerospike_1.default.ReadPolicy);
            (0, chai_1.expect)(policies.remove).to.be.instanceof(aerospike_1.default.RemovePolicy);
            (0, chai_1.expect)(policies.scan).to.be.instanceof(aerospike_1.default.ScanPolicy);
            (0, chai_1.expect)(policies.write).to.be.instanceof(aerospike_1.default.WritePolicy);
            (0, chai_1.expect)(policies.txnRoll).to.be.instanceof(aerospike_1.default.BatchPolicy);
            (0, chai_1.expect)(policies.txnVerify).to.be.instanceof(aerospike_1.default.BatchPolicy);
        });
        it('initializes default policies', function () {
            var settings = {
                policies: {
                    apply: { totalTimeout: 1000 },
                    batch: { totalTimeout: 1000 },
                    batchParentWrite: { totalTimeout: 1000 },
                    batchWrite: { exists: aerospike_1.default.policy.exists.CREATE_OR_REPLACE },
                    info: { timeout: 1000 },
                    operate: { totalTimeout: 1000 },
                    query: { totalTimeout: 1000 },
                    read: { totalTimeout: 1000 },
                    remove: { totalTimeout: 1000 },
                    scan: { totalTimeout: 1000 },
                    txnRoll: { totalTimeout: 1000 },
                    txnVerify: { totalTimeout: 1000 },
                    write: { totalTimeout: 1000 }
                }
            };
            var config = new Config(settings);
            (0, chai_1.expect)(config.policies.apply).to.be.instanceof(aerospike_1.default.ApplyPolicy);
            (0, chai_1.expect)(config.policies.batch).to.be.instanceof(aerospike_1.default.BatchPolicy);
            (0, chai_1.expect)(config.policies.batchWrite).to.be.instanceof(aerospike_1.default.BatchWritePolicy);
            (0, chai_1.expect)(config.policies.batchParentWrite).to.be.instanceof(aerospike_1.default.BatchPolicy);
            (0, chai_1.expect)(config.policies.info).to.be.instanceof(aerospike_1.default.InfoPolicy);
            (0, chai_1.expect)(config.policies.operate).to.be.instanceof(aerospike_1.default.OperatePolicy);
            (0, chai_1.expect)(config.policies.query).to.be.instanceof(aerospike_1.default.QueryPolicy);
            (0, chai_1.expect)(config.policies.read).to.be.instanceof(aerospike_1.default.ReadPolicy);
            (0, chai_1.expect)(config.policies.remove).to.be.instanceof(aerospike_1.default.RemovePolicy);
            (0, chai_1.expect)(config.policies.scan).to.be.instanceof(aerospike_1.default.ScanPolicy);
            (0, chai_1.expect)(config.policies.txnRoll).to.be.instanceof(aerospike_1.default.BatchPolicy);
            (0, chai_1.expect)(config.policies.txnVerify).to.be.instanceof(aerospike_1.default.BatchPolicy);
            (0, chai_1.expect)(config.policies.write).to.be.instanceof(aerospike_1.default.WritePolicy);
        });
        /*
        it('ignores invalid config properties', function () {
          const obj = {
            log: './debug.log',
            policies: 1000,
            connTimeoutMs: 1.5,
            tenderInterval: '1000',
            user: { name: 'admin' },
            password: 12345,
            sharedMemory: true,
            rackId: 'myRack'
          }
          const config = new Config(obj)
          expect(config).to.not.have.property('log')
          expect(config).to.not.have.property('connTimeoutMs')
          expect(config).to.not.have.property('tenderInterval')
          expect(config).to.not.have.property('user')
          expect(config).to.not.have.property('password')
          expect(config).to.not.have.property('sharedMemory')
          expect(config).to.not.have.property('rackId')
          expect(config.policies).to.be.empty
        })
    
        it('throws a TypeError if invalid policy values are passed', function () {
          const settings = {
            policies: {
              timeout: 1000,
              totalTimeout: 1000
            }
          }
          expect(() => new Config(settings)).to.throw(TypeError)
        })
        */
        it('reads hosts from AEROSPIKE_HOSTS if not specified', function () {
            process.env.AEROSPIKE_HOSTS = 'db1:3001';
            var config = new Config();
            (0, chai_1.expect)(config.hosts).to.eql('db1:3001');
        });
        it('defaults to "localhost:3000"', function () {
            var config = new Config();
            (0, chai_1.expect)(config.hosts).to.eql('localhost:3000');
        });
        it('defaults to the specified default port number', function () {
            var config = new Config({
                port: 3333
            });
            (0, chai_1.expect)(config.hosts).to.eql('localhost:3333');
        });
    });
});
