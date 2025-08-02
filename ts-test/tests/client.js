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
/* global context, expect, describe, it */
/* eslint-disable no-unused-expressions */
var aerospike_1 = require("aerospike");
var chai_1 = require("chai");
var helper = require("./test_helper");
var keygen = helper.keygen;
var Client = aerospike_1.default.Client;
var Context = aerospike_1.default.cdt.Context;
describe('Client', function () {
    describe('#connect', function () {
        it('return self', function () {
            var client = new Client(helper.config);
            return client.connect()
                .then(function (client2) {
                (0, chai_1.expect)(client2).to.equal(client);
                client.close();
            });
        });
        it('should call the callback asynchronously', function (done) {
            var client = new Client(helper.config);
            var async = false;
            client.connect(function (error) {
                if (error)
                    throw error;
                (0, chai_1.expect)(async).to.be.true;
                client.close(false);
                done();
            });
            async = true;
        });
        it('should return a Promise if callback without callback', function () {
            var client = new Client(helper.config);
            var promise = client.connect();
            (0, chai_1.expect)(promise).to.be.instanceof(Promise);
            return promise.then(function () { return client.close(false); });
        });
    });
    describe('#close', function () {
        it('should be a no-op if close is called after connection error #noserver', function (done) {
            var client = new Client({ hosts: '127.0.0.1:0' });
            client.connect(function (error) {
                (0, chai_1.expect)(error === null || error === void 0 ? void 0 : error.message).to.match(/Failed to connect/);
                client.close(false);
                done();
            });
        });
        it('should be possible to call close multiple times', function (done) {
            var client = new Client(helper.config);
            client.connect(function (error) {
                (0, chai_1.expect)(error).to.be.null;
                client.close(false);
                client.close(false);
                done();
            });
        });
        /*
        it('should allow exit when all clients are closed', async function () {
          const test: Function = async function (Aero: typeof Aerospike, config: ConfigOptions) {
            Object.assign(config, { log: { level: Aerospike.log.OFF } })
            const client: Cli = await Aero.connect(config)
            client.close()
    
            await new Promise<void>((resolve, reject) => {
              // beforeExit signals that the process would exit
              process.on('beforeExit', resolve)
    
              setTimeout(() => {
                reject('Process did not exit within 100ms') // eslint-disable-line
              }, 100).unref()
            })
          }
    
          await helper.runInNewProcess(test, helper.config)
        })
        */
    });
    describe('#isConnected', function () {
        context('without tender health check', function () {
            it('returns false if the client is not connected', function () {
                var client = new Client(helper.config);
                (0, chai_1.expect)(client.isConnected(false)).to.be.false;
            });
            it('returns true if the client is connected', function (done) {
                var client = new Client(helper.config);
                client.connect(function () {
                    (0, chai_1.expect)(client.isConnected(false)).to.be.true;
                    client.close(false);
                    done();
                });
            });
            it('returns false after the connection is closed', function (done) {
                var client = new Client(helper.config);
                client.connect(function () {
                    client.close(false);
                    (0, chai_1.expect)(client.isConnected(false)).to.be.false;
                    done();
                });
            });
        });
        context('with tender health check', function () {
            it("calls the Aerospike C client library's isConnected() method", function (done) {
                var client = new Client(helper.config);
                var orig = client.as_client.isConnected;
                client.connect(function () {
                    var tenderHealthCheck = false;
                    client.as_client.isConnected = function () { tenderHealthCheck = true; return false; };
                    (0, chai_1.expect)(client.isConnected(true)).to.be.false;
                    (0, chai_1.expect)(tenderHealthCheck).to.be.true;
                    client.as_client.isConnected = orig;
                    client.close(false);
                    done();
                });
            });
        });
    });
    describe('Client#getNodes', function () {
        var client = helper.client;
        it('returns a list of cluster nodes', function () {
            var nodes = client.getNodes();
            (0, chai_1.expect)(nodes).to.be.an('array');
            (0, chai_1.expect)(nodes.length).to.be.greaterThan(0);
            nodes.forEach(function (node) {
                (0, chai_1.expect)(node.name).to.match(/^[0-9A-F]+$/);
                (0, chai_1.expect)(node.address).to.be.a('string');
            });
        });
    });
    describe('Client#contextToBase64', function () {
        var client = helper.client;
        var context = new Context().addMapKey('nested');
        it('Serializes a CDT context', function () {
            (0, chai_1.expect)(typeof client.contextToBase64(context)).to.equal('string');
        });
        /*
        it('Throws an error if no context is given', function () {
          expect(() => { client.contextToBase64() }).to.throw(Error)
        })
        it('Throws an error if a non-object is given', function () {
          expect(() => { client.contextToBase64('test') }).to.throw(Error)
        })
        */
    });
    describe('Client#contextFromBase64', function () {
        var client = helper.client;
        var addListIndex = new Context().addListIndex(5);
        var addListIndexCreate = new Context().addListIndexCreate(45, aerospike_1.default.lists.order.ORDERED, true);
        var addListRank = new Context().addListRank(15);
        var addListValueString = new Context().addListValue('apple');
        var addListValueInt = new Context().addListValue(4500);
        var addMapIndex = new Context().addMapIndex(10);
        var addMapRank = new Context().addMapRank(11);
        var addMapKey = new Context().addMapKey('nested');
        var addMapKeyCreate = new Context().addMapKeyCreate('nested', aerospike_1.default.maps.order.KEY_ORDERED);
        var addMapValueString = new Context().addMapValue('nested');
        var addMapValueInt = new Context().addMapValue(1000);
        it('Deserializes a cdt context with addListIndex', function () {
            (0, chai_1.expect)(client.contextFromBase64(client.contextToBase64(addListIndex))).to.eql(addListIndex);
        });
        it('Deserializes a cdt context with addListIndexCreate', function () {
            (0, chai_1.expect)(client.contextFromBase64(client.contextToBase64(addListIndexCreate))).to.eql(addListIndexCreate);
        });
        it('Deserializes a cdt context with addListRank', function () {
            (0, chai_1.expect)(client.contextFromBase64(client.contextToBase64(addListRank))).to.eql(addListRank);
        });
        it('Deserializes a cdt context with addListValueString', function () {
            (0, chai_1.expect)(client.contextFromBase64(client.contextToBase64(addListValueString))).to.eql(addListValueString);
        });
        it('Deserializes a cdt context with addListValueInt', function () {
            (0, chai_1.expect)(client.contextFromBase64(client.contextToBase64(addListValueInt))).to.eql(addListValueInt);
        });
        it('Deserializes a cdt context with addMapIndex', function () {
            (0, chai_1.expect)(client.contextFromBase64(client.contextToBase64(addMapIndex))).to.eql(addMapIndex);
        });
        it('Deserializes a cdt context with addMapRank', function () {
            (0, chai_1.expect)(client.contextFromBase64(client.contextToBase64(addMapRank))).to.eql(addMapRank);
        });
        it('Deserializes a cdt context with addMapKey', function () {
            (0, chai_1.expect)(client.contextFromBase64(client.contextToBase64(addMapKey))).to.eql(addMapKey);
        });
        it('Deserializes a cdt context with addMapKeyCreate', function () {
            (0, chai_1.expect)(client.contextFromBase64(client.contextToBase64(addMapKeyCreate))).to.eql(addMapKeyCreate);
        });
        it('Deserializes a cdt context with addMapValueString', function () {
            (0, chai_1.expect)(client.contextFromBase64(client.contextToBase64(addMapValueString))).to.eql(addMapValueString);
        });
        it('Deserializes a cdt context with addMapValueInt', function () {
            (0, chai_1.expect)(client.contextFromBase64(client.contextToBase64(addMapValueInt))).to.eql(addMapValueInt);
        });
        /*
        it('Throws an error if no value is given', function () {
          expect(() => { client.contextFromBase64() }).to.throw(Error)
        })
        it('Throws an error if an non-string value is given', function () {
          expect(() => { client.contextFromBase64(45) }).to.throw(Error)
        })
        */
    });
    context.skip('cluster name', function () {
        it('should fail to connect to the cluster if the cluster name does not match', function (done) {
            var config = Object.assign({}, helper.config);
            config.clusterName = 'notAValidClusterName';
            var client = new Client(config);
            client.connect(function (err) {
                (0, chai_1.expect)(err === null || err === void 0 ? void 0 : err.code).to.eq(aerospike_1.default.status.ERR_CLIENT);
                client.close(false);
                done();
            });
        });
    });
    describe('Events', function () {
        it('client should emit nodeAdded events when connecting', function (done) {
            var client = new Client(helper.config);
            client.once('nodeAdded', function (event) {
                client.close();
                done();
            });
            client.connect();
        });
        it('client should emit events on cluster state changes', function (done) {
            var client = new Client(helper.config);
            client.once('event', function (event) {
                (0, chai_1.expect)(event.name).to.equal('nodeAdded');
                client.close();
                done();
            });
            client.connect();
        });
    });
    context('callbacks', function () {
        // Execute a client command on a client instance that has been setup to
        // trigger an error; check that the error callback occurs asynchronously,
        // i.e. only after the command function has returned.
        // The get command is used for the test but the same behavior should apply
        // to all client commands.
        function assertErrorCbAsync(client, errorCb, done) {
            var checkpoints = [];
            var checkAssertions = function (checkpoint) {
                checkpoints.push(checkpoint);
                if (checkpoints.length !== 2)
                    return;
                (0, chai_1.expect)(checkpoints).to.eql(['after', 'callback']);
                if (client === null || client === void 0 ? void 0 : client.isConnected())
                    client === null || client === void 0 ? void 0 : client.close(false);
                done();
            };
            var key = keygen.string(helper.namespace, helper.set)();
            client === null || client === void 0 ? void 0 : client.get(key, function (err, _record) {
                errorCb === null || errorCb === void 0 ? void 0 : errorCb(err);
                checkAssertions('callback');
            });
            checkAssertions('after');
        }
        it('callback is asynchronous in case of an client error #noserver', function (done) {
            // trying to send a command to a client that is not connected will trigger a client error
            var client = aerospike_1.default.client();
            var errorCheck = function (err) {
                (0, chai_1.expect)(err).to.be.instanceof(Error);
                (0, chai_1.expect)(err.message).to.equal('Not connected.');
            };
            assertErrorCbAsync(client, errorCheck, done);
        });
        it('callback is asynchronous in case of an I/O error', function (done) {
            // maxConnsPerNode = 0 will trigger an error in the C client when trying to send a command
            var config = Object.assign({ maxConnsPerNode: 0 }, helper.config);
            aerospike_1.default.connect(config, function (err, client) {
                if (err)
                    throw err;
                var errorCheck = function (err) {
                    (0, chai_1.expect)(err).to.be.instanceof(Error);
                    (0, chai_1.expect)(err.code).to.equal(aerospike_1.default.status.ERR_NO_MORE_CONNECTIONS);
                };
                assertErrorCbAsync(client, errorCheck, done);
            });
        });
    });
    describe('#captureStackTraces', function () {
        it('should capture stack traces that show the command being called', function (done) {
            var client = helper.client;
            var key = keygen.string(helper.namespace, helper.set)();
            var orig = client.captureStackTraces;
            client.captureStackTraces = true;
            client.get(key, function (err) {
                (0, chai_1.expect)(err === null || err === void 0 ? void 0 : err.stack).to.match(/Client.get/);
                client.captureStackTraces = orig;
                done();
            });
        });
    });
});
