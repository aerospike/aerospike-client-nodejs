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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-env mocha */
/* global expect */
var aerospike_1 = require("aerospike");
var chai_1 = require("chai");
var Docker = require('dockerode');
var docker = new Docker();
var helper = require("./test_helper");
describe('Metrics node close test', function () {
    return __awaiter(this, void 0, void 0, function () {
        function emptyListener() {
        }
        function emptyNodeListener(node) {
        }
        function emptyClusterListener(cluster) {
        }
        function enableListener() {
            return;
        }
        function snapshotListener(cluster) {
            return;
        }
        function testNodeIsPopulated(node) {
            var tempNode = node;
            (0, chai_1.expect)(node.name).to.be.a("string");
            (0, chai_1.expect)(node.address).to.be.a("string");
            (0, chai_1.expect)(node.port).to.be.a("number");
            var conns = node.conns;
            (0, chai_1.expect)(node.conns.inUse).to.be.a("number");
            (0, chai_1.expect)(node.conns.inPool).to.be.a("number");
            (0, chai_1.expect)(node.conns.opened).to.be.a("number");
            (0, chai_1.expect)(node.conns.closed).to.be.a("number");
            // Check NamespaceMetrics
            var metrics = node.metrics;
            for (var _i = 0, _a = node.metrics; _i < _a.length; _i++) {
                var metrics_1 = _a[_i];
                var latencyBuckets = [
                    metrics_1.connLatency,
                    metrics_1.writeLatency,
                    metrics_1.readLatency,
                    metrics_1.batchLatency,
                    metrics_1.queryLatency
                ];
                for (var _b = 0, latencyBuckets_1 = latencyBuckets; _b < latencyBuckets_1.length; _b++) {
                    var buckets = latencyBuckets_1[_b];
                    (0, chai_1.expect)(buckets).to.be.an("array").with.lengthOf(7);
                    for (var _c = 0, buckets_1 = buckets; _c < buckets_1.length; _c++) {
                        var bucket = buckets_1[_c];
                        (0, chai_1.expect)(bucket).to.be.a("number");
                    }
                }
                (0, chai_1.expect)(metrics_1.ns).to.be.a("string");
                (0, chai_1.expect)(metrics_1.bytesIn).to.be.a("number");
                (0, chai_1.expect)(metrics_1.bytesOut).to.be.a("number");
                (0, chai_1.expect)(metrics_1.errorCount).to.be.a("number");
                (0, chai_1.expect)(metrics_1.timeoutCount).to.be.a("number");
                (0, chai_1.expect)(metrics_1.keyBusyCount).to.be.a("number");
            }
        }
        function nodeCloseListener(node) {
            testNodeIsPopulated(node);
            nodeCloseTriggered = true;
            console.log("Node close callback was called!");
            return;
        }
        function disableListener(cluster) {
            return;
        }
        var client, nodeCloseTriggered;
        return __generator(this, function (_a) {
            helper.skipUnlessAdvancedMetrics(this);
            client = helper.client;
            nodeCloseTriggered = false;
            context('postive tests', function () {
                return __awaiter(this, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        context('metricsPolicy', function () {
                            return __awaiter(this, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    context('nodeCloseListener', function () {
                                        it('Test the node close listener', function () {
                                            return __awaiter(this, void 0, void 0, function () {
                                                var containers, _i, containers_1, info, container_1, SERVER_PORT_NUMBER, container, config, dummyClient, listeners, policy, elapsed_secs;
                                                return __generator(this, function (_a) {
                                                    switch (_a.label) {
                                                        case 0:
                                                            console.log("Closing other containers...");
                                                            return [4 /*yield*/, docker.listContainers({ all: true })];
                                                        case 1:
                                                            containers = _a.sent();
                                                            _i = 0, containers_1 = containers;
                                                            _a.label = 2;
                                                        case 2:
                                                            if (!(_i < containers_1.length)) return [3 /*break*/, 7];
                                                            info = containers_1[_i];
                                                            container_1 = docker.getContainer(info.Id);
                                                            if (!(info.State === 'running')) return [3 /*break*/, 4];
                                                            return [4 /*yield*/, container_1.stop()];
                                                        case 3:
                                                            _a.sent();
                                                            _a.label = 4;
                                                        case 4: return [4 /*yield*/, container_1.remove({ force: true })];
                                                        case 5:
                                                            _a.sent();
                                                            _a.label = 6;
                                                        case 6:
                                                            _i++;
                                                            return [3 /*break*/, 2];
                                                        case 7: return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 2000); })];
                                                        case 8:
                                                            _a.sent();
                                                            console.log("Running server container...");
                                                            SERVER_PORT_NUMBER = 3000;
                                                            return [4 /*yield*/, docker.createContainer({
                                                                    Image: 'aerospike/aerospike-server',
                                                                    HostConfig: {
                                                                        NetworkMode: "host",
                                                                        PortBindings: {
                                                                            "3000/tcp": [{ HostPort: SERVER_PORT_NUMBER.toString() }]
                                                                        }
                                                                    }
                                                                })];
                                                        case 9:
                                                            container = _a.sent();
                                                            return [4 /*yield*/, container.start()];
                                                        case 10:
                                                            _a.sent();
                                                            console.log("Waiting for server to initialize...");
                                                            return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 15000); })];
                                                        case 11:
                                                            _a.sent();
                                                            config = {
                                                                hosts: 'localhost:3000',
                                                            };
                                                            console.log("Connecting to Aerospike");
                                                            return [4 /*yield*/, aerospike_1.default.connect(config)];
                                                        case 12:
                                                            dummyClient = _a.sent();
                                                            console.log("Waiting for client to collect all information about cluster nodes...");
                                                            return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 15000); })];
                                                        case 13:
                                                            _a.sent();
                                                            listeners = new aerospike_1.default.MetricsListeners({
                                                                enableListener: enableListener,
                                                                disableListener: disableListener,
                                                                nodeCloseListener: nodeCloseListener,
                                                                snapshotListener: snapshotListener
                                                            });
                                                            policy = new aerospike_1.MetricsPolicy({
                                                                metricsListeners: listeners,
                                                                interval: 1
                                                            });
                                                            console.log("Enabling metrics...");
                                                            return [4 /*yield*/, dummyClient.enableMetrics(policy)];
                                                        case 14:
                                                            _a.sent();
                                                            return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 3000); })];
                                                        case 15:
                                                            _a.sent();
                                                            console.log("Closing node...");
                                                            return [4 /*yield*/, container.stop()];
                                                        case 16:
                                                            _a.sent();
                                                            return [4 /*yield*/, container.remove()];
                                                        case 17:
                                                            _a.sent();
                                                            console.log("Giving client time to run the node_close listener...");
                                                            elapsed_secs = 0;
                                                            _a.label = 18;
                                                        case 18:
                                                            if (!(elapsed_secs < 25)) return [3 /*break*/, 23];
                                                            if (!nodeCloseTriggered) return [3 /*break*/, 21];
                                                            console.log("node_close_called is true. Passed");
                                                            return [4 /*yield*/, dummyClient.disableMetrics()];
                                                        case 19:
                                                            _a.sent();
                                                            return [4 /*yield*/, dummyClient.close()];
                                                        case 20: return [2 /*return*/, _a.sent()];
                                                        case 21:
                                                            elapsed_secs++;
                                                            console.log("polling");
                                                            return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 1000); })];
                                                        case 22:
                                                            _a.sent();
                                                            return [3 /*break*/, 18];
                                                        case 23:
                                                            console.log("THIS FAILED");
                                                            return [4 /*yield*/, dummyClient.close()];
                                                        case 24:
                                                            _a.sent();
                                                            chai_1.assert.fail('nodeCloseListener was not called');
                                                            return [2 /*return*/];
                                                    }
                                                });
                                            });
                                        });
                                    });
                                    return [2 /*return*/];
                                });
                            });
                        });
                        return [2 /*return*/];
                    });
                });
            });
            return [2 /*return*/];
        });
    });
});
