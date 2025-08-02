// *****************************************************************************
// Copyright 2013-2023 Aerospike, Inc.
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
var fs = require('fs');
var chai_1 = require("chai");
var helper = require("./test_helper");
var keygen = helper.keygen;
var metagen = helper.metagen;
var recgen = helper.recgen;
var status = aerospike_1.default.status;
describe('Dynamic Config tests', function () {
    return __awaiter(this, void 0, void 0, function () {
        var key, client, dyn_config_path, dyn_config_path_edit, dyn_config_path_permissions, dyn_config_path_send_key_true, dyn_config_path_metrics_disabled;
        return __generator(this, function (_a) {
            helper.skipUnlessDynamicConfig(this);
            this.timeout(40000);
            helper.skipUnlessDynamicConfig(this);
            key = new aerospike_1.default.Key(helper.namespace, helper.set, 'test/dynamic_config/1');
            client = helper.client;
            dyn_config_path = "./dist/dyn_config.yml";
            dyn_config_path_edit = "./dist/dyn_config_edit.yml";
            dyn_config_path_permissions = "./dist/dyn_config_permissions.yml";
            dyn_config_path_send_key_true = "./dist/dyn_config_send_key_true.yml";
            dyn_config_path_metrics_disabled = "./dist/dyn_config_path_metrics_disabled.yml";
            context('API and Functionality tests', function () {
                return __awaiter(this, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        before(function () {
                            return __awaiter(this, void 0, void 0, function () {
                                var error_1;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            _a.trys.push([0, 2, , 3]);
                                            return [4 /*yield*/, client.truncate(helper.namespace, helper.set, 0)];
                                        case 1:
                                            _a.sent();
                                            return [3 /*break*/, 3];
                                        case 2:
                                            error_1 = _a.sent();
                                            return [2 /*return*/];
                                        case 3: return [2 /*return*/];
                                    }
                                });
                            });
                        });
                        afterEach(function () {
                            return __awaiter(this, void 0, void 0, function () {
                                var error_2;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            _a.trys.push([0, 2, , 3]);
                                            return [4 /*yield*/, client.remove(key)];
                                        case 1:
                                            _a.sent();
                                            return [3 /*break*/, 3];
                                        case 2:
                                            error_2 = _a.sent();
                                            return [2 /*return*/];
                                        case 3: return [2 /*return*/];
                                    }
                                });
                            });
                        });
                        context('Positive tests', function () {
                            context('configProvider', function () {
                                return __awaiter(this, void 0, void 0, function () {
                                    return __generator(this, function (_a) {
                                        context('interval', function () {
                                            return __awaiter(this, void 0, void 0, function () {
                                                return __generator(this, function (_a) {
                                                    it('Can accept a valid interval value', function () {
                                                        return __awaiter(this, void 0, void 0, function () {
                                                            var config, dummyClient;
                                                            return __generator(this, function (_a) {
                                                                switch (_a.label) {
                                                                    case 0:
                                                                        config = {
                                                                            hosts: helper.config.hosts,
                                                                            user: helper.config.user,
                                                                            password: helper.config.password,
                                                                            configProvider: {
                                                                                path: dyn_config_path,
                                                                                interval: 10000
                                                                            }
                                                                        };
                                                                        dummyClient = null;
                                                                        _a.label = 1;
                                                                    case 1:
                                                                        _a.trys.push([1, , 4, 7]);
                                                                        return [4 /*yield*/, aerospike_1.default.connect(config)];
                                                                    case 2:
                                                                        dummyClient = _a.sent();
                                                                        return [4 /*yield*/, dummyClient.close()];
                                                                    case 3:
                                                                        _a.sent();
                                                                        return [3 /*break*/, 7];
                                                                    case 4:
                                                                        if (!dummyClient) return [3 /*break*/, 6];
                                                                        return [4 /*yield*/, dummyClient.close()];
                                                                    case 5:
                                                                        _a.sent();
                                                                        _a.label = 6;
                                                                    case 6: return [7 /*endfinally*/];
                                                                    case 7: return [2 /*return*/];
                                                                }
                                                            });
                                                        });
                                                    });
                                                    it('Uses the specified interval rather than default', function () {
                                                        return __awaiter(this, void 0, void 0, function () {
                                                            var config, dummyClient, error_3, query, records, filePath, lineNumber, newLine, lines;
                                                            return __generator(this, function (_a) {
                                                                switch (_a.label) {
                                                                    case 0:
                                                                        config = {
                                                                            hosts: helper.config.hosts,
                                                                            user: helper.config.user,
                                                                            password: helper.config.password,
                                                                            configProvider: {
                                                                                path: dyn_config_path_edit,
                                                                                interval: 1000
                                                                            }
                                                                        };
                                                                        dummyClient = null;
                                                                        _a.label = 1;
                                                                    case 1:
                                                                        _a.trys.push([1, , 16, 19]);
                                                                        return [4 /*yield*/, aerospike_1.default.connect(config)];
                                                                    case 2:
                                                                        dummyClient = _a.sent();
                                                                        return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 3000); })];
                                                                    case 3:
                                                                        _a.sent();
                                                                        _a.label = 4;
                                                                    case 4:
                                                                        _a.trys.push([4, 6, , 7]);
                                                                        return [4 /*yield*/, dummyClient.remove(key)];
                                                                    case 5:
                                                                        _a.sent();
                                                                        return [3 /*break*/, 7];
                                                                    case 6:
                                                                        error_3 = _a.sent();
                                                                        return [3 /*break*/, 7];
                                                                    case 7: return [4 /*yield*/, dummyClient.put(key, { "a": 1 })];
                                                                    case 8:
                                                                        _a.sent();
                                                                        query = dummyClient.query(helper.namespace, helper.set);
                                                                        return [4 /*yield*/, query.results()];
                                                                    case 9:
                                                                        records = _a.sent();
                                                                        (0, chai_1.expect)(records[0].key.key).to.not.be.undefined;
                                                                        filePath = dyn_config_path_edit;
                                                                        lineNumber = 10;
                                                                        newLine = '    send_key: false';
                                                                        lines = fs.readFileSync(filePath, 'utf-8').split('\n');
                                                                        lines[lineNumber] = newLine;
                                                                        fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
                                                                        return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 5000); })];
                                                                    case 10:
                                                                        _a.sent();
                                                                        return [4 /*yield*/, dummyClient.remove(key)];
                                                                    case 11:
                                                                        _a.sent();
                                                                        return [4 /*yield*/, dummyClient.put(key, { "a": 1 })];
                                                                    case 12:
                                                                        _a.sent();
                                                                        query = dummyClient.query(helper.namespace, helper.set);
                                                                        return [4 /*yield*/, query.results()];
                                                                    case 13:
                                                                        records = _a.sent();
                                                                        (0, chai_1.expect)(records[0].key.key).to.be.undefined;
                                                                        return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 3000); })];
                                                                    case 14:
                                                                        _a.sent();
                                                                        newLine = '    send_key: true';
                                                                        lines = fs.readFileSync(filePath, 'utf-8').split('\n');
                                                                        lines[lineNumber] = newLine;
                                                                        fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
                                                                        return [4 /*yield*/, dummyClient.close()];
                                                                    case 15:
                                                                        _a.sent();
                                                                        return [3 /*break*/, 19];
                                                                    case 16:
                                                                        if (!dummyClient) return [3 /*break*/, 18];
                                                                        return [4 /*yield*/, dummyClient.close()];
                                                                    case 17:
                                                                        _a.sent();
                                                                        _a.label = 18;
                                                                    case 18: return [7 /*endfinally*/];
                                                                    case 19: return [2 /*return*/];
                                                                }
                                                            });
                                                        });
                                                    });
                                                    return [2 /*return*/];
                                                });
                                            });
                                        });
                                        context('path', function () {
                                            return __awaiter(this, void 0, void 0, function () {
                                                return __generator(this, function (_a) {
                                                    it('Loads dynamic config from configProvider', function () {
                                                        return __awaiter(this, void 0, void 0, function () {
                                                            var config, dummyClient, query, records;
                                                            return __generator(this, function (_a) {
                                                                switch (_a.label) {
                                                                    case 0:
                                                                        config = {
                                                                            hosts: helper.config.hosts,
                                                                            user: helper.config.user,
                                                                            password: helper.config.password,
                                                                            configProvider: {
                                                                                path: dyn_config_path_send_key_true,
                                                                                interval: 1000
                                                                            }
                                                                        };
                                                                        dummyClient = null;
                                                                        _a.label = 1;
                                                                    case 1:
                                                                        _a.trys.push([1, , 8, 11]);
                                                                        return [4 /*yield*/, aerospike_1.default.connect(config)];
                                                                    case 2:
                                                                        dummyClient = _a.sent();
                                                                        return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 3000); })];
                                                                    case 3:
                                                                        _a.sent();
                                                                        return [4 /*yield*/, dummyClient.put(key, { "a": 1 })];
                                                                    case 4:
                                                                        _a.sent();
                                                                        query = dummyClient.query(helper.namespace, helper.set);
                                                                        return [4 /*yield*/, query.results()];
                                                                    case 5:
                                                                        records = _a.sent();
                                                                        return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 3000); })];
                                                                    case 6:
                                                                        _a.sent();
                                                                        (0, chai_1.expect)(records[0].key.key).to.not.be.undefined;
                                                                        return [4 /*yield*/, dummyClient.close()];
                                                                    case 7:
                                                                        _a.sent();
                                                                        return [3 /*break*/, 11];
                                                                    case 8:
                                                                        if (!dummyClient) return [3 /*break*/, 10];
                                                                        return [4 /*yield*/, dummyClient.close()];
                                                                    case 9:
                                                                        _a.sent();
                                                                        _a.label = 10;
                                                                    case 10: return [7 /*endfinally*/];
                                                                    case 11: return [2 /*return*/];
                                                                }
                                                            });
                                                        });
                                                    });
                                                    return [2 /*return*/];
                                                });
                                            });
                                        });
                                        context('metrics', function () {
                                            return __awaiter(this, void 0, void 0, function () {
                                                return __generator(this, function (_a) {
                                                    it('enableMetrics does not override the dynamic config and no error is thrown', function () {
                                                        return __awaiter(this, void 0, void 0, function () {
                                                            var config, dummyClient;
                                                            return __generator(this, function (_a) {
                                                                switch (_a.label) {
                                                                    case 0:
                                                                        config = {
                                                                            hosts: helper.config.hosts,
                                                                            user: helper.config.user,
                                                                            password: helper.config.password,
                                                                        };
                                                                        config.configProvider = {
                                                                            path: dyn_config_path_metrics_disabled,
                                                                            interval: 1000
                                                                        };
                                                                        dummyClient = null;
                                                                        _a.label = 1;
                                                                    case 1:
                                                                        _a.trys.push([1, , 4, 7]);
                                                                        return [4 /*yield*/, aerospike_1.default.connect(config)];
                                                                    case 2:
                                                                        dummyClient = _a.sent();
                                                                        return [4 /*yield*/, dummyClient.enableMetrics()];
                                                                    case 3:
                                                                        _a.sent();
                                                                        return [3 /*break*/, 7];
                                                                    case 4:
                                                                        if (!dummyClient) return [3 /*break*/, 6];
                                                                        return [4 /*yield*/, dummyClient.close()];
                                                                    case 5:
                                                                        _a.sent();
                                                                        _a.label = 6;
                                                                    case 6: return [7 /*endfinally*/];
                                                                    case 7: return [2 /*return*/];
                                                                }
                                                            });
                                                        });
                                                    });
                                                    it('disableMetrics does not override the dynamic config and no error is thrown', function () {
                                                        return __awaiter(this, void 0, void 0, function () {
                                                            var config, dummyClient;
                                                            return __generator(this, function (_a) {
                                                                switch (_a.label) {
                                                                    case 0:
                                                                        config = {
                                                                            hosts: helper.config.hosts,
                                                                            user: helper.config.user,
                                                                            password: helper.config.password,
                                                                        };
                                                                        config.configProvider = {
                                                                            path: dyn_config_path,
                                                                            interval: 1000
                                                                        };
                                                                        dummyClient = null;
                                                                        _a.label = 1;
                                                                    case 1:
                                                                        _a.trys.push([1, , 4, 7]);
                                                                        return [4 /*yield*/, aerospike_1.default.connect(config)];
                                                                    case 2:
                                                                        dummyClient = _a.sent();
                                                                        return [4 /*yield*/, dummyClient.disableMetrics()];
                                                                    case 3:
                                                                        _a.sent();
                                                                        return [3 /*break*/, 7];
                                                                    case 4:
                                                                        if (!dummyClient) return [3 /*break*/, 6];
                                                                        return [4 /*yield*/, dummyClient.close()];
                                                                    case 5:
                                                                        _a.sent();
                                                                        _a.label = 6;
                                                                    case 6: return [7 /*endfinally*/];
                                                                    case 7: return [2 /*return*/];
                                                                }
                                                            });
                                                        });
                                                    });
                                                    return [2 /*return*/];
                                                });
                                            });
                                        });
                                        context('miscellaneous', function () {
                                            return __awaiter(this, void 0, void 0, function () {
                                                return __generator(this, function (_a) {
                                                    it('Loads dynamic config from AEROSPIKE_CLIENT_CONFIG_URL', function () {
                                                        return __awaiter(this, void 0, void 0, function () {
                                                            var config, dummyClient, error_4, record, query, records;
                                                            return __generator(this, function (_a) {
                                                                switch (_a.label) {
                                                                    case 0:
                                                                        config = {
                                                                            hosts: helper.config.hosts,
                                                                            user: helper.config.user,
                                                                            password: helper.config.password,
                                                                        };
                                                                        process.env.AEROSPIKE_CLIENT_CONFIG_URL = dyn_config_path;
                                                                        config.policies = {
                                                                            write: new aerospike_1.default.WritePolicy({
                                                                                key: aerospike_1.default.policy.key.SEND
                                                                            })
                                                                        };
                                                                        dummyClient = null;
                                                                        _a.label = 1;
                                                                    case 1:
                                                                        _a.trys.push([1, , 11, 14]);
                                                                        return [4 /*yield*/, aerospike_1.default.connect(config)];
                                                                    case 2:
                                                                        dummyClient = _a.sent();
                                                                        _a.label = 3;
                                                                    case 3:
                                                                        _a.trys.push([3, 5, , 6]);
                                                                        return [4 /*yield*/, dummyClient.remove(key)];
                                                                    case 4:
                                                                        _a.sent();
                                                                        return [3 /*break*/, 6];
                                                                    case 5:
                                                                        error_4 = _a.sent();
                                                                        return [3 /*break*/, 6];
                                                                    case 6: return [4 /*yield*/, dummyClient.put(key, { "a": 1 })];
                                                                    case 7:
                                                                        record = _a.sent();
                                                                        query = dummyClient.query(helper.namespace, helper.set);
                                                                        return [4 /*yield*/, query.results()];
                                                                    case 8:
                                                                        records = _a.sent();
                                                                        return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 2000); })];
                                                                    case 9:
                                                                        _a.sent();
                                                                        (0, chai_1.expect)(records[0].key.key).to.be.undefined;
                                                                        return [4 /*yield*/, dummyClient.close()];
                                                                    case 10:
                                                                        _a.sent();
                                                                        return [3 /*break*/, 14];
                                                                    case 11:
                                                                        if (!dummyClient) return [3 /*break*/, 13];
                                                                        return [4 /*yield*/, dummyClient.close()];
                                                                    case 12:
                                                                        _a.sent();
                                                                        _a.label = 13;
                                                                    case 13: return [7 /*endfinally*/];
                                                                    case 14: return [2 /*return*/];
                                                                }
                                                            });
                                                        });
                                                    });
                                                    it('Prefers the AEROSPIKE_CLIENT_CONFIG_URL value over the command-level policy', function () {
                                                        return __awaiter(this, void 0, void 0, function () {
                                                            var config, dummyClient, error_5, record, query, records;
                                                            return __generator(this, function (_a) {
                                                                switch (_a.label) {
                                                                    case 0:
                                                                        config = {
                                                                            hosts: helper.config.hosts,
                                                                            user: helper.config.user,
                                                                            password: helper.config.password,
                                                                        };
                                                                        process.env.AEROSPIKE_CLIENT_CONFIG_URL = dyn_config_path;
                                                                        config.policies = {
                                                                            write: new aerospike_1.default.WritePolicy({
                                                                                key: aerospike_1.default.policy.key.SEND
                                                                            })
                                                                        };
                                                                        dummyClient = null;
                                                                        _a.label = 1;
                                                                    case 1:
                                                                        _a.trys.push([1, , 11, 14]);
                                                                        return [4 /*yield*/, aerospike_1.default.connect(config)];
                                                                    case 2:
                                                                        dummyClient = _a.sent();
                                                                        return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 3000); })];
                                                                    case 3:
                                                                        _a.sent();
                                                                        _a.label = 4;
                                                                    case 4:
                                                                        _a.trys.push([4, 6, , 7]);
                                                                        return [4 /*yield*/, dummyClient.remove(key)];
                                                                    case 5:
                                                                        _a.sent();
                                                                        return [3 /*break*/, 7];
                                                                    case 6:
                                                                        error_5 = _a.sent();
                                                                        return [3 /*break*/, 7];
                                                                    case 7: return [4 /*yield*/, dummyClient.put(key, { "a": 1 })];
                                                                    case 8:
                                                                        record = _a.sent();
                                                                        query = dummyClient.query(helper.namespace, helper.set);
                                                                        return [4 /*yield*/, query.results()];
                                                                    case 9:
                                                                        records = _a.sent();
                                                                        return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 3000); })];
                                                                    case 10:
                                                                        _a.sent();
                                                                        (0, chai_1.expect)(records[0].key.key).to.be.undefined;
                                                                        return [3 /*break*/, 14];
                                                                    case 11:
                                                                        if (!dummyClient) return [3 /*break*/, 13];
                                                                        return [4 /*yield*/, dummyClient.close()];
                                                                    case 12:
                                                                        _a.sent();
                                                                        _a.label = 13;
                                                                    case 13:
                                                                        process.env.AEROSPIKE_CLIENT_CONFIG_URL = '';
                                                                        return [7 /*endfinally*/];
                                                                    case 14: return [2 /*return*/];
                                                                }
                                                            });
                                                        });
                                                    });
                                                    it('Prefers the configProvider value over the command-level policy', function () {
                                                        return __awaiter(this, void 0, void 0, function () {
                                                            var config, dummyClient, error_6, record, query, records;
                                                            return __generator(this, function (_a) {
                                                                switch (_a.label) {
                                                                    case 0:
                                                                        config = {
                                                                            hosts: helper.config.hosts,
                                                                            user: helper.config.user,
                                                                            password: helper.config.password,
                                                                        };
                                                                        config.configProvider = {
                                                                            path: dyn_config_path,
                                                                            interval: 1000
                                                                        };
                                                                        dummyClient = null;
                                                                        _a.label = 1;
                                                                    case 1:
                                                                        _a.trys.push([1, , 11, 14]);
                                                                        return [4 /*yield*/, aerospike_1.default.connect(config)];
                                                                    case 2:
                                                                        dummyClient = _a.sent();
                                                                        return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 6000); })];
                                                                    case 3:
                                                                        _a.sent();
                                                                        _a.label = 4;
                                                                    case 4:
                                                                        _a.trys.push([4, 6, , 7]);
                                                                        return [4 /*yield*/, dummyClient.remove(key)];
                                                                    case 5:
                                                                        _a.sent();
                                                                        return [3 /*break*/, 7];
                                                                    case 6:
                                                                        error_6 = _a.sent();
                                                                        return [3 /*break*/, 7];
                                                                    case 7: return [4 /*yield*/, dummyClient.put(key, { "a": 1 })];
                                                                    case 8:
                                                                        record = _a.sent();
                                                                        query = dummyClient.query(helper.namespace, helper.set);
                                                                        return [4 /*yield*/, query.results()];
                                                                    case 9:
                                                                        records = _a.sent();
                                                                        (0, chai_1.expect)(records[0].key.key).to.be.undefined;
                                                                        return [4 /*yield*/, dummyClient.close()];
                                                                    case 10:
                                                                        _a.sent();
                                                                        return [3 /*break*/, 14];
                                                                    case 11:
                                                                        if (!dummyClient) return [3 /*break*/, 13];
                                                                        return [4 /*yield*/, dummyClient.close()];
                                                                    case 12:
                                                                        _a.sent();
                                                                        _a.label = 13;
                                                                    case 13: return [7 /*endfinally*/];
                                                                    case 14: return [2 /*return*/];
                                                                }
                                                            });
                                                        });
                                                    });
                                                    it('Prefers the AEROSPIKE_CLIENT_CONFIG_URL value over all other values', function () {
                                                        return __awaiter(this, void 0, void 0, function () {
                                                            var config, dummyClient, error_7, record, query, records;
                                                            return __generator(this, function (_a) {
                                                                switch (_a.label) {
                                                                    case 0:
                                                                        config = {
                                                                            hosts: helper.config.hosts,
                                                                            user: helper.config.user,
                                                                            password: helper.config.password,
                                                                        };
                                                                        process.env.AEROSPIKE_CLIENT_CONFIG_URL = dyn_config_path;
                                                                        config.configProvider = {
                                                                            path: dyn_config_path_send_key_true,
                                                                            interval: 1000
                                                                        };
                                                                        config.policies = {
                                                                            write: new aerospike_1.default.WritePolicy({
                                                                                key: aerospike_1.default.policy.key.SEND
                                                                            })
                                                                        };
                                                                        dummyClient = null;
                                                                        _a.label = 1;
                                                                    case 1:
                                                                        _a.trys.push([1, , 12, 15]);
                                                                        return [4 /*yield*/, aerospike_1.default.connect(config)];
                                                                    case 2:
                                                                        dummyClient = _a.sent();
                                                                        return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 3000); })];
                                                                    case 3:
                                                                        _a.sent();
                                                                        _a.label = 4;
                                                                    case 4:
                                                                        _a.trys.push([4, 6, , 7]);
                                                                        return [4 /*yield*/, dummyClient.remove(key)];
                                                                    case 5:
                                                                        _a.sent();
                                                                        return [3 /*break*/, 7];
                                                                    case 6:
                                                                        error_7 = _a.sent();
                                                                        return [3 /*break*/, 7];
                                                                    case 7: return [4 /*yield*/, dummyClient.put(key, { "a": 1 })];
                                                                    case 8:
                                                                        record = _a.sent();
                                                                        query = dummyClient.query(helper.namespace, helper.set);
                                                                        return [4 /*yield*/, query.results()];
                                                                    case 9:
                                                                        records = _a.sent();
                                                                        return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 3000); })];
                                                                    case 10:
                                                                        _a.sent();
                                                                        (0, chai_1.expect)(records[0].key.key).to.be.undefined;
                                                                        return [4 /*yield*/, dummyClient.close()];
                                                                    case 11:
                                                                        _a.sent();
                                                                        return [3 /*break*/, 15];
                                                                    case 12:
                                                                        if (!dummyClient) return [3 /*break*/, 14];
                                                                        return [4 /*yield*/, dummyClient.close()];
                                                                    case 13:
                                                                        _a.sent();
                                                                        _a.label = 14;
                                                                    case 14: return [7 /*endfinally*/];
                                                                    case 15: return [2 /*return*/];
                                                                }
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
                        });
                        context('Negative tests', function () {
                            context('configProvider', function () {
                                context('path', function () {
                                    it('Fails when path value is invalid', function () {
                                        return __awaiter(this, void 0, void 0, function () {
                                            var config, dummyClient, error_8;
                                            return __generator(this, function (_a) {
                                                switch (_a.label) {
                                                    case 0:
                                                        config = {
                                                            hosts: helper.config.hosts,
                                                            user: helper.config.user,
                                                            password: helper.config.password,
                                                        };
                                                        config.configProvider = {
                                                            path: 10,
                                                        };
                                                        dummyClient = null;
                                                        _a.label = 1;
                                                    case 1:
                                                        _a.trys.push([1, 3, , 4]);
                                                        return [4 /*yield*/, aerospike_1.default.connect(config)];
                                                    case 2:
                                                        dummyClient = _a.sent();
                                                        chai_1.assert.fail('AN ERROR SHOULD HAVE BEEN THROWN');
                                                        return [3 /*break*/, 4];
                                                    case 3:
                                                        error_8 = _a.sent();
                                                        (0, chai_1.expect)(error_8.message).to.eql('Invalid client configuration');
                                                        return [3 /*break*/, 4];
                                                    case 4: return [2 /*return*/];
                                                }
                                            });
                                        });
                                    });
                                    it('Does not crash when path does not exist', function () {
                                        return __awaiter(this, void 0, void 0, function () {
                                            var config, dummyClient;
                                            return __generator(this, function (_a) {
                                                switch (_a.label) {
                                                    case 0:
                                                        config = {
                                                            hosts: helper.config.hosts,
                                                            user: helper.config.user,
                                                            password: helper.config.password,
                                                        };
                                                        config.configProvider = {
                                                            path: 'fake/directory/',
                                                        };
                                                        dummyClient = null;
                                                        return [4 /*yield*/, aerospike_1.default.connect(config)];
                                                    case 1:
                                                        dummyClient = _a.sent();
                                                        return [4 /*yield*/, dummyClient.close()];
                                                    case 2:
                                                        _a.sent();
                                                        return [2 /*return*/];
                                                }
                                            });
                                        });
                                    });
                                });
                                context('interval', function () {
                                    it('Fails when value is invalid', function () {
                                        return __awaiter(this, void 0, void 0, function () {
                                            var config, dummyClient, error_9;
                                            return __generator(this, function (_a) {
                                                switch (_a.label) {
                                                    case 0:
                                                        config = {
                                                            hosts: helper.config.hosts,
                                                            user: helper.config.user,
                                                            password: helper.config.password,
                                                        };
                                                        config.configProvider = {
                                                            interval: 'invalid',
                                                        };
                                                        dummyClient = null;
                                                        _a.label = 1;
                                                    case 1:
                                                        _a.trys.push([1, 3, , 4]);
                                                        return [4 /*yield*/, aerospike_1.default.connect(config)];
                                                    case 2:
                                                        dummyClient = _a.sent();
                                                        chai_1.assert.fail('AN ERROR SHOULD HAVE BEEN THROWN');
                                                        return [3 /*break*/, 4];
                                                    case 3:
                                                        error_9 = _a.sent();
                                                        (0, chai_1.expect)(error_9.message).to.eql('Invalid client configuration');
                                                        return [3 /*break*/, 4];
                                                    case 4: return [2 /*return*/];
                                                }
                                            });
                                        });
                                    });
                                    it('Fails when value is too small', function () {
                                        return __awaiter(this, void 0, void 0, function () {
                                            var config, dummyClient, record, error_10;
                                            return __generator(this, function (_a) {
                                                switch (_a.label) {
                                                    case 0:
                                                        config = {
                                                            hosts: helper.config.hosts,
                                                            user: helper.config.user,
                                                            password: helper.config.password,
                                                        };
                                                        config.configProvider = {
                                                            path: dyn_config_path,
                                                            interval: 1,
                                                        };
                                                        dummyClient = null;
                                                        _a.label = 1;
                                                    case 1:
                                                        _a.trys.push([1, 5, 6, 9]);
                                                        return [4 /*yield*/, aerospike_1.default.connect(config)];
                                                    case 2:
                                                        dummyClient = _a.sent();
                                                        return [4 /*yield*/, dummyClient.put(key, { "a": 1 })];
                                                    case 3:
                                                        record = _a.sent();
                                                        return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 3000); })];
                                                    case 4:
                                                        _a.sent();
                                                        chai_1.assert.fail('AN ERROR SHOULD HAVE BEEN THROWN');
                                                        return [3 /*break*/, 9];
                                                    case 5:
                                                        error_10 = _a.sent();
                                                        (0, chai_1.expect)(error_10.message).to.eql('Dynamic config interval 1 must be greater or equal to the tend interval 1000');
                                                        return [3 /*break*/, 9];
                                                    case 6:
                                                        if (!dummyClient) return [3 /*break*/, 8];
                                                        return [4 /*yield*/, dummyClient.close()];
                                                    case 7:
                                                        _a.sent();
                                                        _a.label = 8;
                                                    case 8: return [7 /*endfinally*/];
                                                    case 9: return [2 /*return*/];
                                                }
                                            });
                                        });
                                    });
                                    it('Fails when value is a decimal', function () {
                                        return __awaiter(this, void 0, void 0, function () {
                                            var config, dummyClient, record, error_11;
                                            return __generator(this, function (_a) {
                                                switch (_a.label) {
                                                    case 0:
                                                        config = {
                                                            hosts: helper.config.hosts,
                                                            user: helper.config.user,
                                                            password: helper.config.password,
                                                        };
                                                        config.configProvider = {
                                                            path: dyn_config_path_send_key_true,
                                                            interval: 0.20,
                                                        };
                                                        dummyClient = null;
                                                        _a.label = 1;
                                                    case 1:
                                                        _a.trys.push([1, 5, 6, 9]);
                                                        return [4 /*yield*/, aerospike_1.default.connect(config)];
                                                    case 2:
                                                        dummyClient = _a.sent();
                                                        return [4 /*yield*/, dummyClient.put(key, { "a": 1 })];
                                                    case 3:
                                                        record = _a.sent();
                                                        return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 3000); })];
                                                    case 4:
                                                        _a.sent();
                                                        chai_1.assert.fail('AN ERROR SHOULD HAVE BEEN THROWN');
                                                        return [3 /*break*/, 9];
                                                    case 5:
                                                        error_11 = _a.sent();
                                                        (0, chai_1.expect)(error_11.message).to.eql('Dynamic config interval 0 must be greater or equal to the tend interval 1000');
                                                        return [3 /*break*/, 9];
                                                    case 6:
                                                        if (!dummyClient) return [3 /*break*/, 8];
                                                        return [4 /*yield*/, dummyClient.close()];
                                                    case 7:
                                                        _a.sent();
                                                        _a.label = 8;
                                                    case 8: return [7 /*endfinally*/];
                                                    case 9: return [2 /*return*/];
                                                }
                                            });
                                        });
                                    });
                                });
                            });
                        });
                        return [2 /*return*/];
                    });
                });
            });
            context('API and Functionality tests', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var configProvider;
                    return __generator(this, function (_a) {
                        configProvider = {
                            path: 'b',
                            interval: 10000
                        };
                        it('compiles interval', function () {
                            return __awaiter(this, void 0, void 0, function () {
                                var configProvider;
                                return __generator(this, function (_a) {
                                    configProvider = {
                                        interval: 20000
                                    };
                                    return [2 /*return*/];
                                });
                            });
                        });
                        it('compiles path', function () {
                            return __awaiter(this, void 0, void 0, function () {
                                var configProvider;
                                return __generator(this, function (_a) {
                                    configProvider = {
                                        path: 'a'
                                    };
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
