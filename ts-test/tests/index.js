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
var helper = require("./test_helper");
var Job = aerospike_1.default.Job;
var IndexJob = aerospike_1.default.IndexJob;
var Context = aerospike_1.default.cdt.Context;
context('secondary indexes', function () {
    var client = helper.client;
    // generate unique index name for each test
    var testIndex = { name: null, bin: null, counter: 0 };
    beforeEach(function () {
        testIndex.counter++;
        testIndex.name = 'idx-' + testIndex.counter + '-' + Math.floor(Math.random() * 10000000);
        testIndex.bin = 'bin-' + testIndex.counter + '-' + Math.floor(Math.random() * 10000000);
    });
    function verifyIndexExists(namespace, indexName) {
        var sindex = 'sindex/' + namespace + '/' + indexName;
        var checkStatus = function () {
            return client.infoAll(sindex)
                .then(function () { return true; })
                .catch(function (error) {
                if (error.code !== aerospike_1.default.status.ERR_INDEX_NOT_FOUND) {
                    return Promise.reject(error);
                }
                return false;
            });
        };
        return Job.pollUntilDone(checkStatus, 10)
            .then(function () { return helper.index.remove(indexName); });
    }
    describe('Client#indexCreate()', function () {
        it('returns an IndexJob instance', function () {
            var options = {
                ns: helper.namespace,
                set: helper.set,
                bin: testIndex.bin,
                index: testIndex.name,
                datatype: aerospike_1.default.indexDataType.NUMERIC
            };
            return client.createIndex(options)
                .then(function (job) { return (0, chai_1.expect)(job).to.be.instanceof(IndexJob); })
                .then(function () { return verifyIndexExists(helper.namespace, testIndex.name); });
        });
        it('should create a complex index on list', function () {
            var options = {
                ns: helper.namespace,
                set: helper.set,
                bin: testIndex.bin,
                index: testIndex.name,
                type: aerospike_1.default.indexType.LIST,
                datatype: aerospike_1.default.indexDataType.NUMERIC
            };
            return client.createIndex(options)
                .then(function () { return verifyIndexExists(helper.namespace, testIndex.name); });
        });
        it('should create an index with CDT Context', function () {
            var options = {
                ns: helper.namespace,
                set: helper.set,
                bin: testIndex.bin,
                index: testIndex.name,
                type: aerospike_1.default.indexType.LIST,
                datatype: aerospike_1.default.indexDataType.NUMERIC,
                context: new Context().addListIndex(0)
            };
            return client.createIndex(options)
                .then(function () { return verifyIndexExists(helper.namespace, testIndex.name); });
        });
        it('should not create an index with CDT Context \'addListIndexCreate\'', function () {
            var options = {
                ns: helper.namespace,
                set: helper.set,
                bin: testIndex.bin,
                index: testIndex.name,
                type: aerospike_1.default.indexType.LIST,
                datatype: aerospike_1.default.indexDataType.NUMERIC,
                context: new Context().addListIndexCreate(0, 0, false)
            };
            return client.createIndex(options)
                .then(function () { return (0, chai_1.expect)(1).to.equal(2); })
                .catch(function () { (0, chai_1.expect)('pass').to.equal('pass'); });
        });
        it('should create an integer index with info policy', function () {
            var options = {
                ns: helper.namespace,
                set: helper.set,
                bin: testIndex.bin,
                index: testIndex.name,
                datatype: aerospike_1.default.indexDataType.NUMERIC
            };
            var policy = new aerospike_1.default.InfoPolicy({
                timeout: 100
            });
            return client.createIndex(options, policy)
                .then(function () { return verifyIndexExists(helper.namespace, testIndex.name); });
        });
        it('re-creating an index with identical options returns an error (success with new server, verify the existence)', function () {
            var options = {
                ns: helper.namespace,
                set: helper.set,
                bin: testIndex.bin,
                index: testIndex.name,
                datatype: aerospike_1.default.indexDataType.NUMERIC
            };
            return client.createIndex(options)
                .then(function (job) { return job.wait(10); })
                .then(function () { return client.createIndex(options)
                .catch(function (error) {
                if (error.code === aerospike_1.default.status.ERR_INDEX_FOUND ||
                    error.code === aerospike_1.default.status.AEROSPIKE_OK) {
                    // All good!
                    verifyIndexExists(helper.namespace, testIndex.name);
                }
                else {
                    return Promise.reject(error);
                }
            }); });
        });
    });
    describe('Client#createIntegerIndex()', function () {
        it('should create an integer index', function () {
            var options = {
                ns: helper.namespace,
                set: helper.set,
                bin: testIndex.bin,
                index: testIndex.name
            };
            return client.createIntegerIndex(options)
                .then(function () { return verifyIndexExists(helper.namespace, testIndex.name); });
        });
    });
    describe('Client#createStringIndex()', function () {
        it('should create an string index', function () {
            var args = {
                ns: helper.namespace,
                set: helper.set,
                bin: testIndex.bin,
                index: testIndex.name
            };
            return client.createStringIndex(args)
                .then(function () { return verifyIndexExists(helper.namespace, testIndex.name); });
        });
    });
    describe('Client#createGeo2DSphereIndex()', function () {
        it('should create a geospatial index', function () {
            var args = {
                ns: helper.namespace,
                set: helper.set,
                bin: testIndex.bin,
                index: testIndex.name
            };
            return client.createGeo2DSphereIndex(args)
                .then(function () { return verifyIndexExists(helper.namespace, testIndex.name); });
        });
    });
    describe('Client#createBlobIndex()', function () {
        helper.skipUnlessVersion('>= 7.0.0', this);
        it('should create a blob index', function () {
            var args = {
                ns: helper.namespace,
                set: helper.set,
                bin: testIndex.bin,
                index: testIndex.name
            };
            return client.createBlobIndex(args)
                .then(function () { return verifyIndexExists(helper.namespace, testIndex.name); });
        });
    });
    describe('Client#indexRemove()', function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                beforeEach(function () { return __awaiter(_this, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, helper.index.create(testIndex.name, helper.set, testIndex.bin, aerospike_1.default.indexDataType.STRING, aerospike_1.default.indexType.DEFAULT)];
                            case 1:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                }); });
                it('should drop an index', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var query, error_1;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    // Wait for index creation to complete
                                    this.timeout(10000);
                                    return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 5000); })
                                        // Do query on the secondary index to ensure proper creation.
                                    ];
                                case 1:
                                    _a.sent();
                                    query = client.query(helper.namespace, helper.set);
                                    query.where(aerospike_1.default.filter.equal(testIndex.bin, 'value'));
                                    return [4 /*yield*/, query.results()];
                                case 2:
                                    _a.sent();
                                    return [4 /*yield*/, client.indexRemove(helper.namespace, testIndex.name)
                                        // Do query on the secondary index to ensure proper deletion
                                    ];
                                case 3:
                                    _a.sent();
                                    // Do query on the secondary index to ensure proper deletion
                                    query = client.query(helper.namespace, helper.set);
                                    query.where(aerospike_1.default.filter.equal(testIndex.bin, 'value'));
                                    _a.label = 4;
                                case 4:
                                    _a.trys.push([4, 6, , 7]);
                                    return [4 /*yield*/, query.results()
                                        // Fail test if this code is reached
                                    ];
                                case 5:
                                    _a.sent();
                                    // Fail test if this code is reached
                                    (0, chai_1.expect)('fail').to.equal('now');
                                    return [3 /*break*/, 7];
                                case 6:
                                    error_1 = _a.sent();
                                    (0, chai_1.expect)(error_1.code).to.equal(201);
                                    (0, chai_1.expect)('pass').to.equal('pass');
                                    return [3 /*break*/, 7];
                                case 7: return [2 /*return*/];
                            }
                        });
                    });
                });
                it('should return a Promise if called without callback function', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, client.indexRemove(helper.namespace, testIndex.name)];
                                case 1: return [2 /*return*/, _a.sent()];
                            }
                        });
                    });
                });
                return [2 /*return*/];
            });
        });
    });
});
