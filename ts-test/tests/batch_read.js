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
/* eslint-disable no-unused-expressions */
var aerospike_1 = require("aerospike");
var helper = require("./test_helper");
var chai_1 = require("chai");
var keygen = helper.keygen;
var metagen = helper.metagen;
var recgen = helper.recgen;
var putgen = helper.putgen;
var valgen = helper.valgen;
var Key = aerospike_1.default.Key;
describe('client.batchRead()', function () {
    var client = helper.client;
    before(function () {
        var nrecords = 10;
        var generators = {
            keygen: keygen.string(helper.namespace, helper.set, { prefix: 'test/batch_read/', random: false }),
            recgen: recgen.record({
                i: valgen.integer(),
                s: valgen.string(),
                l: function () { return [1, 2, 3]; },
                m: function () { return { a: 1, b: 2, c: 3 }; }
            }),
            metagen: metagen.constant({ ttl: 1000 })
        };
        return putgen.put(nrecords, generators);
    });
    it('returns the status whether each key was found or not', function (done) {
        var batchRecords = [
            { key: new Key(helper.namespace, helper.set, 'test/batch_read/1') },
            { key: new Key(helper.namespace, helper.set, 'test/batch_read/3') },
            { key: new Key(helper.namespace, helper.set, 'test/batch_read/5') },
            { key: new Key(helper.namespace, helper.set, 'test/batch_read/no_such_key') },
            { key: new Key(helper.namespace, helper.set, 'test/batch_read/not_either') }
        ];
        client.batchRead(batchRecords, function (err, results) {
            (0, chai_1.expect)(err).not.to.be.ok;
            (0, chai_1.expect)(results === null || results === void 0 ? void 0 : results.length).to.equal(5);
            var found = results === null || results === void 0 ? void 0 : results.filter(function (result) { return (result === null || result === void 0 ? void 0 : result.status) === aerospike_1.default.status.OK; });
            (0, chai_1.expect)(found === null || found === void 0 ? void 0 : found.length).to.equal(3);
            var notFound = results === null || results === void 0 ? void 0 : results.filter(function (result) { return (result === null || result === void 0 ? void 0 : result.status) === aerospike_1.default.status.ERR_RECORD_NOT_FOUND; });
            (0, chai_1.expect)(notFound === null || notFound === void 0 ? void 0 : notFound.length).to.equal(2);
            done();
        });
    });
    it('returns only meta data if no bins are selected', function (done) {
        var batchRecords = [
            { key: new Key(helper.namespace, helper.set, 'test/batch_read/1') },
            { key: new Key(helper.namespace, helper.set, 'test/batch_read/3') },
            { key: new Key(helper.namespace, helper.set, 'test/batch_read/5') }
        ];
        client.batchRead(batchRecords, function (err, results) {
            (0, chai_1.expect)(err).not.to.be.ok;
            (0, chai_1.expect)(results === null || results === void 0 ? void 0 : results.length).to.equal(3);
            results === null || results === void 0 ? void 0 : results.forEach(function (result) {
                (0, chai_1.expect)(result === null || result === void 0 ? void 0 : result.status).to.equal(aerospike_1.default.status.OK);
                (0, chai_1.expect)(result === null || result === void 0 ? void 0 : result.record.bins).to.be.empty;
            });
            done();
        });
    });
    it('returns just the selected bins', function (done) {
        var batchRecords = [
            { key: new Key(helper.namespace, helper.set, 'test/batch_read/1'), bins: ['i'] },
            { key: new Key(helper.namespace, helper.set, 'test/batch_read/3'), bins: ['i'] },
            { key: new Key(helper.namespace, helper.set, 'test/batch_read/5'), bins: ['i'] }
        ];
        client.batchRead(batchRecords, function (err, results) {
            (0, chai_1.expect)(err).not.to.be.ok;
            (0, chai_1.expect)(results === null || results === void 0 ? void 0 : results.length).to.equal(3);
            results === null || results === void 0 ? void 0 : results.forEach(function (result) {
                (0, chai_1.expect)(result === null || result === void 0 ? void 0 : result.status).to.equal(aerospike_1.default.status.OK);
                (0, chai_1.expect)(result === null || result === void 0 ? void 0 : result.record.bins).to.have.all.keys('i');
                (0, chai_1.expect)(result === null || result === void 0 ? void 0 : result.record.gen).to.be.ok;
                (0, chai_1.expect)(result === null || result === void 0 ? void 0 : result.record.ttl).to.be.ok;
            });
            done();
        });
    });
    it('returns the entire record', function (done) {
        var batchRecords = [
            { key: new Key(helper.namespace, helper.set, 'test/batch_read/1'), readAllBins: true },
            { key: new Key(helper.namespace, helper.set, 'test/batch_read/3'), readAllBins: true },
            { key: new Key(helper.namespace, helper.set, 'test/batch_read/5'), readAllBins: true }
        ];
        client.batchRead(batchRecords, function (err, results) {
            (0, chai_1.expect)(err).not.to.be.ok;
            (0, chai_1.expect)(results === null || results === void 0 ? void 0 : results.length).to.equal(3);
            results === null || results === void 0 ? void 0 : results.forEach(function (result) {
                (0, chai_1.expect)(result === null || result === void 0 ? void 0 : result.status).to.equal(aerospike_1.default.status.OK);
                (0, chai_1.expect)(result === null || result === void 0 ? void 0 : result.record.bins).to.have.keys('i', 's', 'l', 'm');
                (0, chai_1.expect)(result === null || result === void 0 ? void 0 : result.record.gen).to.be.ok;
                (0, chai_1.expect)(result === null || result === void 0 ? void 0 : result.record.ttl).to.be.ok;
            });
            done();
        });
    });
    it('returns selected bins for each key', function (done) {
        var batchRecords = [
            { key: new Key(helper.namespace, helper.set, 'test/batch_read/1'), readAllBins: true },
            { key: new Key(helper.namespace, helper.set, 'test/batch_read/3'), readAllBins: false, bins: ['i'] },
            { key: new Key(helper.namespace, helper.set, 'test/batch_read/5'), readAllBins: false }
        ];
        client.batchRead(batchRecords, function (err, results) {
            (0, chai_1.expect)(err).not.to.be.ok;
            (0, chai_1.expect)(results === null || results === void 0 ? void 0 : results.length).to.equal(3);
            results === null || results === void 0 ? void 0 : results.forEach(function (result) {
                var record = result.record;
                switch (record.key.key) {
                    case 'test/batch_read/1':
                        (0, chai_1.expect)(record.bins).to.have.all.keys('i', 's', 'l', 'm');
                        break;
                    case 'test/batch_read/3':
                        (0, chai_1.expect)(record.bins).to.have.all.keys('i');
                        break;
                    case 'test/batch_read/5':
                        (0, chai_1.expect)(record.bins).to.be.empty;
                        break;
                    default:
                        throw new Error('unpexected record key');
                }
            });
            done();
        });
    });
    context('with BatchPolicy', function () {
        context('with deserialize: false', function () {
            var policy = new aerospike_1.default.BatchPolicy({
                deserialize: false
            });
            it('returns list and map bins as byte buffers', function () {
                var batch = [{
                        key: new Key(helper.namespace, helper.set, 'test/batch_read/1'),
                        readAllBins: true
                    }];
                return client.batchRead(batch, policy)
                    .then(function (results) {
                    var bins = results[0].record.bins;
                    (0, chai_1.expect)(bins.i).to.be.a('number');
                    (0, chai_1.expect)(bins.s).to.be.a('string');
                    (0, chai_1.expect)(bins.l).to.be.instanceof(Buffer);
                    (0, chai_1.expect)(bins.m).to.be.instanceof(Buffer);
                });
            });
        });
    });
    context('readTouchTtlPercent policy', function () {
        this.timeout(4000);
        context('BatchPolicy policy', function () {
            helper.skipUnlessVersion('>= 7.1.0', this);
            it('80% touches record', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var policy, batch, batchResult, record;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                policy = new aerospike_1.default.BatchReadPolicy({
                                    readTouchTtlPercent: 80
                                });
                                return [4 /*yield*/, client.put(new aerospike_1.default.Key('test', 'demo', 'batchTtl2'), { i: 2 }, { ttl: 10 })];
                            case 1:
                                _a.sent();
                                return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 3000); })];
                            case 2:
                                _a.sent();
                                batch = [{
                                        key: new aerospike_1.default.Key('test', 'demo', 'batchTtl2'),
                                        readAllBins: true
                                    }];
                                return [4 /*yield*/, client.batchRead(batch, policy)];
                            case 3:
                                batchResult = _a.sent();
                                (0, chai_1.expect)(batchResult[0].record.bins).to.eql({ i: 2 });
                                (0, chai_1.expect)(batchResult[0].record.ttl).to.be.within(5, 8);
                                return [4 /*yield*/, client.get(new aerospike_1.default.Key('test', 'demo', 'batchTtl2'))];
                            case 4:
                                record = _a.sent();
                                (0, chai_1.expect)(record.bins).to.eql({ i: 2 });
                                (0, chai_1.expect)(record.ttl).to.be.within(9, 11);
                                return [4 /*yield*/, client.remove(new aerospike_1.default.Key('test', 'demo', 'batchTtl2'))];
                            case 5:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                });
            });
            it('60% doesnt touch record', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var policy, batch, batchResult, record;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                policy = new aerospike_1.default.BatchReadPolicy({
                                    readTouchTtlPercent: 60
                                });
                                return [4 /*yield*/, client.put(new aerospike_1.default.Key('test', 'demo', 'batchTtl3'), { i: 2 }, { ttl: 10 })];
                            case 1:
                                _a.sent();
                                return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 3000); })];
                            case 2:
                                _a.sent();
                                batch = [{
                                        key: new aerospike_1.default.Key('test', 'demo', 'batchTtl3'),
                                        readAllBins: true
                                    }];
                                return [4 /*yield*/, client.batchRead(batch, policy)];
                            case 3:
                                batchResult = _a.sent();
                                (0, chai_1.expect)(batchResult[0].record.bins).to.eql({ i: 2 });
                                (0, chai_1.expect)(batchResult[0].record.ttl).to.be.within(6, 8);
                                return [4 /*yield*/, client.get(new aerospike_1.default.Key('test', 'demo', 'batchTtl3'))];
                            case 4:
                                record = _a.sent();
                                (0, chai_1.expect)(record.bins).to.eql({ i: 2 });
                                (0, chai_1.expect)(record.ttl).to.be.within(6, 8);
                                return [4 /*yield*/, client.remove(new aerospike_1.default.Key('test', 'demo', 'batchTtl3'))];
                            case 5:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
        context('BatchReadPolicy policy', function () {
            helper.skipUnlessVersion('>= 7.1.0', this);
            it('80% touches record', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var batch, batchResult, record;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                batch = [{
                                        key: new aerospike_1.default.Key('test', 'demo', 'batchReadTtl2'),
                                        readAllBins: true,
                                        policy: new aerospike_1.default.BatchPolicy({
                                            readTouchTtlPercent: 80
                                        })
                                    }];
                                return [4 /*yield*/, client.put(new aerospike_1.default.Key('test', 'demo', 'batchReadTtl2'), { i: 2 }, { ttl: 10 })];
                            case 1:
                                _a.sent();
                                return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 3000); })];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, client.batchRead(batch)];
                            case 3:
                                batchResult = _a.sent();
                                (0, chai_1.expect)(batchResult[0].record.bins).to.eql({ i: 2 });
                                (0, chai_1.expect)(batchResult[0].record.ttl).to.be.within(5, 8);
                                return [4 /*yield*/, client.get(new aerospike_1.default.Key('test', 'demo', 'batchReadTtl2'))];
                            case 4:
                                record = _a.sent();
                                (0, chai_1.expect)(record.bins).to.eql({ i: 2 });
                                (0, chai_1.expect)(record.ttl).to.be.within(9, 11);
                                return [4 /*yield*/, client.remove(new aerospike_1.default.Key('test', 'demo', 'batchReadTtl2'))];
                            case 5:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                });
            });
            it('60% doesnt touch record', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var batch, batchResult, record;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                batch = [{
                                        key: new aerospike_1.default.Key('test', 'demo', 'batchReadTtl3'),
                                        readAllBins: true,
                                        policy: new aerospike_1.default.BatchPolicy({
                                            readTouchTtlPercent: 60
                                        })
                                    }];
                                return [4 /*yield*/, client.put(new aerospike_1.default.Key('test', 'demo', 'batchReadTtl3'), { i: 2 }, { ttl: 10 })];
                            case 1:
                                _a.sent();
                                return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 3000); })];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, client.batchRead(batch)];
                            case 3:
                                batchResult = _a.sent();
                                (0, chai_1.expect)(batchResult[0].record.bins).to.eql({ i: 2 });
                                (0, chai_1.expect)(batchResult[0].record.ttl).to.be.within(5, 8);
                                return [4 /*yield*/, client.get(new aerospike_1.default.Key('test', 'demo', 'batchReadTtl3'))];
                            case 4:
                                record = _a.sent();
                                (0, chai_1.expect)(record.bins).to.eql({ i: 2 });
                                (0, chai_1.expect)(record.ttl).to.be.within(6, 8);
                                return [4 /*yield*/, client.remove(new aerospike_1.default.Key('test', 'demo', 'batchReadTtl3'))];
                            case 5:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
    });
    it('returns a Promise that resolves to the batch results', function () {
        var batchRecords = [
            { key: new Key(helper.namespace, helper.set, 'test/batch_read/1'), readAllBins: true }
        ];
        return client.batchRead(batchRecords)
            .then(function (results) {
            (0, chai_1.expect)(results === null || results === void 0 ? void 0 : results.length).to.equal(1);
            return results === null || results === void 0 ? void 0 : results.pop();
        })
            .then(function (result) {
            (0, chai_1.expect)(result === null || result === void 0 ? void 0 : result.status).to.equal(aerospike_1.default.status.OK);
            (0, chai_1.expect)(result === null || result === void 0 ? void 0 : result.record).to.be.instanceof(aerospike_1.default.Record);
        });
    });
});
