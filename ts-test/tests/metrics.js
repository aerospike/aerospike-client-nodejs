// *****************************************************************************
// Copyright 2013-2025 Aerospike, Inc.
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
/**
 * NODE CLOSE IMPLEMENT ELSEWHERE
 *
 * Add delays to negative testing
 *
 */
var aerospike_1 = require("aerospike");
var exec = require('child_process').exec;
var util = require('util');
var execAsync = util.promisify(exec);
var chai_1 = require("chai");
var helper = require("./test_helper");
describe('Metrics tests', function () {
    this.timeout(40000);
    var client = helper.client;
    helper.skipUnlessAdvancedMetrics(this);
    var blank_policy = new aerospike_1.default.MetricsPolicy();
    var enableTriggered = false;
    var disableTriggered = false;
    var snapshotTriggered = false;
    var metricsLogFolder = '.';
    function enableListener() {
        enableTriggered = true;
        return;
    }
    function snapshotListener(cluster) {
        snapshotTriggered = true;
        return;
    }
    function disableListener(cluster) {
        disableTriggered = true;
        return;
    }
    function emptyListener() {
    }
    function emptyNodeListener(node) {
    }
    function emptyClusterListener(cluster) {
    }
    function enable_throw_exc() {
        throw new Error("enable threw an error");
    }
    function disable_throw_exc(Cluster) {
        throw new Error("disable threw an error");
    }
    var clusterFromDisableListener = null;
    var clusterFromSnapshotListener = null;
    function snapshotSaveListener(cluster) {
        clusterFromSnapshotListener = cluster;
        return;
    }
    function disableSaveListener(cluster) {
        clusterFromDisableListener = cluster;
        return;
    }
    context('Positive Tests', function () {
        context('MetricsPolicy', function () {
            context('enableListner', function () {
                it('Ensures custom listener is called', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var listeners, policy;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    listeners = new aerospike_1.default.MetricsListeners({
                                        enableListener: enableListener,
                                        disableListener: emptyClusterListener,
                                        nodeCloseListener: emptyNodeListener,
                                        snapshotListener: emptyClusterListener
                                    });
                                    policy = new aerospike_1.MetricsPolicy({
                                        metricsListeners: listeners,
                                    });
                                    return [4 /*yield*/, client.enableMetrics(policy)
                                        //await new Promise(r => setTimeout(r, 3000));
                                    ];
                                case 1:
                                    _a.sent();
                                    //await new Promise(r => setTimeout(r, 3000));
                                    return [4 /*yield*/, client.disableMetrics()];
                                case 2:
                                    //await new Promise(r => setTimeout(r, 3000));
                                    _a.sent();
                                    return [2 /*return*/];
                            }
                        });
                    });
                });
            });
            context('nodeCloseListener', function () {
                it('fails when non-function is given', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var listeners, policy, error_1;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    listeners = new aerospike_1.default.MetricsListeners({
                                        enableListener: emptyListener,
                                        snapshotListener: emptyClusterListener,
                                        disableListener: emptyClusterListener,
                                        nodeCloseListener: 10,
                                    });
                                    policy = new aerospike_1.MetricsPolicy({
                                        metricsListeners: listeners,
                                    });
                                    _a.label = 1;
                                case 1:
                                    _a.trys.push([1, 3, , 4]);
                                    return [4 /*yield*/, client.enableMetrics(policy)];
                                case 2:
                                    _a.sent();
                                    chai_1.assert.fail("AN ERROR SHOULD HAVE BEEN CAUGHT");
                                    return [3 /*break*/, 4];
                                case 3:
                                    error_1 = _a.sent();
                                    (0, chai_1.expect)(error_1.message).to.eql("nodeCloseListener must be a function");
                                    (0, chai_1.expect)(error_1 instanceof TypeError).to.eql(true);
                                    return [3 /*break*/, 4];
                                case 4: return [4 /*yield*/, client.disableMetrics()];
                                case 5:
                                    _a.sent();
                                    return [2 /*return*/];
                            }
                        });
                    });
                });
            });
            context('snapshotListener', function () {
                it('Ensures custom listener is called', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var listeners, policy;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    listeners = new aerospike_1.default.MetricsListeners({
                                        enableListener: emptyListener,
                                        disableListener: emptyClusterListener,
                                        nodeCloseListener: emptyNodeListener,
                                        snapshotListener: snapshotListener
                                    });
                                    policy = new aerospike_1.MetricsPolicy({
                                        metricsListeners: listeners,
                                    });
                                    return [4 /*yield*/, client.enableMetrics(policy)];
                                case 1:
                                    _a.sent();
                                    return [4 /*yield*/, client.disableMetrics()];
                                case 2:
                                    _a.sent();
                                    return [2 /*return*/];
                            }
                        });
                    });
                });
            });
            context('disableListener', function () {
                it('Ensures custom listener is called', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var listeners, policy;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    listeners = new aerospike_1.default.MetricsListeners({
                                        enableListener: emptyListener,
                                        disableListener: disableListener,
                                        nodeCloseListener: emptyNodeListener,
                                        snapshotListener: emptyClusterListener
                                    });
                                    policy = new aerospike_1.MetricsPolicy({
                                        metricsListeners: listeners,
                                    });
                                    return [4 /*yield*/, client.enableMetrics(policy)];
                                case 1:
                                    _a.sent();
                                    return [4 /*yield*/, client.disableMetrics()];
                                case 2:
                                    _a.sent();
                                    return [2 /*return*/];
                            }
                        });
                    });
                });
            });
            context('reportDir', function () {
                it('Writes to a valid sub directory', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var result, policy;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, execAsync('rm -rf metrics_sub_dir/reportDir/metrics-*')];
                                case 1:
                                    _a.sent();
                                    return [4 /*yield*/, execAsync('find metrics_sub_dir/reportDir/ -type f | wc -l')];
                                case 2:
                                    result = _a.sent();
                                    (0, chai_1.expect)(Number(result.stdout.trim())).to.eql(0);
                                    policy = new aerospike_1.MetricsPolicy({
                                        reportDir: './metrics_sub_dir/reportDir',
                                        interval: 1
                                    });
                                    return [4 /*yield*/, client.enableMetrics(policy)];
                                case 3:
                                    _a.sent();
                                    return [4 /*yield*/, client.disableMetrics()];
                                case 4:
                                    _a.sent();
                                    return [4 /*yield*/, execAsync('find metrics_sub_dir/reportDir -type f | wc -l')];
                                case 5:
                                    result = _a.sent();
                                    (0, chai_1.expect)(Number(result.stdout.trim())).to.eql(1);
                                    return [2 /*return*/];
                            }
                        });
                    });
                });
            });
            context('interval', function () {
                it('Default interval is overridden and only one report is written', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var result, policy;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, execAsync('rm -rf metrics_sub_dir/interval/metrics-*')];
                                case 1:
                                    _a.sent();
                                    return [4 /*yield*/, execAsync('find metrics_sub_dir/interval/ -type f | wc -l')];
                                case 2:
                                    result = _a.sent();
                                    (0, chai_1.expect)(Number(result.stdout.trim())).to.eql(0);
                                    policy = new aerospike_1.MetricsPolicy({
                                        reportDir: './metrics_sub_dir/interval',
                                        interval: 1
                                    });
                                    return [4 /*yield*/, client.enableMetrics(policy)];
                                case 3:
                                    _a.sent();
                                    return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 3000); })];
                                case 4:
                                    _a.sent();
                                    return [4 /*yield*/, client.disableMetrics()];
                                case 5:
                                    _a.sent();
                                    return [4 /*yield*/, execAsync('cat metrics_sub_dir/interval/metrics-2* | wc -l')];
                                case 6:
                                    result = _a.sent();
                                    (0, chai_1.expect)(Number(result.stdout.trim())).to.be.greaterThan(3);
                                    return [2 /*return*/];
                            }
                        });
                    });
                });
            });
            context('reportSizeLimit', function () {
                it('Accepts a valid reportSizeLimit', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var result, policy;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, execAsync('rm -rf metrics_sub_dir/reportSizeLimit/metrics-*')];
                                case 1:
                                    _a.sent();
                                    return [4 /*yield*/, execAsync('find metrics_sub_dir/reportSizeLimit/ -type f | wc -l')];
                                case 2:
                                    result = _a.sent();
                                    (0, chai_1.expect)(Number(result.stdout.trim())).to.eql(0);
                                    policy = new aerospike_1.MetricsPolicy({
                                        reportDir: './metrics_sub_dir/reportSizeLimit',
                                        reportSizeLimit: 1000002
                                    });
                                    return [4 /*yield*/, client.enableMetrics(policy)];
                                case 3:
                                    _a.sent();
                                    return [4 /*yield*/, client.disableMetrics()];
                                case 4:
                                    _a.sent();
                                    return [2 /*return*/];
                            }
                        });
                    });
                });
            });
            context('latencyColumns', function () {
                it('Ensures correct column value in metrics file header', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var result, policy;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, execAsync('rm -rf metrics_sub_dir/latencyColumns/metrics-*')];
                                case 1:
                                    _a.sent();
                                    return [4 /*yield*/, execAsync('find metrics_sub_dir/latencyColumns/ -type f | wc -l')];
                                case 2:
                                    result = _a.sent();
                                    (0, chai_1.expect)(Number(result.stdout.trim())).to.eql(0);
                                    policy = new aerospike_1.MetricsPolicy({
                                        reportDir: './metrics_sub_dir/latencyColumns',
                                        latencyColumns: 11
                                    });
                                    return [4 /*yield*/, client.enableMetrics(policy)];
                                case 3:
                                    _a.sent();
                                    return [4 /*yield*/, client.disableMetrics()];
                                case 4:
                                    _a.sent();
                                    return [4 /*yield*/, execAsync('cat metrics_sub_dir/latencyColumns/metrics-2*')];
                                case 5:
                                    result = _a.sent();
                                    (0, chai_1.expect)(result.stdout.trim().split("latency(")[1].split(")")[0]).to.eql("11,1");
                                    return [2 /*return*/];
                            }
                        });
                    });
                });
            });
            context('latencyShift', function () {
                it('Ensures correct shift value in metrics file header', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var result, policy;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, execAsync('rm -rf metrics_sub_dir/latencyShift/metrics-*')];
                                case 1:
                                    _a.sent();
                                    return [4 /*yield*/, execAsync('find metrics_sub_dir/latencyShift/ -type f | wc -l')];
                                case 2:
                                    result = _a.sent();
                                    (0, chai_1.expect)(Number(result.stdout.trim())).to.eql(0);
                                    policy = new aerospike_1.MetricsPolicy({
                                        reportDir: './metrics_sub_dir/latencyShift',
                                        latencyShift: 3
                                    });
                                    return [4 /*yield*/, client.enableMetrics(policy)];
                                case 3:
                                    _a.sent();
                                    return [4 /*yield*/, client.disableMetrics()];
                                case 4:
                                    _a.sent();
                                    return [4 /*yield*/, execAsync('cat metrics_sub_dir/latencyShift/metrics-2*')];
                                case 5:
                                    result = _a.sent();
                                    (0, chai_1.expect)(result.stdout.trim().split("latency(")[1].split(")")[0]).to.eql("7,3");
                                    return [2 /*return*/];
                            }
                        });
                    });
                });
            });
            context('labels', function () {
                it('Ensures correct labels in metrics file first report', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var result, policy, token, concat_string;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, execAsync('rm -rf metrics_sub_dir/labels/metrics-*')];
                                case 1:
                                    _a.sent();
                                    return [4 /*yield*/, execAsync('find metrics_sub_dir/labels/ -type f | wc -l')];
                                case 2:
                                    result = _a.sent();
                                    (0, chai_1.expect)(Number(result.stdout.trim())).to.eql(0);
                                    policy = new aerospike_1.MetricsPolicy({
                                        reportDir: './metrics_sub_dir/labels',
                                        labels: {
                                            "size": "large",
                                            "discount": "normal"
                                        }
                                    });
                                    return [4 /*yield*/, client.enableMetrics(policy)];
                                case 3:
                                    _a.sent();
                                    return [4 /*yield*/, client.disableMetrics()];
                                case 4:
                                    _a.sent();
                                    return [4 /*yield*/, execAsync('cat metrics_sub_dir/labels/metrics-2*')];
                                case 5:
                                    result = _a.sent();
                                    token = result.stdout.trim().split("\n")[1].split(",");
                                    concat_string = token[4] + token[5] + token[6] + token[7];
                                    (0, chai_1.expect)(concat_string).to.eql("[[sizelarge][discountnormal]]");
                                    return [2 /*return*/];
                            }
                        });
                    });
                });
            });
        });
        context('cluster', function () {
            context('appId', function () {
                it('Ensures appId is correct', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var config, listeners, policy, dummyClient, _i, _a, cluster;
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0:
                                    config = {
                                        hosts: helper.config.hosts,
                                        user: helper.config.user,
                                        password: helper.config.password,
                                        appId: 'destiny'
                                    };
                                    listeners = new aerospike_1.default.MetricsListeners({
                                        enableListener: emptyListener,
                                        disableListener: disableSaveListener,
                                        nodeCloseListener: emptyNodeListener,
                                        snapshotListener: snapshotSaveListener
                                    });
                                    policy = new aerospike_1.MetricsPolicy({
                                        metricsListeners: listeners,
                                        interval: 1,
                                    });
                                    dummyClient = null;
                                    return [4 /*yield*/, aerospike_1.default.connect(config)];
                                case 1:
                                    dummyClient = _b.sent();
                                    return [4 /*yield*/, dummyClient.enableMetrics(policy)];
                                case 2:
                                    _b.sent();
                                    return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 1500); })];
                                case 3:
                                    _b.sent();
                                    return [4 /*yield*/, dummyClient.disableMetrics()];
                                case 4:
                                    _b.sent();
                                    return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 0); })];
                                case 5:
                                    _b.sent();
                                    for (_i = 0, _a = [clusterFromSnapshotListener, clusterFromDisableListener]; _i < _a.length; _i++) {
                                        cluster = _a[_i];
                                        (0, chai_1.expect)(cluster.appId).to.eql('destiny');
                                    }
                                    return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 3000); })];
                                case 6:
                                    _b.sent();
                                    return [4 /*yield*/, dummyClient.close()];
                                case 7:
                                    _b.sent();
                                    return [2 /*return*/];
                            }
                        });
                    });
                });
            });
            context('clusterName', function () {
                it('Ensures clusterName is correct', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var config, listeners, policy, dummyClient, _i, _a, cluster;
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0:
                                    config = {
                                        hosts: helper.config.hosts,
                                        user: helper.config.user,
                                        password: helper.config.password
                                    };
                                    listeners = new aerospike_1.default.MetricsListeners({
                                        enableListener: emptyListener,
                                        disableListener: disableSaveListener,
                                        nodeCloseListener: emptyNodeListener,
                                        snapshotListener: snapshotSaveListener
                                    });
                                    policy = new aerospike_1.MetricsPolicy({
                                        metricsListeners: listeners,
                                        interval: 1,
                                    });
                                    dummyClient = null;
                                    return [4 /*yield*/, aerospike_1.default.connect(config)];
                                case 1:
                                    dummyClient = _b.sent();
                                    return [4 /*yield*/, dummyClient.enableMetrics(policy)];
                                case 2:
                                    _b.sent();
                                    return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 1500); })];
                                case 3:
                                    _b.sent();
                                    return [4 /*yield*/, dummyClient.disableMetrics()];
                                case 4:
                                    _b.sent();
                                    return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 0); })];
                                case 5:
                                    _b.sent();
                                    for (_i = 0, _a = [clusterFromSnapshotListener, clusterFromDisableListener]; _i < _a.length; _i++) {
                                        cluster = _a[_i];
                                        (0, chai_1.expect)(cluster.clusterName).to.eql('');
                                    }
                                    return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 3000); })];
                                case 6:
                                    _b.sent();
                                    return [4 /*yield*/, dummyClient.close()];
                                case 7:
                                    _b.sent();
                                    return [2 /*return*/];
                            }
                        });
                    });
                });
            });
            context('commandCount', function () {
                it('Ensures commandCount is correct', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var config, listeners, policy, _i, _a, cluster;
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0:
                                    config = {
                                        hosts: helper.config.hosts,
                                        user: helper.config.user,
                                        password: helper.config.password
                                    };
                                    listeners = new aerospike_1.default.MetricsListeners({
                                        enableListener: emptyListener,
                                        disableListener: disableSaveListener,
                                        nodeCloseListener: emptyNodeListener,
                                        snapshotListener: snapshotSaveListener
                                    });
                                    policy = new aerospike_1.MetricsPolicy({
                                        metricsListeners: listeners,
                                        interval: 1,
                                    });
                                    return [4 /*yield*/, client.enableMetrics(policy)];
                                case 1:
                                    _b.sent();
                                    return [4 /*yield*/, client.put(new aerospike_1.default.Key(helper.namespace, helper.set, 'metrics/31'), { a: 1 })];
                                case 2:
                                    _b.sent();
                                    return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 1500); })];
                                case 3:
                                    _b.sent();
                                    return [4 /*yield*/, client.disableMetrics()];
                                case 4:
                                    _b.sent();
                                    return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 0); })];
                                case 5:
                                    _b.sent();
                                    for (_i = 0, _a = [clusterFromSnapshotListener, clusterFromDisableListener]; _i < _a.length; _i++) {
                                        cluster = _a[_i];
                                        (0, chai_1.expect)(cluster.commandCount).to.be.greaterThan(0);
                                    }
                                    return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 3000); })];
                                case 6:
                                    _b.sent();
                                    return [2 /*return*/];
                            }
                        });
                    });
                });
            });
            context('invalidNodeCount', function () {
                it('Ensures invalidNodeCount is correct', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var temp, config, listeners, policy, _i, _a, cluster;
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0:
                                    temp = [helper.config.hosts[0]];
                                    temp.push({ addr: '0.0.0.0', port: 3100 });
                                    config = {
                                        hosts: temp,
                                        user: helper.config.user,
                                        password: helper.config.password
                                    };
                                    listeners = new aerospike_1.default.MetricsListeners({
                                        enableListener: emptyListener,
                                        disableListener: disableSaveListener,
                                        nodeCloseListener: emptyNodeListener,
                                        snapshotListener: snapshotSaveListener
                                    });
                                    policy = new aerospike_1.MetricsPolicy({
                                        metricsListeners: listeners,
                                        interval: 1,
                                    });
                                    return [4 /*yield*/, client.enableMetrics(policy)];
                                case 1:
                                    _b.sent();
                                    return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 1500); })];
                                case 2:
                                    _b.sent();
                                    return [4 /*yield*/, client.disableMetrics()];
                                case 3:
                                    _b.sent();
                                    return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 0); })];
                                case 4:
                                    _b.sent();
                                    for (_i = 0, _a = [clusterFromSnapshotListener, clusterFromDisableListener]; _i < _a.length; _i++) {
                                        cluster = _a[_i];
                                        (0, chai_1.expect)(cluster.invalidNodeCount).to.eql(0);
                                    }
                                    return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 3000); })];
                                case 5:
                                    _b.sent();
                                    return [2 /*return*/];
                            }
                        });
                    });
                });
            });
            context('transactionCount', function () {
                it('Ensures transactionCount is correct', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var config, listeners, policy, dummyClient, _i, _a, cluster;
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0:
                                    config = {
                                        hosts: helper.config.hosts,
                                        user: helper.config.user,
                                        password: helper.config.password
                                    };
                                    listeners = new aerospike_1.default.MetricsListeners({
                                        enableListener: emptyListener,
                                        disableListener: disableSaveListener,
                                        nodeCloseListener: emptyNodeListener,
                                        snapshotListener: snapshotSaveListener
                                    });
                                    policy = new aerospike_1.MetricsPolicy({
                                        metricsListeners: listeners,
                                        interval: 1,
                                    });
                                    dummyClient = null;
                                    return [4 /*yield*/, aerospike_1.default.connect(config)];
                                case 1:
                                    dummyClient = _b.sent();
                                    return [4 /*yield*/, dummyClient.enableMetrics(policy)];
                                case 2:
                                    _b.sent();
                                    return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 1500); })];
                                case 3:
                                    _b.sent();
                                    return [4 /*yield*/, dummyClient.put(new aerospike_1.default.Key(helper.namespace, helper.set, 'metrics/31'), { a: 1 })];
                                case 4:
                                    _b.sent();
                                    return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 1500); })];
                                case 5:
                                    _b.sent();
                                    return [4 /*yield*/, dummyClient.disableMetrics()];
                                case 6:
                                    _b.sent();
                                    return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 0); })];
                                case 7:
                                    _b.sent();
                                    for (_i = 0, _a = [clusterFromSnapshotListener, clusterFromDisableListener]; _i < _a.length; _i++) {
                                        cluster = _a[_i];
                                        (0, chai_1.expect)(cluster.transactionCount).to.be.greaterThan(0);
                                    }
                                    return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 3000); })];
                                case 8:
                                    _b.sent();
                                    return [4 /*yield*/, dummyClient.close()];
                                case 9:
                                    _b.sent();
                                    return [2 /*return*/];
                            }
                        });
                    });
                });
            });
            context('delayQueueTimeoutCount', function () {
                it('Ensures delayQueueTimeout is correct', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var config, listeners, policy, dummyClient, _i, _a, cluster;
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0:
                                    config = {
                                        hosts: helper.config.hosts,
                                        user: helper.config.user,
                                        password: helper.config.password
                                    };
                                    listeners = new aerospike_1.default.MetricsListeners({
                                        enableListener: emptyListener,
                                        disableListener: disableSaveListener,
                                        nodeCloseListener: emptyNodeListener,
                                        snapshotListener: snapshotSaveListener
                                    });
                                    policy = new aerospike_1.MetricsPolicy({
                                        metricsListeners: listeners,
                                        interval: 1,
                                    });
                                    dummyClient = null;
                                    return [4 /*yield*/, aerospike_1.default.connect(config)];
                                case 1:
                                    dummyClient = _b.sent();
                                    return [4 /*yield*/, dummyClient.enableMetrics(policy)];
                                case 2:
                                    _b.sent();
                                    return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 1500); })];
                                case 3:
                                    _b.sent();
                                    return [4 /*yield*/, client.put(new aerospike_1.default.Key(helper.namespace, helper.set, 'metrics/31'), { a: 1 })];
                                case 4:
                                    _b.sent();
                                    return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 1500); })];
                                case 5:
                                    _b.sent();
                                    return [4 /*yield*/, dummyClient.disableMetrics()];
                                case 6:
                                    _b.sent();
                                    return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 0); })];
                                case 7:
                                    _b.sent();
                                    for (_i = 0, _a = [clusterFromSnapshotListener, clusterFromDisableListener]; _i < _a.length; _i++) {
                                        cluster = _a[_i];
                                        (0, chai_1.expect)(cluster.delayQueueTimeoutCount).to.eql(0);
                                    }
                                    return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 3000); })];
                                case 8:
                                    _b.sent();
                                    return [4 /*yield*/, dummyClient.close()];
                                case 9:
                                    _b.sent();
                                    return [2 /*return*/];
                            }
                        });
                    });
                });
            });
            context('retryCount', function () {
                it('Ensures retryCount is correct', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var config, listeners, policy, dummyClient, readPolicy, error_2, _i, _a, cluster;
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0:
                                    config = {
                                        hosts: helper.config.hosts,
                                        user: helper.config.user,
                                        password: helper.config.password
                                    };
                                    listeners = new aerospike_1.default.MetricsListeners({
                                        enableListener: emptyListener,
                                        disableListener: disableSaveListener,
                                        nodeCloseListener: emptyNodeListener,
                                        snapshotListener: snapshotSaveListener
                                    });
                                    policy = new aerospike_1.MetricsPolicy({
                                        metricsListeners: listeners,
                                        interval: 1,
                                    });
                                    dummyClient = null;
                                    return [4 /*yield*/, aerospike_1.default.connect(config)];
                                case 1:
                                    dummyClient = _b.sent();
                                    return [4 /*yield*/, dummyClient.enableMetrics(policy)];
                                case 2:
                                    _b.sent();
                                    return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 1500); })];
                                case 3:
                                    _b.sent();
                                    readPolicy = new aerospike_1.default.ReadPolicy({
                                        maxRetries: 6
                                    });
                                    _b.label = 4;
                                case 4:
                                    _b.trys.push([4, 6, , 7]);
                                    return [4 /*yield*/, dummyClient.get(new aerospike_1.default.Key(helper.namespace, helper.set, 'metrics/51'), readPolicy)];
                                case 5:
                                    _b.sent();
                                    return [3 /*break*/, 7];
                                case 6:
                                    error_2 = _b.sent();
                                    return [3 /*break*/, 7];
                                case 7: return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 1500); })];
                                case 8:
                                    _b.sent();
                                    return [4 /*yield*/, dummyClient.disableMetrics()];
                                case 9:
                                    _b.sent();
                                    return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 0); })];
                                case 10:
                                    _b.sent();
                                    for (_i = 0, _a = [clusterFromSnapshotListener, clusterFromDisableListener]; _i < _a.length; _i++) {
                                        cluster = _a[_i];
                                        (0, chai_1.expect)(cluster.retryCount).to.eql(0);
                                    }
                                    return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 3000); })];
                                case 11:
                                    _b.sent();
                                    return [4 /*yield*/, dummyClient.close()];
                                case 12:
                                    _b.sent();
                                    return [2 /*return*/];
                            }
                        });
                    });
                });
            });
            context('delayQueueTimeoutCount', function () {
                it('Ensures delayQueueTimeout is correct', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var config, listeners, policy, dummyClient, _i, _a, cluster;
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0:
                                    config = {
                                        hosts: helper.config.hosts,
                                        user: helper.config.user,
                                        password: helper.config.password
                                    };
                                    listeners = new aerospike_1.default.MetricsListeners({
                                        enableListener: emptyListener,
                                        disableListener: disableSaveListener,
                                        nodeCloseListener: emptyNodeListener,
                                        snapshotListener: snapshotSaveListener
                                    });
                                    policy = new aerospike_1.MetricsPolicy({
                                        metricsListeners: listeners,
                                        interval: 1,
                                    });
                                    dummyClient = null;
                                    return [4 /*yield*/, aerospike_1.default.connect(config)];
                                case 1:
                                    dummyClient = _b.sent();
                                    return [4 /*yield*/, dummyClient.enableMetrics(policy)];
                                case 2:
                                    _b.sent();
                                    return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 1500); })];
                                case 3:
                                    _b.sent();
                                    return [4 /*yield*/, client.put(new aerospike_1.default.Key(helper.namespace, helper.set, 'metrics/31'), { a: 1 })];
                                case 4:
                                    _b.sent();
                                    return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 1500); })];
                                case 5:
                                    _b.sent();
                                    return [4 /*yield*/, dummyClient.disableMetrics()];
                                case 6:
                                    _b.sent();
                                    return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 0); })];
                                case 7:
                                    _b.sent();
                                    for (_i = 0, _a = [clusterFromSnapshotListener, clusterFromDisableListener]; _i < _a.length; _i++) {
                                        cluster = _a[_i];
                                        (0, chai_1.expect)(cluster.delayQueueTimeoutCount).to.eql(0);
                                    }
                                    return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 3000); })];
                                case 8:
                                    _b.sent();
                                    return [4 /*yield*/, dummyClient.close()];
                                case 9:
                                    _b.sent();
                                    return [2 /*return*/];
                            }
                        });
                    });
                });
            });
            context('eventLoop', function () {
                it('Ensures delayQueueTimeout is correct', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var config, listeners, policy, dummyClient, _i, _a, cluster;
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0:
                                    config = {
                                        hosts: helper.config.hosts,
                                        user: helper.config.user,
                                        password: helper.config.password
                                    };
                                    listeners = new aerospike_1.default.MetricsListeners({
                                        enableListener: emptyListener,
                                        disableListener: disableSaveListener,
                                        nodeCloseListener: emptyNodeListener,
                                        snapshotListener: snapshotSaveListener
                                    });
                                    policy = new aerospike_1.MetricsPolicy({
                                        metricsListeners: listeners,
                                        interval: 1,
                                    });
                                    dummyClient = null;
                                    return [4 /*yield*/, aerospike_1.default.connect(config)];
                                case 1:
                                    dummyClient = _b.sent();
                                    return [4 /*yield*/, dummyClient.enableMetrics(policy)];
                                case 2:
                                    _b.sent();
                                    return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 1500); })];
                                case 3:
                                    _b.sent();
                                    return [4 /*yield*/, client.put(new aerospike_1.default.Key(helper.namespace, helper.set, 'metrics/31'), { a: 1 })];
                                case 4:
                                    _b.sent();
                                    return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 1500); })];
                                case 5:
                                    _b.sent();
                                    return [4 /*yield*/, dummyClient.disableMetrics()];
                                case 6:
                                    _b.sent();
                                    return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 0); })];
                                case 7:
                                    _b.sent();
                                    for (_i = 0, _a = [clusterFromSnapshotListener, clusterFromDisableListener]; _i < _a.length; _i++) {
                                        cluster = _a[_i];
                                        (0, chai_1.expect)(cluster.eventLoop.queueSize).to.eql(0);
                                        (0, chai_1.expect)(cluster.eventLoop.processSize).to.eql(0);
                                    }
                                    return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 3000); })];
                                case 8:
                                    _b.sent();
                                    return [4 /*yield*/, dummyClient.close()];
                                case 9:
                                    _b.sent();
                                    return [2 /*return*/];
                            }
                        });
                    });
                });
            });
            context('nodes', function () {
                context('name', function () {
                    it('Ensures name is correct', function () {
                        return __awaiter(this, void 0, void 0, function () {
                            var config, listeners, policy, dummyClient, _i, _a, cluster, _b, _c, node;
                            return __generator(this, function (_d) {
                                switch (_d.label) {
                                    case 0:
                                        console.log(helper.config.hosts);
                                        config = {
                                            hosts: helper.config.hosts,
                                            user: helper.config.user,
                                            password: helper.config.password
                                        };
                                        listeners = new aerospike_1.default.MetricsListeners({
                                            enableListener: emptyListener,
                                            disableListener: disableSaveListener,
                                            nodeCloseListener: emptyNodeListener,
                                            snapshotListener: snapshotSaveListener
                                        });
                                        policy = new aerospike_1.MetricsPolicy({
                                            metricsListeners: listeners,
                                            interval: 1,
                                        });
                                        dummyClient = null;
                                        return [4 /*yield*/, aerospike_1.default.connect(config)];
                                    case 1:
                                        dummyClient = _d.sent();
                                        return [4 /*yield*/, dummyClient.enableMetrics(policy)];
                                    case 2:
                                        _d.sent();
                                        return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 1500); })];
                                    case 3:
                                        _d.sent();
                                        return [4 /*yield*/, client.put(new aerospike_1.default.Key(helper.namespace, helper.set, 'metrics/31'), { a: 1 })];
                                    case 4:
                                        _d.sent();
                                        return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 1500); })];
                                    case 5:
                                        _d.sent();
                                        return [4 /*yield*/, dummyClient.disableMetrics()];
                                    case 6:
                                        _d.sent();
                                        return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 0); })];
                                    case 7:
                                        _d.sent();
                                        for (_i = 0, _a = [clusterFromSnapshotListener, clusterFromDisableListener]; _i < _a.length; _i++) {
                                            cluster = _a[_i];
                                            console.log(cluster);
                                            for (_b = 0, _c = cluster.nodes; _b < _c.length; _b++) {
                                                node = _c[_b];
                                                console.log(node);
                                                (0, chai_1.expect)(node.name).to.eql('A1');
                                            }
                                        }
                                        return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 3000); })];
                                    case 8:
                                        _d.sent();
                                        return [4 /*yield*/, dummyClient.close()];
                                    case 9:
                                        _d.sent();
                                        return [2 /*return*/];
                                }
                            });
                        });
                    });
                });
                context('address', function () {
                    it('Ensures address is correct', function () {
                        return __awaiter(this, void 0, void 0, function () {
                            var config, listeners, policy, dummyClient, _i, _a, cluster, _b, _c, node;
                            return __generator(this, function (_d) {
                                switch (_d.label) {
                                    case 0:
                                        config = {
                                            hosts: helper.config.hosts,
                                            user: helper.config.user,
                                            password: helper.config.password
                                        };
                                        listeners = new aerospike_1.default.MetricsListeners({
                                            enableListener: emptyListener,
                                            disableListener: disableSaveListener,
                                            nodeCloseListener: emptyNodeListener,
                                            snapshotListener: snapshotSaveListener
                                        });
                                        policy = new aerospike_1.MetricsPolicy({
                                            metricsListeners: listeners,
                                            interval: 1,
                                        });
                                        dummyClient = null;
                                        return [4 /*yield*/, aerospike_1.default.connect(config)];
                                    case 1:
                                        dummyClient = _d.sent();
                                        return [4 /*yield*/, dummyClient.enableMetrics(policy)];
                                    case 2:
                                        _d.sent();
                                        return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 1500); })];
                                    case 3:
                                        _d.sent();
                                        return [4 /*yield*/, client.put(new aerospike_1.default.Key(helper.namespace, helper.set, 'metrics/31'), { a: 1 })];
                                    case 4:
                                        _d.sent();
                                        return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 1500); })];
                                    case 5:
                                        _d.sent();
                                        return [4 /*yield*/, dummyClient.disableMetrics()];
                                    case 6:
                                        _d.sent();
                                        return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 0); })];
                                    case 7:
                                        _d.sent();
                                        for (_i = 0, _a = [clusterFromSnapshotListener, clusterFromDisableListener]; _i < _a.length; _i++) {
                                            cluster = _a[_i];
                                            for (_b = 0, _c = cluster.nodes; _b < _c.length; _b++) {
                                                node = _c[_b];
                                                (0, chai_1.expect)(node.address).to.eql('127.0.0.1');
                                                if (helper.config.hosts[0].addr == 'localhost') {
                                                    (0, chai_1.expect)(node.address).to.eql('127.0.0.1');
                                                }
                                                else {
                                                    (0, chai_1.expect)(node.address).to.eql(helper.config.hosts[0].addr);
                                                }
                                            }
                                        }
                                        return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 3000); })];
                                    case 8:
                                        _d.sent();
                                        return [4 /*yield*/, dummyClient.close()];
                                    case 9:
                                        _d.sent();
                                        return [2 /*return*/];
                                }
                            });
                        });
                    });
                });
                context('port', function () {
                    it('Ensures port is correct', function () {
                        return __awaiter(this, void 0, void 0, function () {
                            var config, listeners, policy, dummyClient, _i, _a, cluster, _b, _c, node;
                            return __generator(this, function (_d) {
                                switch (_d.label) {
                                    case 0:
                                        config = {
                                            hosts: helper.config.hosts,
                                            user: helper.config.user,
                                            password: helper.config.password
                                        };
                                        listeners = new aerospike_1.default.MetricsListeners({
                                            enableListener: emptyListener,
                                            disableListener: disableSaveListener,
                                            nodeCloseListener: emptyNodeListener,
                                            snapshotListener: snapshotSaveListener
                                        });
                                        policy = new aerospike_1.MetricsPolicy({
                                            metricsListeners: listeners,
                                            interval: 1,
                                        });
                                        dummyClient = null;
                                        return [4 /*yield*/, aerospike_1.default.connect(config)];
                                    case 1:
                                        dummyClient = _d.sent();
                                        return [4 /*yield*/, dummyClient.enableMetrics(policy)];
                                    case 2:
                                        _d.sent();
                                        return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 1500); })];
                                    case 3:
                                        _d.sent();
                                        return [4 /*yield*/, client.put(new aerospike_1.default.Key(helper.namespace, helper.set, 'metrics/31'), { a: 1 })];
                                    case 4:
                                        _d.sent();
                                        return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 1500); })];
                                    case 5:
                                        _d.sent();
                                        return [4 /*yield*/, dummyClient.disableMetrics()];
                                    case 6:
                                        _d.sent();
                                        return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 0); })];
                                    case 7:
                                        _d.sent();
                                        for (_i = 0, _a = [clusterFromSnapshotListener, clusterFromDisableListener]; _i < _a.length; _i++) {
                                            cluster = _a[_i];
                                            for (_b = 0, _c = cluster.nodes; _b < _c.length; _b++) {
                                                node = _c[_b];
                                                (0, chai_1.expect)(node.port).to.eql(3000);
                                                (0, chai_1.expect)(node.port).to.eql(helper.config.hosts[0].port);
                                            }
                                        }
                                        return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 3000); })];
                                    case 8:
                                        _d.sent();
                                        return [4 /*yield*/, dummyClient.close()];
                                    case 9:
                                        _d.sent();
                                        return [2 /*return*/];
                                }
                            });
                        });
                    });
                });
                context('conns', function () {
                    it('Ensures conns is correct', function () {
                        return __awaiter(this, void 0, void 0, function () {
                            var config, listeners, policy, dummyClient, _i, _a, cluster, _b, _c, node;
                            return __generator(this, function (_d) {
                                switch (_d.label) {
                                    case 0:
                                        config = {
                                            hosts: helper.config.hosts,
                                            user: helper.config.user,
                                            password: helper.config.password
                                        };
                                        listeners = new aerospike_1.default.MetricsListeners({
                                            enableListener: emptyListener,
                                            disableListener: disableSaveListener,
                                            nodeCloseListener: emptyNodeListener,
                                            snapshotListener: snapshotSaveListener
                                        });
                                        policy = new aerospike_1.MetricsPolicy({
                                            metricsListeners: listeners,
                                            interval: 1,
                                        });
                                        dummyClient = null;
                                        return [4 /*yield*/, aerospike_1.default.connect(config)];
                                    case 1:
                                        dummyClient = _d.sent();
                                        return [4 /*yield*/, dummyClient.enableMetrics(policy)];
                                    case 2:
                                        _d.sent();
                                        return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 1500); })];
                                    case 3:
                                        _d.sent();
                                        return [4 /*yield*/, client.put(new aerospike_1.default.Key(helper.namespace, helper.set, 'metrics/31'), { a: 1 })];
                                    case 4:
                                        _d.sent();
                                        return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 1500); })];
                                    case 5:
                                        _d.sent();
                                        return [4 /*yield*/, dummyClient.disableMetrics()];
                                    case 6:
                                        _d.sent();
                                        return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 0); })];
                                    case 7:
                                        _d.sent();
                                        for (_i = 0, _a = [clusterFromSnapshotListener, clusterFromDisableListener]; _i < _a.length; _i++) {
                                            cluster = _a[_i];
                                            for (_b = 0, _c = cluster.nodes; _b < _c.length; _b++) {
                                                node = _c[_b];
                                                (0, chai_1.expect)(node.conns.inUse).to.be.a('number');
                                                (0, chai_1.expect)(node.conns.inPool).to.be.a('number');
                                                (0, chai_1.expect)(node.conns.opened).to.be.a('number');
                                                (0, chai_1.expect)(node.conns.closed).to.be.a('number');
                                            }
                                        }
                                        return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 3000); })];
                                    case 8:
                                        _d.sent();
                                        return [4 /*yield*/, dummyClient.close()];
                                    case 9:
                                        _d.sent();
                                        return [2 /*return*/];
                                }
                            });
                        });
                    });
                });
            });
        });
        context('namespaceMetrics', function () {
            context('ns', function () {
                it('Ensures namespace is correct', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var stringNotEmpty, listeners, policy, _i, _a, cluster, _b, _c, node, NamespaceMetrics, _d, _e, index;
                        return __generator(this, function (_f) {
                            switch (_f.label) {
                                case 0:
                                    stringNotEmpty = false;
                                    listeners = new aerospike_1.default.MetricsListeners({
                                        enableListener: emptyListener,
                                        disableListener: disableSaveListener,
                                        nodeCloseListener: emptyNodeListener,
                                        snapshotListener: snapshotSaveListener
                                    });
                                    policy = new aerospike_1.MetricsPolicy({
                                        metricsListeners: listeners,
                                        interval: 1,
                                    });
                                    return [4 /*yield*/, client.enableMetrics(policy)];
                                case 1:
                                    _f.sent();
                                    return [4 /*yield*/, client.put(new aerospike_1.default.Key(helper.namespace, helper.set, 'metrics/1'), { a: 1 })];
                                case 2:
                                    _f.sent();
                                    return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 1500); })];
                                case 3:
                                    _f.sent();
                                    return [4 /*yield*/, client.disableMetrics()];
                                case 4:
                                    _f.sent();
                                    return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 0); })];
                                case 5:
                                    _f.sent();
                                    for (_i = 0, _a = [clusterFromSnapshotListener, clusterFromDisableListener]; _i < _a.length; _i++) {
                                        cluster = _a[_i];
                                        for (_b = 0, _c = cluster.nodes; _b < _c.length; _b++) {
                                            node = _c[_b];
                                            NamespaceMetrics = node.metrics;
                                            for (_d = 0, _e = node.metrics; _d < _e.length; _d++) {
                                                index = _e[_d];
                                                (0, chai_1.expect)(index.ns).to.be.a("string");
                                                if (index.ns != '') {
                                                    stringNotEmpty = true;
                                                }
                                            }
                                        }
                                    }
                                    (0, chai_1.expect)(stringNotEmpty).to.eql(true);
                                    clusterFromSnapshotListener = null;
                                    clusterFromDisableListener = null;
                                    return [2 /*return*/];
                            }
                        });
                    });
                });
            });
            context('bytesIn', function () {
                it('Ensures updated bytesIn value is relayed to the user', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var listeners, policy, _i, _a, cluster, _b, _c, node, NamespaceMetrics, _d, _e, index;
                        return __generator(this, function (_f) {
                            switch (_f.label) {
                                case 0:
                                    listeners = new aerospike_1.default.MetricsListeners({
                                        enableListener: emptyListener,
                                        disableListener: disableSaveListener,
                                        nodeCloseListener: emptyNodeListener,
                                        snapshotListener: snapshotSaveListener
                                    });
                                    policy = new aerospike_1.MetricsPolicy({
                                        metricsListeners: listeners,
                                        interval: 1,
                                    });
                                    return [4 /*yield*/, client.enableMetrics(policy)];
                                case 1:
                                    _f.sent();
                                    return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 1500); })];
                                case 2:
                                    _f.sent();
                                    return [4 /*yield*/, client.disableMetrics()];
                                case 3:
                                    _f.sent();
                                    return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 0); })];
                                case 4:
                                    _f.sent();
                                    for (_i = 0, _a = [clusterFromSnapshotListener, clusterFromDisableListener]; _i < _a.length; _i++) {
                                        cluster = _a[_i];
                                        for (_b = 0, _c = cluster.nodes; _b < _c.length; _b++) {
                                            node = _c[_b];
                                            NamespaceMetrics = node.metrics;
                                            for (_d = 0, _e = node.metrics; _d < _e.length; _d++) {
                                                index = _e[_d];
                                                (0, chai_1.expect)(index.bytesIn).to.be.greaterThan(0);
                                            }
                                        }
                                    }
                                    clusterFromSnapshotListener = null;
                                    clusterFromDisableListener = null;
                                    return [2 /*return*/];
                            }
                        });
                    });
                });
            });
            context('bytesOut', function () {
                it('Ensures updated bytesOut value is relayed to the user', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var listeners, policy, _i, _a, cluster, _b, _c, node, NamespaceMetrics, _d, _e, index;
                        return __generator(this, function (_f) {
                            switch (_f.label) {
                                case 0:
                                    listeners = new aerospike_1.default.MetricsListeners({
                                        enableListener: emptyListener,
                                        disableListener: disableSaveListener,
                                        nodeCloseListener: emptyNodeListener,
                                        snapshotListener: snapshotSaveListener
                                    });
                                    policy = new aerospike_1.MetricsPolicy({
                                        metricsListeners: listeners,
                                        interval: 1,
                                    });
                                    return [4 /*yield*/, client.enableMetrics(policy)];
                                case 1:
                                    _f.sent();
                                    return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 1500); })];
                                case 2:
                                    _f.sent();
                                    return [4 /*yield*/, client.disableMetrics()];
                                case 3:
                                    _f.sent();
                                    return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 0); })];
                                case 4:
                                    _f.sent();
                                    for (_i = 0, _a = [clusterFromSnapshotListener, clusterFromDisableListener]; _i < _a.length; _i++) {
                                        cluster = _a[_i];
                                        for (_b = 0, _c = cluster.nodes; _b < _c.length; _b++) {
                                            node = _c[_b];
                                            NamespaceMetrics = node.metrics;
                                            for (_d = 0, _e = node.metrics; _d < _e.length; _d++) {
                                                index = _e[_d];
                                                (0, chai_1.expect)(index.bytesOut).to.be.greaterThan(0);
                                            }
                                        }
                                    }
                                    clusterFromSnapshotListener = null;
                                    clusterFromDisableListener = null;
                                    return [2 /*return*/];
                            }
                        });
                    });
                });
            });
            context('errorCount', function () {
                var totalErrorCount = 0;
                function listenerErrorCount(cluster) {
                    for (var _i = 0, _a = cluster.nodes; _i < _a.length; _i++) {
                        var node = _a[_i];
                        var NamespaceMetrics = node.metrics;
                        for (var _b = 0, NamespaceMetrics_1 = NamespaceMetrics; _b < NamespaceMetrics_1.length; _b++) {
                            var index = NamespaceMetrics_1[_b];
                            totalErrorCount += index.errorCount;
                        }
                    }
                }
                it('Ensures updated errorCount value is relayed to the user', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var listeners, policy, writePolicy, query, stream;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    listeners = new aerospike_1.default.MetricsListeners({
                                        enableListener: emptyListener,
                                        disableListener: listenerErrorCount,
                                        nodeCloseListener: emptyNodeListener,
                                        snapshotListener: listenerErrorCount
                                    });
                                    policy = new aerospike_1.MetricsPolicy({
                                        metricsListeners: listeners,
                                        interval: 1,
                                    });
                                    return [4 /*yield*/, client.enableMetrics(policy)];
                                case 1:
                                    _a.sent();
                                    writePolicy = new aerospike_1.default.policy.WritePolicy({
                                        exists: aerospike_1.default.policy.exists.UPDATE
                                    });
                                    // FINISH HERE!!!!  THIS SHOULDN"T THROW ERROR OUTSIDE BUT IT DOES
                                    return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 3000); })];
                                case 2:
                                    // FINISH HERE!!!!  THIS SHOULDN"T THROW ERROR OUTSIDE BUT IT DOES
                                    _a.sent();
                                    query = client.query(helper.namespace, helper.set);
                                    stream = query.foreach();
                                    stream.on('data', function () {
                                        stream.abort();
                                    });
                                    stream.on('error', function (error) {
                                    });
                                    return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 6000); })];
                                case 3:
                                    _a.sent();
                                    return [4 /*yield*/, client.disableMetrics()];
                                case 4:
                                    _a.sent();
                                    return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 0); })];
                                case 5:
                                    _a.sent();
                                    (0, chai_1.expect)(totalErrorCount).to.be.greaterThan(0);
                                    clusterFromSnapshotListener = null;
                                    clusterFromDisableListener = null;
                                    return [2 /*return*/];
                            }
                        });
                    });
                });
            });
            context('timeoutCount', function () {
                var totalTimeoutCount = 0;
                function listenerTimeoutCount(cluster) {
                    for (var _i = 0, _a = cluster.nodes; _i < _a.length; _i++) {
                        var node = _a[_i];
                        var NamespaceMetrics = node.metrics;
                        for (var _b = 0, NamespaceMetrics_2 = NamespaceMetrics; _b < NamespaceMetrics_2.length; _b++) {
                            var index = NamespaceMetrics_2[_b];
                            totalTimeoutCount += index.timeoutCount;
                        }
                    }
                    return;
                }
                it('Ensures updated timeoutCount value is relayed to the user', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var listeners, policy, writePolicy, error_3, error_4, error_5;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    listeners = new aerospike_1.default.MetricsListeners({
                                        enableListener: emptyListener,
                                        disableListener: listenerTimeoutCount,
                                        nodeCloseListener: emptyNodeListener,
                                        snapshotListener: listenerTimeoutCount
                                    });
                                    policy = new aerospike_1.MetricsPolicy({
                                        metricsListeners: listeners,
                                        interval: 1,
                                    });
                                    return [4 /*yield*/, client.enableMetrics(policy)];
                                case 1:
                                    _a.sent();
                                    return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 3000); })];
                                case 2:
                                    _a.sent();
                                    writePolicy = new aerospike_1.default.policy.WritePolicy({
                                        totalTimeout: 1
                                    });
                                    _a.label = 3;
                                case 3:
                                    _a.trys.push([3, 5, , 6]);
                                    return [4 /*yield*/, client.put(new aerospike_1.default.Key(helper.namespace, helper.set, 'metrics/2'), { i: 49 }, {}, writePolicy)];
                                case 4:
                                    _a.sent();
                                    chai_1.assert.fail("AN ERROR SHOULD HAVE ");
                                    return [3 /*break*/, 6];
                                case 5:
                                    error_3 = _a.sent();
                                    (0, chai_1.expect)(error_3.code).to.eql(9);
                                    return [3 /*break*/, 6];
                                case 6:
                                    _a.trys.push([6, 8, , 9]);
                                    return [4 /*yield*/, client.put(new aerospike_1.default.Key(helper.namespace, helper.set, 'metrics/2'), { i: 49 }, {}, writePolicy)];
                                case 7:
                                    _a.sent();
                                    chai_1.assert.fail("AN ERROR SHOULD HAVE ");
                                    return [3 /*break*/, 9];
                                case 8:
                                    error_4 = _a.sent();
                                    (0, chai_1.expect)(error_4.code).to.eql(9);
                                    return [3 /*break*/, 9];
                                case 9:
                                    _a.trys.push([9, 11, , 12]);
                                    return [4 /*yield*/, client.put(new aerospike_1.default.Key(helper.namespace, helper.set, 'metrics/2'), { i: 49 }, {}, writePolicy)];
                                case 10:
                                    _a.sent();
                                    chai_1.assert.fail("AN ERROR SHOULD HAVE ");
                                    return [3 /*break*/, 12];
                                case 11:
                                    error_5 = _a.sent();
                                    (0, chai_1.expect)(error_5.code).to.eql(9);
                                    return [3 /*break*/, 12];
                                case 12: return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 6000); })];
                                case 13:
                                    _a.sent();
                                    return [4 /*yield*/, client.disableMetrics()];
                                case 14:
                                    _a.sent();
                                    return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 0); })];
                                case 15:
                                    _a.sent();
                                    (0, chai_1.expect)(totalTimeoutCount).to.be.greaterThan(0);
                                    clusterFromSnapshotListener = null;
                                    clusterFromDisableListener = null;
                                    return [2 /*return*/];
                            }
                        });
                    });
                });
            });
            context('connLatency', function () {
                var totalConnLatency = 0;
                function listenerWriteLatency(cluster) {
                    for (var _i = 0, _a = cluster.nodes; _i < _a.length; _i++) {
                        var node = _a[_i];
                        var NamespaceMetrics = node.metrics;
                        for (var _b = 0, NamespaceMetrics_3 = NamespaceMetrics; _b < NamespaceMetrics_3.length; _b++) {
                            var index = NamespaceMetrics_3[_b];
                            for (var _c = 0, _d = index.connLatency; _c < _d.length; _c++) {
                                var i = _d[_c];
                                totalConnLatency += i;
                            }
                        }
                    }
                }
                it('Ensures histogram matches the histogram settings', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var config, listeners, policy, promiseList, i, key, results, error_6;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    config = {
                                        hosts: helper.config.hosts,
                                        user: helper.config.user,
                                        password: helper.config.password,
                                    };
                                    listeners = new aerospike_1.default.MetricsListeners({
                                        enableListener: emptyListener,
                                        disableListener: listenerWriteLatency,
                                        nodeCloseListener: emptyNodeListener,
                                        snapshotListener: listenerWriteLatency
                                    });
                                    policy = new aerospike_1.MetricsPolicy({
                                        metricsListeners: listeners,
                                        interval: 1,
                                    });
                                    return [4 /*yield*/, client.enableMetrics(policy)];
                                case 1:
                                    _a.sent();
                                    return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 1500); })];
                                case 2:
                                    _a.sent();
                                    promiseList = [];
                                    for (i = 0; i < 100; i++) {
                                        key = new aerospike_1.default.Key('test', 'demo', 1);
                                        promiseList.push(client.put(key, { a: 1 }));
                                    }
                                    _a.label = 3;
                                case 3:
                                    _a.trys.push([3, 5, , 6]);
                                    return [4 /*yield*/, Promise.all(promiseList)];
                                case 4:
                                    results = _a.sent();
                                    return [3 /*break*/, 6];
                                case 5:
                                    error_6 = _a.sent();
                                    return [3 /*break*/, 6];
                                case 6: return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 3000); })];
                                case 7:
                                    _a.sent();
                                    return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 0); })];
                                case 8:
                                    _a.sent();
                                    (0, chai_1.expect)(totalConnLatency).to.be.greaterThan(0);
                                    clusterFromSnapshotListener = null;
                                    clusterFromDisableListener = null;
                                    return [2 /*return*/];
                            }
                        });
                    });
                });
            });
            context('writeLatency', function () {
                var totalWriteLatency = 0;
                function listenerWriteLatency(cluster) {
                    for (var _i = 0, _a = cluster.nodes; _i < _a.length; _i++) {
                        var node = _a[_i];
                        var NamespaceMetrics = node.metrics;
                        for (var _b = 0, NamespaceMetrics_4 = NamespaceMetrics; _b < NamespaceMetrics_4.length; _b++) {
                            var index = NamespaceMetrics_4[_b];
                            for (var _c = 0, _d = index.writeLatency; _c < _d.length; _c++) {
                                var i = _d[_c];
                                totalWriteLatency += i;
                            }
                        }
                    }
                }
                it('Ensures histogram returns non-zero values', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var config, listeners, policy;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    config = {
                                        hosts: helper.config.hosts,
                                        user: helper.config.user,
                                        password: helper.config.password,
                                    };
                                    listeners = new aerospike_1.default.MetricsListeners({
                                        enableListener: emptyListener,
                                        disableListener: listenerWriteLatency,
                                        nodeCloseListener: emptyNodeListener,
                                        snapshotListener: listenerWriteLatency
                                    });
                                    policy = new aerospike_1.MetricsPolicy({
                                        metricsListeners: listeners,
                                        interval: 1,
                                    });
                                    return [4 /*yield*/, client.enableMetrics(policy)];
                                case 1:
                                    _a.sent();
                                    return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 1500); })];
                                case 2:
                                    _a.sent();
                                    return [4 /*yield*/, client.put(new aerospike_1.default.Key(helper.namespace, helper.set, 'metrics/4'), { i: 49 })];
                                case 3:
                                    _a.sent();
                                    return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 3000); })];
                                case 4:
                                    _a.sent();
                                    return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 0); })];
                                case 5:
                                    _a.sent();
                                    (0, chai_1.expect)(totalWriteLatency).to.be.greaterThan(0);
                                    clusterFromSnapshotListener = null;
                                    clusterFromDisableListener = null;
                                    return [2 /*return*/];
                            }
                        });
                    });
                });
            });
            context('readLatency', function () {
                var totalReadLatency = 0;
                function listenerReadLatency(cluster) {
                    for (var _i = 0, _a = cluster.nodes; _i < _a.length; _i++) {
                        var node = _a[_i];
                        var NamespaceMetrics = node.metrics;
                        for (var _b = 0, NamespaceMetrics_5 = NamespaceMetrics; _b < NamespaceMetrics_5.length; _b++) {
                            var index = NamespaceMetrics_5[_b];
                            for (var _c = 0, _d = index.readLatency; _c < _d.length; _c++) {
                                var i = _d[_c];
                                totalReadLatency += i;
                            }
                        }
                    }
                }
                it('Ensures histogram returns non-zero values', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var config, listeners, policy;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    config = {
                                        hosts: helper.config.hosts,
                                        user: helper.config.user,
                                        password: helper.config.password,
                                    };
                                    listeners = new aerospike_1.default.MetricsListeners({
                                        enableListener: emptyListener,
                                        disableListener: listenerReadLatency,
                                        nodeCloseListener: emptyNodeListener,
                                        snapshotListener: listenerReadLatency
                                    });
                                    policy = new aerospike_1.MetricsPolicy({
                                        metricsListeners: listeners,
                                        interval: 1,
                                    });
                                    return [4 /*yield*/, client.enableMetrics(policy)];
                                case 1:
                                    _a.sent();
                                    return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 1500); })];
                                case 2:
                                    _a.sent();
                                    return [4 /*yield*/, client.put(new aerospike_1.default.Key(helper.namespace, helper.set, 'metrics/5'), { i: 49 })];
                                case 3:
                                    _a.sent();
                                    return [4 /*yield*/, client.get(new aerospike_1.default.Key(helper.namespace, helper.set, 'metrics/5'))];
                                case 4:
                                    _a.sent();
                                    return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 3000); })];
                                case 5:
                                    _a.sent();
                                    return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 0); })];
                                case 6:
                                    _a.sent();
                                    (0, chai_1.expect)(totalReadLatency).to.be.greaterThan(0);
                                    clusterFromSnapshotListener = null;
                                    clusterFromDisableListener = null;
                                    return [2 /*return*/];
                            }
                        });
                    });
                });
            });
            context('batchLatency', function () {
                it('Ensures histogram matches the histogram settings', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            return [2 /*return*/];
                        });
                    });
                });
                var totalBatchLatency = 0;
                function listenerBatchLatency(cluster) {
                    for (var _i = 0, _a = cluster.nodes; _i < _a.length; _i++) {
                        var node = _a[_i];
                        var NamespaceMetrics = node.metrics;
                        for (var _b = 0, NamespaceMetrics_6 = NamespaceMetrics; _b < NamespaceMetrics_6.length; _b++) {
                            var index = NamespaceMetrics_6[_b];
                            for (var _c = 0, _d = index.batchLatency; _c < _d.length; _c++) {
                                var i = _d[_c];
                                totalBatchLatency += i;
                            }
                        }
                    }
                }
                it('Ensures histogram returns non-zero values', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var config, listeners, policy, batchRecords;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    config = {
                                        hosts: helper.config.hosts,
                                        user: helper.config.user,
                                        password: helper.config.password,
                                    };
                                    listeners = new aerospike_1.default.MetricsListeners({
                                        enableListener: emptyListener,
                                        disableListener: listenerBatchLatency,
                                        nodeCloseListener: emptyNodeListener,
                                        snapshotListener: listenerBatchLatency
                                    });
                                    policy = new aerospike_1.MetricsPolicy({
                                        metricsListeners: listeners,
                                        interval: 1,
                                    });
                                    return [4 /*yield*/, client.enableMetrics(policy)];
                                case 1:
                                    _a.sent();
                                    return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 1500); })];
                                case 2:
                                    _a.sent();
                                    return [4 /*yield*/, client.put(new aerospike_1.default.Key(helper.namespace, helper.set, 'metrics/6'), { i: 49 })];
                                case 3:
                                    _a.sent();
                                    return [4 /*yield*/, client.put(new aerospike_1.default.Key(helper.namespace, helper.set, 'metrics/7'), { i: 49 })];
                                case 4:
                                    _a.sent();
                                    batchRecords = [
                                        {
                                            type: aerospike_1.default.batchType.BATCH_READ,
                                            key: new aerospike_1.default.Key(helper.namespace, helper.set, 'metrics/6'),
                                            readAllBins: true
                                        },
                                        {
                                            type: aerospike_1.default.batchType.BATCH_READ,
                                            key: new aerospike_1.default.Key(helper.namespace, helper.set, 'metrics/6'),
                                            readAllBins: true
                                        }
                                    ];
                                    return [4 /*yield*/, client.batchWrite(batchRecords)];
                                case 5:
                                    _a.sent();
                                    return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 3000); })];
                                case 6:
                                    _a.sent();
                                    return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 0); })];
                                case 7:
                                    _a.sent();
                                    (0, chai_1.expect)(totalBatchLatency).to.be.greaterThan(0);
                                    clusterFromSnapshotListener = null;
                                    clusterFromDisableListener = null;
                                    return [2 /*return*/];
                            }
                        });
                    });
                });
            });
            context('queryLatency', function () {
                it('Ensures histogram matches the histogram settings', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            return [2 /*return*/];
                        });
                    });
                });
                var totalQueryLatency = 0;
                function listenerQueryLatency(cluster) {
                    for (var _i = 0, _a = cluster.nodes; _i < _a.length; _i++) {
                        var node = _a[_i];
                        var NamespaceMetrics = node.metrics;
                        for (var _b = 0, NamespaceMetrics_7 = NamespaceMetrics; _b < NamespaceMetrics_7.length; _b++) {
                            var index = NamespaceMetrics_7[_b];
                            for (var _c = 0, _d = index.queryLatency; _c < _d.length; _c++) {
                                var i = _d[_c];
                                totalQueryLatency += i;
                            }
                        }
                    }
                }
                it('Ensures histogram returns non-zero values', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var config, listeners, policy, query, stream;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    config = {
                                        hosts: helper.config.hosts,
                                        user: helper.config.user,
                                        password: helper.config.password,
                                    };
                                    listeners = new aerospike_1.default.MetricsListeners({
                                        enableListener: emptyListener,
                                        disableListener: listenerQueryLatency,
                                        nodeCloseListener: emptyNodeListener,
                                        snapshotListener: listenerQueryLatency
                                    });
                                    policy = new aerospike_1.MetricsPolicy({
                                        metricsListeners: listeners,
                                        interval: 1,
                                    });
                                    return [4 /*yield*/, client.enableMetrics(policy)];
                                case 1:
                                    _a.sent();
                                    return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 1500); })];
                                case 2:
                                    _a.sent();
                                    return [4 /*yield*/, client.put(new aerospike_1.default.Key(helper.namespace, helper.set, 'metrics/8'), { i: 49 })];
                                case 3:
                                    _a.sent();
                                    query = client.query(helper.namespace, helper.set);
                                    stream = query.foreach();
                                    return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 3000); })];
                                case 4:
                                    _a.sent();
                                    return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 0); })];
                                case 5:
                                    _a.sent();
                                    (0, chai_1.expect)(totalQueryLatency).to.be.greaterThan(0);
                                    clusterFromSnapshotListener = null;
                                    clusterFromDisableListener = null;
                                    return [2 /*return*/];
                            }
                        });
                    });
                });
            });
            context('enableMetrics', function () {
                it('with no arguments', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, client.enableMetrics()];
                                case 1:
                                    _a.sent();
                                    return [4 /*yield*/, client.disableMetrics()];
                                case 2:
                                    _a.sent();
                                    return [2 /*return*/];
                            }
                        });
                    });
                });
                it('with metricsPolicy', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var policy;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    policy = new aerospike_1.default.MetricsPolicy({
                                        reportDir: ".",
                                        reportSizeLimit: 1000000,
                                        interval: 2,
                                        latencyColumns: 6,
                                        latencyShift: 2
                                    });
                                    return [4 /*yield*/, client.enableMetrics()];
                                case 1:
                                    _a.sent();
                                    return [4 /*yield*/, client.disableMetrics()];
                                case 2:
                                    _a.sent();
                                    return [2 /*return*/];
                            }
                        });
                    });
                });
            });
            context('disableMetrics', function () {
                it('with no arguments', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, client.enableMetrics()];
                                case 1:
                                    _a.sent();
                                    return [4 /*yield*/, client.disableMetrics()];
                                case 2:
                                    _a.sent();
                                    return [2 /*return*/];
                            }
                        });
                    });
                });
            });
        });
    });
    context('Negative Tests', function () {
        context('MetricsPolicy', function () {
            context('metricsListeners', function () {
                context('one metricListener set', function () {
                    it('fails when only enableListener set', function () {
                        return __awaiter(this, void 0, void 0, function () {
                            var listeners, policy, error_7;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        listeners = new aerospike_1.default.MetricsListeners({
                                            enableListener: emptyListener,
                                            disableListener: null,
                                            nodeCloseListener: null,
                                            snapshotListener: null
                                        });
                                        policy = new aerospike_1.MetricsPolicy({
                                            metricsListeners: listeners,
                                        });
                                        _a.label = 1;
                                    case 1:
                                        _a.trys.push([1, 3, , 4]);
                                        return [4 /*yield*/, client.enableMetrics(policy)];
                                    case 2:
                                        _a.sent();
                                        chai_1.assert.fail("AN ERROR SHOULD HAVE BEEN CAUGHT");
                                        return [3 /*break*/, 4];
                                    case 3:
                                        error_7 = _a.sent();
                                        (0, chai_1.expect)(error_7.code).to.eql(-2);
                                        (0, chai_1.expect)(error_7.message).to.eql("If one metrics callback is set, all metrics callbacks must be set");
                                        return [3 /*break*/, 4];
                                    case 4: return [4 /*yield*/, client.disableMetrics()];
                                    case 5:
                                        _a.sent();
                                        return [2 /*return*/];
                                }
                            });
                        });
                    });
                    it('fails when only nodeCloseListener set', function () {
                        return __awaiter(this, void 0, void 0, function () {
                            var listeners, policy, error_8;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        listeners = new aerospike_1.default.MetricsListeners({
                                            nodeCloseListener: emptyClusterListener,
                                            enableListener: null,
                                            disableListener: null,
                                            snapshotListener: null
                                        });
                                        policy = new aerospike_1.MetricsPolicy({
                                            metricsListeners: listeners,
                                        });
                                        _a.label = 1;
                                    case 1:
                                        _a.trys.push([1, 3, , 4]);
                                        return [4 /*yield*/, client.enableMetrics(policy)];
                                    case 2:
                                        _a.sent();
                                        chai_1.assert.fail("AN ERROR SHOULD HAVE BEEN CAUGHT");
                                        return [3 /*break*/, 4];
                                    case 3:
                                        error_8 = _a.sent();
                                        (0, chai_1.expect)(error_8.code).to.eql(-2);
                                        (0, chai_1.expect)(error_8.message).to.eql("If one metrics callback is set, all metrics callbacks must be set");
                                        return [3 /*break*/, 4];
                                    case 4: return [4 /*yield*/, client.disableMetrics()];
                                    case 5:
                                        _a.sent();
                                        return [2 /*return*/];
                                }
                            });
                        });
                    });
                    it('fails when only snapshotListener set', function () {
                        return __awaiter(this, void 0, void 0, function () {
                            var listeners, policy, error_9;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        listeners = new aerospike_1.default.MetricsListeners({
                                            snapshotListener: emptyClusterListener,
                                            enableListener: null,
                                            disableListener: null,
                                            nodeCloseListener: null,
                                        });
                                        policy = new aerospike_1.MetricsPolicy({
                                            metricsListeners: listeners,
                                        });
                                        _a.label = 1;
                                    case 1:
                                        _a.trys.push([1, 3, , 4]);
                                        return [4 /*yield*/, client.enableMetrics(policy)];
                                    case 2:
                                        _a.sent();
                                        chai_1.assert.fail("AN ERROR SHOULD HAVE BEEN CAUGHT");
                                        return [3 /*break*/, 4];
                                    case 3:
                                        error_9 = _a.sent();
                                        (0, chai_1.expect)(error_9.code).to.eql(-2);
                                        (0, chai_1.expect)(error_9.message).to.eql("If one metrics callback is set, all metrics callbacks must be set");
                                        return [3 /*break*/, 4];
                                    case 4: return [4 /*yield*/, client.disableMetrics()];
                                    case 5:
                                        _a.sent();
                                        return [2 /*return*/];
                                }
                            });
                        });
                    });
                    it('fails when only disableListener set', function () {
                        return __awaiter(this, void 0, void 0, function () {
                            var listeners, policy, error_10;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        listeners = new aerospike_1.default.MetricsListeners({
                                            disableListener: emptyListener,
                                            enableListener: null,
                                            snapshotListener: null,
                                            nodeCloseListener: null,
                                        });
                                        policy = new aerospike_1.MetricsPolicy({
                                            metricsListeners: listeners,
                                        });
                                        _a.label = 1;
                                    case 1:
                                        _a.trys.push([1, 3, , 4]);
                                        return [4 /*yield*/, client.enableMetrics(policy)];
                                    case 2:
                                        _a.sent();
                                        chai_1.assert.fail("AN ERROR SHOULD HAVE BEEN CAUGHT");
                                        return [3 /*break*/, 4];
                                    case 3:
                                        error_10 = _a.sent();
                                        (0, chai_1.expect)(error_10.code).to.eql(-2);
                                        (0, chai_1.expect)(error_10.message).to.eql("If one metrics callback is set, all metrics callbacks must be set");
                                        return [3 /*break*/, 4];
                                    case 4: return [4 /*yield*/, client.disableMetrics()];
                                    case 5:
                                        _a.sent();
                                        return [2 /*return*/];
                                }
                            });
                        });
                    });
                });
                context('two metricListeners set', function () {
                    it('fails when only disableListener and nodeCloseListener set', function () {
                        return __awaiter(this, void 0, void 0, function () {
                            var listeners, policy, error_11;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        listeners = new aerospike_1.default.MetricsListeners({
                                            disableListener: emptyClusterListener,
                                            nodeCloseListener: emptyNodeListener,
                                            enableListener: null,
                                            snapshotListener: null,
                                        });
                                        policy = new aerospike_1.MetricsPolicy({
                                            metricsListeners: listeners,
                                        });
                                        _a.label = 1;
                                    case 1:
                                        _a.trys.push([1, 3, , 4]);
                                        return [4 /*yield*/, client.enableMetrics(policy)];
                                    case 2:
                                        _a.sent();
                                        chai_1.assert.fail("AN ERROR SHOULD HAVE BEEN CAUGHT");
                                        return [3 /*break*/, 4];
                                    case 3:
                                        error_11 = _a.sent();
                                        (0, chai_1.expect)(error_11.code).to.eql(-2);
                                        (0, chai_1.expect)(error_11.message).to.eql("If one metrics callback is set, all metrics callbacks must be set");
                                        return [3 /*break*/, 4];
                                    case 4: return [4 /*yield*/, client.disableMetrics()];
                                    case 5:
                                        _a.sent();
                                        return [2 /*return*/];
                                }
                            });
                        });
                    });
                    it('fails when only disableListener and snapshotListener set', function () {
                        return __awaiter(this, void 0, void 0, function () {
                            var listeners, policy, error_12;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        listeners = new aerospike_1.default.MetricsListeners({
                                            disableListener: emptyClusterListener,
                                            snapshotListener: emptyClusterListener,
                                            enableListener: null,
                                            nodeCloseListener: null,
                                        });
                                        policy = new aerospike_1.MetricsPolicy({
                                            metricsListeners: listeners,
                                        });
                                        _a.label = 1;
                                    case 1:
                                        _a.trys.push([1, 3, , 4]);
                                        return [4 /*yield*/, client.enableMetrics(policy)];
                                    case 2:
                                        _a.sent();
                                        chai_1.assert.fail("AN ERROR SHOULD HAVE BEEN CAUGHT");
                                        return [3 /*break*/, 4];
                                    case 3:
                                        error_12 = _a.sent();
                                        (0, chai_1.expect)(error_12.code).to.eql(-2);
                                        (0, chai_1.expect)(error_12.message).to.eql("If one metrics callback is set, all metrics callbacks must be set");
                                        return [3 /*break*/, 4];
                                    case 4: return [4 /*yield*/, client.disableMetrics()];
                                    case 5:
                                        _a.sent();
                                        return [2 /*return*/];
                                }
                            });
                        });
                    });
                    it('fails when only disableListener and enableListener set', function () {
                        return __awaiter(this, void 0, void 0, function () {
                            var listeners, policy, error_13;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        listeners = new aerospike_1.default.MetricsListeners({
                                            disableListener: emptyClusterListener,
                                            enableListener: emptyListener,
                                            snapshotListener: null,
                                            nodeCloseListener: null,
                                        });
                                        policy = new aerospike_1.MetricsPolicy({
                                            metricsListeners: listeners,
                                        });
                                        _a.label = 1;
                                    case 1:
                                        _a.trys.push([1, 3, , 4]);
                                        return [4 /*yield*/, client.enableMetrics(policy)];
                                    case 2:
                                        _a.sent();
                                        chai_1.assert.fail("AN ERROR SHOULD HAVE BEEN CAUGHT");
                                        return [3 /*break*/, 4];
                                    case 3:
                                        error_13 = _a.sent();
                                        (0, chai_1.expect)(error_13.code).to.eql(-2);
                                        (0, chai_1.expect)(error_13.message).to.eql("If one metrics callback is set, all metrics callbacks must be set");
                                        return [3 /*break*/, 4];
                                    case 4: return [4 /*yield*/, client.disableMetrics()];
                                    case 5:
                                        _a.sent();
                                        return [2 /*return*/];
                                }
                            });
                        });
                    });
                    it('fails when only nodeCloseListener and snapshotListener set', function () {
                        return __awaiter(this, void 0, void 0, function () {
                            var listeners, policy, error_14;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        listeners = new aerospike_1.default.MetricsListeners({
                                            snapshotListener: emptyClusterListener,
                                            nodeCloseListener: emptyNodeListener,
                                            enableListener: null,
                                            disableListener: null,
                                        });
                                        policy = new aerospike_1.MetricsPolicy({
                                            metricsListeners: listeners,
                                        });
                                        _a.label = 1;
                                    case 1:
                                        _a.trys.push([1, 3, , 4]);
                                        return [4 /*yield*/, client.enableMetrics(policy)];
                                    case 2:
                                        _a.sent();
                                        chai_1.assert.fail("AN ERROR SHOULD HAVE BEEN CAUGHT");
                                        return [3 /*break*/, 4];
                                    case 3:
                                        error_14 = _a.sent();
                                        (0, chai_1.expect)(error_14.code).to.eql(-2);
                                        (0, chai_1.expect)(error_14.message).to.eql("If one metrics callback is set, all metrics callbacks must be set");
                                        return [3 /*break*/, 4];
                                    case 4: return [4 /*yield*/, client.disableMetrics()];
                                    case 5:
                                        _a.sent();
                                        return [2 /*return*/];
                                }
                            });
                        });
                    });
                    it('fails when only nodeCloseListener and enableListener set', function () {
                        return __awaiter(this, void 0, void 0, function () {
                            var listeners, policy, error_15;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        listeners = new aerospike_1.default.MetricsListeners({
                                            enableListener: emptyListener,
                                            nodeCloseListener: emptyNodeListener,
                                            disableListener: null,
                                            snapshotListener: null,
                                        });
                                        policy = new aerospike_1.MetricsPolicy({
                                            metricsListeners: listeners,
                                        });
                                        _a.label = 1;
                                    case 1:
                                        _a.trys.push([1, 3, , 4]);
                                        return [4 /*yield*/, client.enableMetrics(policy)];
                                    case 2:
                                        _a.sent();
                                        chai_1.assert.fail("AN ERROR SHOULD HAVE BEEN CAUGHT");
                                        return [3 /*break*/, 4];
                                    case 3:
                                        error_15 = _a.sent();
                                        (0, chai_1.expect)(error_15.code).to.eql(-2);
                                        (0, chai_1.expect)(error_15.message).to.eql("If one metrics callback is set, all metrics callbacks must be set");
                                        return [3 /*break*/, 4];
                                    case 4: return [4 /*yield*/, client.disableMetrics()];
                                    case 5:
                                        _a.sent();
                                        return [2 /*return*/];
                                }
                            });
                        });
                    });
                    it('fails when only snapshotListener and enableListener set', function () {
                        return __awaiter(this, void 0, void 0, function () {
                            var listeners, policy, error_16;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        listeners = new aerospike_1.default.MetricsListeners({
                                            enableListener: emptyListener,
                                            snapshotListener: emptyClusterListener,
                                            disableListener: null,
                                            nodeCloseListener: null,
                                        });
                                        policy = new aerospike_1.MetricsPolicy({
                                            metricsListeners: listeners,
                                        });
                                        _a.label = 1;
                                    case 1:
                                        _a.trys.push([1, 3, , 4]);
                                        return [4 /*yield*/, client.enableMetrics(policy)];
                                    case 2:
                                        _a.sent();
                                        chai_1.assert.fail("AN ERROR SHOULD HAVE BEEN CAUGHT");
                                        return [3 /*break*/, 4];
                                    case 3:
                                        error_16 = _a.sent();
                                        (0, chai_1.expect)(error_16.code).to.eql(-2);
                                        (0, chai_1.expect)(error_16.message).to.eql("If one metrics callback is set, all metrics callbacks must be set");
                                        return [3 /*break*/, 4];
                                    case 4: return [4 /*yield*/, client.disableMetrics()];
                                    case 5:
                                        _a.sent();
                                        return [2 /*return*/];
                                }
                            });
                        });
                    });
                });
                context('three metricListeners set', function () {
                    it('fails when only enableListener not set', function () {
                        return __awaiter(this, void 0, void 0, function () {
                            var listeners, policy, error_17;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        listeners = new aerospike_1.default.MetricsListeners({
                                            enableListener: null,
                                            snapshotListener: emptyClusterListener,
                                            disableListener: emptyClusterListener,
                                            nodeCloseListener: emptyNodeListener,
                                        });
                                        policy = new aerospike_1.MetricsPolicy({
                                            metricsListeners: listeners,
                                        });
                                        _a.label = 1;
                                    case 1:
                                        _a.trys.push([1, 3, , 4]);
                                        return [4 /*yield*/, client.enableMetrics(policy)];
                                    case 2:
                                        _a.sent();
                                        chai_1.assert.fail("AN ERROR SHOULD HAVE BEEN CAUGHT");
                                        return [3 /*break*/, 4];
                                    case 3:
                                        error_17 = _a.sent();
                                        (0, chai_1.expect)(error_17.code).to.eql(-2);
                                        (0, chai_1.expect)(error_17.message).to.eql("If one metrics callback is set, all metrics callbacks must be set");
                                        return [3 /*break*/, 4];
                                    case 4: return [4 /*yield*/, client.disableMetrics()];
                                    case 5:
                                        _a.sent();
                                        return [2 /*return*/];
                                }
                            });
                        });
                    });
                    it('fails when only nodeCloseListener not set', function () {
                        return __awaiter(this, void 0, void 0, function () {
                            var listeners, policy, error_18;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        listeners = new aerospike_1.default.MetricsListeners({
                                            enableListener: emptyListener,
                                            snapshotListener: emptyClusterListener,
                                            disableListener: emptyClusterListener,
                                            nodeCloseListener: null,
                                        });
                                        policy = new aerospike_1.MetricsPolicy({
                                            metricsListeners: listeners,
                                        });
                                        _a.label = 1;
                                    case 1:
                                        _a.trys.push([1, 3, , 4]);
                                        return [4 /*yield*/, client.enableMetrics(policy)];
                                    case 2:
                                        _a.sent();
                                        chai_1.assert.fail("AN ERROR SHOULD HAVE BEEN CAUGHT");
                                        return [3 /*break*/, 4];
                                    case 3:
                                        error_18 = _a.sent();
                                        (0, chai_1.expect)(error_18.code).to.eql(-2);
                                        (0, chai_1.expect)(error_18.message).to.eql("If one metrics callback is set, all metrics callbacks must be set");
                                        return [3 /*break*/, 4];
                                    case 4: return [4 /*yield*/, client.disableMetrics()];
                                    case 5:
                                        _a.sent();
                                        return [2 /*return*/];
                                }
                            });
                        });
                    });
                    it('fails when only snapshotListener not set', function () {
                        return __awaiter(this, void 0, void 0, function () {
                            var listeners, policy, error_19;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        listeners = new aerospike_1.default.MetricsListeners({
                                            enableListener: emptyListener,
                                            snapshotListener: null,
                                            disableListener: emptyClusterListener,
                                            nodeCloseListener: emptyNodeListener,
                                        });
                                        policy = new aerospike_1.MetricsPolicy({
                                            metricsListeners: listeners,
                                        });
                                        _a.label = 1;
                                    case 1:
                                        _a.trys.push([1, 3, , 4]);
                                        return [4 /*yield*/, client.enableMetrics(policy)];
                                    case 2:
                                        _a.sent();
                                        chai_1.assert.fail("AN ERROR SHOULD HAVE BEEN CAUGHT");
                                        return [3 /*break*/, 4];
                                    case 3:
                                        error_19 = _a.sent();
                                        (0, chai_1.expect)(error_19.code).to.eql(-2);
                                        (0, chai_1.expect)(error_19.message).to.eql("If one metrics callback is set, all metrics callbacks must be set");
                                        return [3 /*break*/, 4];
                                    case 4: return [4 /*yield*/, client.disableMetrics()];
                                    case 5:
                                        _a.sent();
                                        return [2 /*return*/];
                                }
                            });
                        });
                    });
                    it('fails when only disableListener not set', function () {
                        return __awaiter(this, void 0, void 0, function () {
                            var listeners, policy, error_20;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        listeners = new aerospike_1.default.MetricsListeners({
                                            enableListener: emptyListener,
                                            snapshotListener: emptyClusterListener,
                                            disableListener: null,
                                            nodeCloseListener: emptyNodeListener,
                                        });
                                        policy = new aerospike_1.MetricsPolicy({
                                            metricsListeners: listeners,
                                        });
                                        _a.label = 1;
                                    case 1:
                                        _a.trys.push([1, 3, , 4]);
                                        return [4 /*yield*/, client.enableMetrics(policy)];
                                    case 2:
                                        _a.sent();
                                        chai_1.assert.fail("AN ERROR SHOULD HAVE BEEN CAUGHT");
                                        return [3 /*break*/, 4];
                                    case 3:
                                        error_20 = _a.sent();
                                        (0, chai_1.expect)(error_20.code).to.eql(-2);
                                        (0, chai_1.expect)(error_20.message).to.eql("If one metrics callback is set, all metrics callbacks must be set");
                                        return [3 /*break*/, 4];
                                    case 4: return [4 /*yield*/, client.disableMetrics()];
                                    case 5:
                                        _a.sent();
                                        return [2 /*return*/];
                                }
                            });
                        });
                    });
                });
                context('enableListner', function () {
                    it('fails when non-function is given', function () {
                        return __awaiter(this, void 0, void 0, function () {
                            var listeners, policy, error_21;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        listeners = new aerospike_1.default.MetricsListeners({
                                            enableListener: 10,
                                            snapshotListener: emptyClusterListener,
                                            disableListener: emptyClusterListener,
                                            nodeCloseListener: emptyNodeListener,
                                        });
                                        policy = new aerospike_1.MetricsPolicy({
                                            metricsListeners: listeners,
                                        });
                                        _a.label = 1;
                                    case 1:
                                        _a.trys.push([1, 3, , 4]);
                                        return [4 /*yield*/, client.enableMetrics(policy)];
                                    case 2:
                                        _a.sent();
                                        chai_1.assert.fail("AN ERROR SHOULD HAVE BEEN CAUGHT");
                                        return [3 /*break*/, 4];
                                    case 3:
                                        error_21 = _a.sent();
                                        (0, chai_1.expect)(error_21.message).to.eql("enableListener must be a function");
                                        (0, chai_1.expect)(error_21 instanceof TypeError).to.eql(true);
                                        return [3 /*break*/, 4];
                                    case 4: return [4 /*yield*/, client.disableMetrics()];
                                    case 5:
                                        _a.sent();
                                        return [2 /*return*/];
                                }
                            });
                        });
                    });
                });
                context('snapshotListener', function () {
                    it('fails when non-function is given', function () {
                        return __awaiter(this, void 0, void 0, function () {
                            var listeners, policy, error_22;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        listeners = new aerospike_1.default.MetricsListeners({
                                            enableListener: emptyListener,
                                            snapshotListener: 10,
                                            disableListener: emptyClusterListener,
                                            nodeCloseListener: emptyNodeListener,
                                        });
                                        policy = new aerospike_1.MetricsPolicy({
                                            metricsListeners: listeners,
                                        });
                                        _a.label = 1;
                                    case 1:
                                        _a.trys.push([1, 3, , 4]);
                                        return [4 /*yield*/, client.enableMetrics(policy)];
                                    case 2:
                                        _a.sent();
                                        chai_1.assert.fail("AN ERROR SHOULD HAVE BEEN CAUGHT");
                                        return [3 /*break*/, 4];
                                    case 3:
                                        error_22 = _a.sent();
                                        (0, chai_1.expect)(error_22 instanceof TypeError).to.eql(true);
                                        (0, chai_1.expect)(error_22.message).to.eql("snapshotListener must be a function");
                                        return [3 /*break*/, 4];
                                    case 4: return [4 /*yield*/, client.disableMetrics()];
                                    case 5:
                                        _a.sent();
                                        return [2 /*return*/];
                                }
                            });
                        });
                    });
                });
                context('nodeCloseListener', function () {
                    it('fails when non-function is given', function () {
                        return __awaiter(this, void 0, void 0, function () {
                            var listeners, policy, error_23;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        listeners = new aerospike_1.default.MetricsListeners({
                                            enableListener: emptyListener,
                                            snapshotListener: emptyClusterListener,
                                            disableListener: emptyClusterListener,
                                            nodeCloseListener: 10,
                                        });
                                        policy = new aerospike_1.MetricsPolicy({
                                            metricsListeners: listeners,
                                        });
                                        _a.label = 1;
                                    case 1:
                                        _a.trys.push([1, 3, , 4]);
                                        return [4 /*yield*/, client.enableMetrics(policy)];
                                    case 2:
                                        _a.sent();
                                        chai_1.assert.fail("AN ERROR SHOULD HAVE BEEN CAUGHT");
                                        return [3 /*break*/, 4];
                                    case 3:
                                        error_23 = _a.sent();
                                        (0, chai_1.expect)(error_23 instanceof TypeError).to.eql(true);
                                        (0, chai_1.expect)(error_23.message).to.eql("nodeCloseListener must be a function");
                                        return [3 /*break*/, 4];
                                    case 4: return [4 /*yield*/, client.disableMetrics()];
                                    case 5:
                                        _a.sent();
                                        return [2 /*return*/];
                                }
                            });
                        });
                    });
                });
                context('disableListener', function () {
                    it('fails when non-function is given', function () {
                        return __awaiter(this, void 0, void 0, function () {
                            var listeners, policy, error_24;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        listeners = new aerospike_1.default.MetricsListeners({
                                            enableListener: emptyListener,
                                            snapshotListener: emptyClusterListener,
                                            disableListener: 10,
                                            nodeCloseListener: emptyNodeListener,
                                        });
                                        policy = new aerospike_1.MetricsPolicy({
                                            metricsListeners: listeners,
                                        });
                                        _a.label = 1;
                                    case 1:
                                        _a.trys.push([1, 3, , 4]);
                                        return [4 /*yield*/, client.enableMetrics(policy)];
                                    case 2:
                                        _a.sent();
                                        chai_1.assert.fail("AN ERROR SHOULD HAVE BEEN CAUGHT");
                                        return [3 /*break*/, 4];
                                    case 3:
                                        error_24 = _a.sent();
                                        (0, chai_1.expect)(error_24 instanceof TypeError).to.eql(true);
                                        (0, chai_1.expect)(error_24.message).to.eql("disableListener must be a function");
                                        return [3 /*break*/, 4];
                                    case 4: return [4 /*yield*/, client.disableMetrics()];
                                    case 5:
                                        _a.sent();
                                        return [2 /*return*/];
                                }
                            });
                        });
                    });
                });
            });
            context('reportDir', function () {
                it('fail when invalid value is given', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var policy, error_25;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    policy = new aerospike_1.MetricsPolicy({
                                        reportDir: 10,
                                    });
                                    _a.label = 1;
                                case 1:
                                    _a.trys.push([1, 3, , 4]);
                                    return [4 /*yield*/, client.enableMetrics(policy)];
                                case 2:
                                    _a.sent();
                                    chai_1.assert.fail("AN ERROR SHOULD BE CAUGHT");
                                    return [3 /*break*/, 4];
                                case 3:
                                    error_25 = _a.sent();
                                    (0, chai_1.expect)(error_25.message).to.eql("Metrics policy parameter invalid");
                                    (0, chai_1.expect)(error_25.code).to.eql(-2);
                                    return [3 /*break*/, 4];
                                case 4: return [4 /*yield*/, client.disableMetrics()];
                                case 5:
                                    _a.sent();
                                    return [2 /*return*/];
                            }
                        });
                    });
                });
                it('fail when too large of value is given', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var value, i, policy, error_26;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    value = '';
                                    for (i = 0; i < 257; i++) {
                                        value += 'a';
                                    }
                                    policy = new aerospike_1.MetricsPolicy({
                                        reportDir: value,
                                    });
                                    _a.label = 1;
                                case 1:
                                    _a.trys.push([1, 3, , 4]);
                                    return [4 /*yield*/, client.enableMetrics(policy)];
                                case 2:
                                    _a.sent();
                                    chai_1.assert.fail("AN ERROR SHOULD BE CAUGHT");
                                    return [3 /*break*/, 4];
                                case 3:
                                    error_26 = _a.sent();
                                    (0, chai_1.expect)(error_26.message).to.eql("Metrics policy parameter invalid");
                                    (0, chai_1.expect)(error_26.code).to.eql(-2);
                                    return [3 /*break*/, 4];
                                case 4: return [4 /*yield*/, client.disableMetrics()];
                                case 5:
                                    _a.sent();
                                    return [2 /*return*/];
                            }
                        });
                    });
                });
                it('fail when an empty value is given', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var value, policy, error_27, messageToken;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    value = '';
                                    policy = new aerospike_1.MetricsPolicy({
                                        reportDir: value,
                                    });
                                    _a.label = 1;
                                case 1:
                                    _a.trys.push([1, 3, , 4]);
                                    return [4 /*yield*/, client.enableMetrics(policy)];
                                case 2:
                                    _a.sent();
                                    chai_1.assert.fail("AN ERROR SHOULD BE CAUGHT");
                                    return [3 /*break*/, 4];
                                case 3:
                                    error_27 = _a.sent();
                                    messageToken = error_27.message.split('-')[0];
                                    (0, chai_1.expect)(messageToken).to.eql("Failed to open file: /metrics");
                                    (0, chai_1.expect)(error_27.code).to.eql(-1);
                                    return [3 /*break*/, 4];
                                case 4: return [4 /*yield*/, client.disableMetrics()];
                                case 5:
                                    _a.sent();
                                    return [2 /*return*/];
                            }
                        });
                    });
                });
            });
            context('reportSizeLimit', function () {
                it('fail when invalid value is given', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var policy, error_28;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    policy = new aerospike_1.MetricsPolicy({
                                        reportSizeLimit: 'a',
                                    });
                                    _a.label = 1;
                                case 1:
                                    _a.trys.push([1, 3, , 4]);
                                    return [4 /*yield*/, client.enableMetrics(policy)];
                                case 2:
                                    _a.sent();
                                    chai_1.assert.fail("AN ERROR SHOULD BE CAUGHT");
                                    return [3 /*break*/, 4];
                                case 3:
                                    error_28 = _a.sent();
                                    (0, chai_1.expect)(error_28.message).to.eql("Metrics policy parameter invalid");
                                    (0, chai_1.expect)(error_28.code).to.eql(-2);
                                    return [3 /*break*/, 4];
                                case 4: return [4 /*yield*/, client.disableMetrics()];
                                case 5:
                                    _a.sent();
                                    return [2 /*return*/];
                            }
                        });
                    });
                });
                it('fails when value is too small', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var policy, error_29;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    policy = new aerospike_1.MetricsPolicy({
                                        reportSizeLimit: 1000,
                                    });
                                    _a.label = 1;
                                case 1:
                                    _a.trys.push([1, 3, , 4]);
                                    return [4 /*yield*/, client.enableMetrics(policy)];
                                case 2:
                                    _a.sent();
                                    chai_1.assert.fail("AN ERROR SHOULD BE CAUGHT");
                                    return [3 /*break*/, 4];
                                case 3:
                                    error_29 = _a.sent();
                                    (0, chai_1.expect)(error_29.message).to.eql("Metrics policy report_size_limit 1000 must be at least 1000000");
                                    (0, chai_1.expect)(error_29.code).to.eql(-1);
                                    return [3 /*break*/, 4];
                                case 4: return [4 /*yield*/, client.disableMetrics()];
                                case 5:
                                    _a.sent();
                                    return [2 /*return*/];
                            }
                        });
                    });
                });
            });
            context('interval', function () {
                it('fail when invalid value is given', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var policy, error_30;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    policy = new aerospike_1.MetricsPolicy({
                                        interval: 'a',
                                    });
                                    _a.label = 1;
                                case 1:
                                    _a.trys.push([1, 3, , 4]);
                                    return [4 /*yield*/, client.enableMetrics(policy)];
                                case 2:
                                    _a.sent();
                                    chai_1.assert.fail("AN ERROR SHOULD BE CAUGHT");
                                    return [3 /*break*/, 4];
                                case 3:
                                    error_30 = _a.sent();
                                    (0, chai_1.expect)(error_30.message).to.eql("Metrics policy parameter invalid");
                                    (0, chai_1.expect)(error_30.code).to.eql(-2);
                                    return [3 /*break*/, 4];
                                case 4: return [4 /*yield*/, client.disableMetrics()];
                                case 5:
                                    _a.sent();
                                    return [2 /*return*/];
                            }
                        });
                    });
                });
            });
            context('latencyColumns', function () {
                it('fail when invalid value is given', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var policy, error_31;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    policy = new aerospike_1.MetricsPolicy({
                                        latencyColumns: 'a',
                                    });
                                    _a.label = 1;
                                case 1:
                                    _a.trys.push([1, 3, , 4]);
                                    return [4 /*yield*/, client.enableMetrics(policy)];
                                case 2:
                                    _a.sent();
                                    chai_1.assert.fail("AN ERROR SHOULD BE CAUGHT");
                                    return [3 /*break*/, 4];
                                case 3:
                                    error_31 = _a.sent();
                                    (0, chai_1.expect)(error_31.message).to.eql("Metrics policy parameter invalid");
                                    (0, chai_1.expect)(error_31.code).to.eql(-2);
                                    return [3 /*break*/, 4];
                                case 4: return [4 /*yield*/, client.disableMetrics()];
                                case 5:
                                    _a.sent();
                                    return [2 /*return*/];
                            }
                        });
                    });
                });
            });
            context('latencyShift', function () {
                it('fail when invalid value is given', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var policy, error_32;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    policy = new aerospike_1.MetricsPolicy({
                                        latencyShift: 'a',
                                    });
                                    _a.label = 1;
                                case 1:
                                    _a.trys.push([1, 3, , 4]);
                                    return [4 /*yield*/, client.enableMetrics(policy)];
                                case 2:
                                    _a.sent();
                                    chai_1.assert.fail("AN ERROR SHOULD BE CAUGHT");
                                    return [3 /*break*/, 4];
                                case 3:
                                    error_32 = _a.sent();
                                    (0, chai_1.expect)(error_32.message).to.eql("Metrics policy parameter invalid");
                                    (0, chai_1.expect)(error_32.code).to.eql(-2);
                                    return [3 /*break*/, 4];
                                case 4: return [4 /*yield*/, client.disableMetrics()];
                                case 5:
                                    _a.sent();
                                    return [2 /*return*/];
                            }
                        });
                    });
                });
            });
            context('labels', function () {
                it('fail when invalid value is given', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var policy, error_33;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    policy = new aerospike_1.MetricsPolicy({
                                        labels: 'a',
                                    });
                                    _a.label = 1;
                                case 1:
                                    _a.trys.push([1, 3, , 4]);
                                    return [4 /*yield*/, client.enableMetrics(policy)];
                                case 2:
                                    _a.sent();
                                    chai_1.assert.fail("AN ERROR SHOULD BE CAUGHT");
                                    return [3 /*break*/, 4];
                                case 3:
                                    error_33 = _a.sent();
                                    (0, chai_1.expect)(error_33.message).to.eql("Metrics policy parameter invalid");
                                    (0, chai_1.expect)(error_33.code).to.eql(-2);
                                    return [3 /*break*/, 4];
                                case 4: return [4 /*yield*/, client.disableMetrics()];
                                case 5:
                                    _a.sent();
                                    return [2 /*return*/];
                            }
                        });
                    });
                });
                it('fails when invalid key-value inside object is given', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var policy, error_34;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    policy = new aerospike_1.MetricsPolicy({
                                        labels: { 'a': 1 },
                                    });
                                    _a.label = 1;
                                case 1:
                                    _a.trys.push([1, 3, , 4]);
                                    return [4 /*yield*/, client.enableMetrics(policy)];
                                case 2:
                                    _a.sent();
                                    chai_1.assert.fail("AN ERROR SHOULD BE CAUGHT");
                                    return [3 /*break*/, 4];
                                case 3:
                                    error_34 = _a.sent();
                                    (0, chai_1.expect)(error_34.message).to.eql("Metrics policy parameter invalid");
                                    (0, chai_1.expect)(error_34.code).to.eql(-2);
                                    return [3 /*break*/, 4];
                                case 4: return [4 /*yield*/, client.disableMetrics()];
                                case 5:
                                    _a.sent();
                                    return [2 /*return*/];
                            }
                        });
                    });
                });
            });
        });
        context('enableMetrics', function () {
            it('fails with invalid policy', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var error_35;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                _a.trys.push([0, 2, , 3]);
                                return [4 /*yield*/, client.enableMetrics(10)];
                            case 1:
                                _a.sent();
                                chai_1.assert.fail("AN ERROR SHOULD BE CAUGHT");
                                return [3 /*break*/, 3];
                            case 2:
                                error_35 = _a.sent();
                                (0, chai_1.expect)(error_35.message).to.eql("policy must be an object");
                                (0, chai_1.expect)(error_35 instanceof TypeError).to.eql(true);
                                return [3 /*break*/, 3];
                            case 3: return [4 /*yield*/, client.disableMetrics()];
                            case 4:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
    });
    context('Typescript definition tests', function () {
        context('metricsPolicy', function () {
            it('compiles metricsListeners', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var listeners, policy;
                    return __generator(this, function (_a) {
                        listeners = new aerospike_1.default.MetricsListeners({
                            enableListener: emptyListener,
                            disableListener: emptyClusterListener,
                            nodeCloseListener: emptyNodeListener,
                            snapshotListener: emptyClusterListener
                        });
                        policy = new aerospike_1.MetricsPolicy({
                            metricsListeners: listeners,
                        });
                        return [2 /*return*/];
                    });
                });
            });
            it('compiles reportDir', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var policy;
                    return __generator(this, function (_a) {
                        policy = new aerospike_1.MetricsPolicy({
                            reportDir: '.',
                        });
                        return [2 /*return*/];
                    });
                });
            });
            it('compiles reportSizeLimit', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var policy;
                    return __generator(this, function (_a) {
                        policy = new aerospike_1.MetricsPolicy({
                            reportSizeLimit: 2000000,
                        });
                        return [2 /*return*/];
                    });
                });
            });
            it('compiles interval', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var policy;
                    return __generator(this, function (_a) {
                        policy = new aerospike_1.MetricsPolicy({
                            interval: 20,
                        });
                        return [2 /*return*/];
                    });
                });
            });
            it('compiles latencyColumns', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var policy;
                    return __generator(this, function (_a) {
                        policy = new aerospike_1.MetricsPolicy({
                            latencyColumns: 9,
                        });
                        return [2 /*return*/];
                    });
                });
            });
            it('compiles latencyShift', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var policy;
                    return __generator(this, function (_a) {
                        policy = new aerospike_1.MetricsPolicy({
                            latencyShift: 9,
                        });
                        return [2 /*return*/];
                    });
                });
            });
            it('compiles labels', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var policy;
                    return __generator(this, function (_a) {
                        policy = new aerospike_1.MetricsPolicy({
                            labels: {
                                "label1": "label2"
                            },
                        });
                        return [2 /*return*/];
                    });
                });
            });
        });
        context('cluster', function () {
            var metrics = [
                {
                    connLatency: [1, 2],
                    writeLatency: [1, 2],
                    readLatency: [1, 2],
                    batchLatency: [1, 2],
                    queryLatency: [1, 2],
                    labels: { 'label1': 'label2' },
                    ns: 'test',
                    bytesIn: 174,
                    bytesOut: 153,
                    errorCount: 4,
                    timeoutCount: 8,
                    keyBusyCount: 14
                }
            ];
            var node = {
                name: 'A1',
                address: '127.0.0.1',
                port: 3000,
                conns: { inUse: 0, inPool: 0, opened: 0, closed: 0 },
                metrics: metrics
            };
            var cluster = {
                appId: 'example',
                clusterName: 'cluster',
                commandCount: 11,
                invalidNodeCount: 15,
                transactionCount: 20,
                retryCount: 26,
                delayQueueTimeoutCount: 33,
                eventLoop: { processSize: 41, queueSize: 50 },
                nodes: [node]
            };
            context('node', function () {
                it('compiles name', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            return [2 /*return*/];
                        });
                    });
                });
                it('compiles address', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            return [2 /*return*/];
                        });
                    });
                });
                it('compiles port', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            return [2 /*return*/];
                        });
                    });
                });
                it('compiles conns', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            return [2 /*return*/];
                        });
                    });
                });
                context('metrics', function () {
                    it('compiles connLatency', function () {
                        return __awaiter(this, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                return [2 /*return*/];
                            });
                        });
                    });
                    it('compiles writeLatency', function () {
                        return __awaiter(this, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                return [2 /*return*/];
                            });
                        });
                    });
                    it('compiles readLatency', function () {
                        return __awaiter(this, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                return [2 /*return*/];
                            });
                        });
                    });
                    it('compiles queryLatency', function () {
                        return __awaiter(this, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                return [2 /*return*/];
                            });
                        });
                    });
                    it('compiles batchLatency', function () {
                        return __awaiter(this, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                return [2 /*return*/];
                            });
                        });
                    });
                    it('compiles labels', function () {
                        return __awaiter(this, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                return [2 /*return*/];
                            });
                        });
                    });
                    it('compiles ns', function () {
                        return __awaiter(this, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                return [2 /*return*/];
                            });
                        });
                    });
                    it('compiles bytesIn', function () {
                        return __awaiter(this, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                return [2 /*return*/];
                            });
                        });
                    });
                    it('compiles bytesOut', function () {
                        return __awaiter(this, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                return [2 /*return*/];
                            });
                        });
                    });
                    it('compiles errorCount', function () {
                        return __awaiter(this, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                return [2 /*return*/];
                            });
                        });
                    });
                    it('compiles timeoutCount', function () {
                        return __awaiter(this, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                return [2 /*return*/];
                            });
                        });
                    });
                    it('compiles keyBusyCount', function () {
                        return __awaiter(this, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                return [2 /*return*/];
                            });
                        });
                    });
                });
            });
            it('compiles appId', function () {
                return __awaiter(this, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        return [2 /*return*/];
                    });
                });
            });
            it('compiles clusterName', function () {
                return __awaiter(this, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        return [2 /*return*/];
                    });
                });
            });
            it('compiles commandCount', function () {
                return __awaiter(this, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        return [2 /*return*/];
                    });
                });
            });
            it('compiles invalidNodeCount', function () {
                return __awaiter(this, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        return [2 /*return*/];
                    });
                });
            });
            it('compiles transactionCount', function () {
                return __awaiter(this, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        return [2 /*return*/];
                    });
                });
            });
            it('compiles retryCount', function () {
                return __awaiter(this, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        return [2 /*return*/];
                    });
                });
            });
            it('compiles delayQueueTimeoutCount', function () {
                return __awaiter(this, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        return [2 /*return*/];
                    });
                });
            });
            it('compiles eventLoop', function () {
                return __awaiter(this, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        return [2 /*return*/];
                    });
                });
            });
        });
        context('namespaceMetrics', function () {
            var metrics = {
                ns: 'test',
                bytesIn: 3407,
                bytesOut: 3406,
                timeoutCount: 2,
                keyBusyCount: 10,
                errorCount: 4,
                connLatency: [0, 0],
                writeLatency: [0, 0],
                readLatency: [0, 0],
                batchLatency: [0, 0],
                queryLatency: [0, 0]
            };
            it('compiles ns', function () {
                return __awaiter(this, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        return [2 /*return*/];
                    });
                });
            });
            it('compiles bytesIn', function () {
                return __awaiter(this, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        return [2 /*return*/];
                    });
                });
            });
            it('compiles bytesOut', function () {
                return __awaiter(this, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        return [2 /*return*/];
                    });
                });
            });
            it('compiles timeoutCount', function () {
                return __awaiter(this, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        return [2 /*return*/];
                    });
                });
            });
            it('compiles keyBusyCount', function () {
                return __awaiter(this, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        return [2 /*return*/];
                    });
                });
            });
            it('compiles errorCount', function () {
                return __awaiter(this, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        return [2 /*return*/];
                    });
                });
            });
            it('compiles connLatency', function () {
                return __awaiter(this, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        return [2 /*return*/];
                    });
                });
            });
            it('compiles writeLatency', function () {
                return __awaiter(this, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        return [2 /*return*/];
                    });
                });
            });
            it('compiles readLatency', function () {
                return __awaiter(this, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        return [2 /*return*/];
                    });
                });
            });
            it('compiles batchLatency', function () {
                return __awaiter(this, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        return [2 /*return*/];
                    });
                });
            });
            it('compiles queryLatency', function () {
                return __awaiter(this, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        return [2 /*return*/];
                    });
                });
            });
        });
        context('enableMetrics', function () {
            it('compiles when no args are provided', function () {
                return __awaiter(this, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, client.enableMetrics()];
                            case 1:
                                _a.sent();
                                return [4 /*yield*/, client.disableMetrics()];
                            case 2:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                });
            });
            it('compiles when a metricsPolicy is provided', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var policy;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                policy = new aerospike_1.MetricsPolicy({
                                    interval: 100,
                                });
                                return [4 /*yield*/, client.enableMetrics()];
                            case 1:
                                _a.sent();
                                return [4 /*yield*/, client.disableMetrics()];
                            case 2:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
        context('disableMetrics', function () {
            it('compiles when no args are provided', function () {
                return __awaiter(this, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, client.disableMetrics()];
                            case 1:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
    });
});
