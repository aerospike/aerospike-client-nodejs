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
/* global expect, describe, it, context */
var aerospike_1 = require("aerospike");
var chai_1 = require("chai");
var helper = require("./test_helper");
var keygen = helper.keygen;
var metagen = helper.metagen;
var recgen = helper.recgen;
var valgen = helper.valgen;
var status = aerospike_1.default.status;
var AerospikeError = aerospike_1.default.AerospikeError;
var Double = aerospike_1.default.Double;
var GeoJSON = aerospike_1.default.GeoJSON;
describe('Metrics Key Busy', function () {
    helper.skipUnlessMetricsKeyBusy(this);
    var totalKeyBusyCount = 0;
    function emptyListener() {
    }
    function emptyNodeListener(node) {
    }
    function emptyClusterListener(cluster) {
    }
    function listenerTimeoutCount(cluster) {
        for (var _i = 0, _a = cluster.nodes; _i < _a.length; _i++) {
            var node = _a[_i];
            var NamespaceMetrics = node.metrics;
            for (var _b = 0, NamespaceMetrics_1 = NamespaceMetrics; _b < NamespaceMetrics_1.length; _b++) {
                var index = NamespaceMetrics_1[_b];
                totalKeyBusyCount += index.keyBusyCount;
            }
        }
        return;
    }
    it('should write and validate records', function () {
        return __awaiter(this, void 0, void 0, function () {
            var config, listeners, policy, dummyClient, promiseList, i, key, results, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        config = new aerospike_1.default.Config({
                            hosts: [
                                { addr: '0.0.0.0', port: 3100 },
                                { addr: '0.0.0.0', port: 3101 },
                                { addr: '0.0.0.0', port: 3102 },
                            ],
                            rackIds: [4, 2, 1],
                            rackAware: true,
                            policies: {
                                write: {
                                    replica: aerospike_1.default.policy.replica.PREFER_RACK,
                                },
                                read: {
                                    replica: aerospike_1.default.policy.replica.PREFER_RACK,
                                }
                            },
                            log: {
                                level: aerospike_1.default.log.TRACE,
                            }
                        });
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
                        return [4 /*yield*/, aerospike_1.default.connect(config)];
                    case 1:
                        dummyClient = _a.sent();
                        return [4 /*yield*/, dummyClient.enableMetrics(policy)];
                    case 2:
                        _a.sent();
                        promiseList = [];
                        for (i = 0; i < 100; i++) {
                            key = new aerospike_1.default.Key('test', 'demo', 1);
                            promiseList.push(dummyClient.put(key, { a: 1 }));
                            promiseList.push(dummyClient.get(key));
                        }
                        _a.label = 3;
                    case 3:
                        _a.trys.push([3, 5, , 6]);
                        return [4 /*yield*/, Promise.all(promiseList)];
                    case 4:
                        results = _a.sent();
                        return [3 /*break*/, 6];
                    case 5:
                        error_1 = _a.sent();
                        return [3 /*break*/, 6];
                    case 6: return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 3000); })];
                    case 7:
                        _a.sent();
                        (0, chai_1.expect)(totalKeyBusyCount).to.be.greaterThan(0);
                        return [4 /*yield*/, dummyClient.close()];
                    case 8:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    });
});
