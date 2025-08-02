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
var keygen = helper.keygen;
var metagen = helper.metagen;
var recgen = helper.recgen;
var status = aerospike_1.default.status;
describe('client.get()', function () {
    var client = helper.client;
    it('should read the record', function (done) {
        var key = keygen.string(helper.namespace, helper.set, { prefix: 'test/get/' })();
        var meta = metagen.constant({ ttl: 1000 })();
        var record = recgen.constant({ i: 123, s: 'abc' })();
        client.put(key, record, meta, function (err) {
            if (err)
                throw err;
            client.get(key, function (err, record) {
                if (err)
                    throw err;
                client.remove(key, function (err, key) {
                    if (err)
                        throw err;
                    done();
                });
            });
        });
    });
    it('should not find the record', function (done) {
        var key = keygen.string(helper.namespace, helper.set, { prefix: 'test/not_found/' })();
        client.get(key, function (err, record) {
            (0, chai_1.expect)(err === null || err === void 0 ? void 0 : err.code).to.equal(status.ERR_RECORD_NOT_FOUND);
            done();
        });
    });
    context('with ReadPolicy', function () {
        context('with deserialize: false', function () {
            it('should return lists and maps as raw bytes', function () {
                var key = keygen.string(helper.namespace, helper.set, { prefix: 'test/get/' })();
                var bins = {
                    i: 123,
                    s: 'abc',
                    l: [1, 2, 3],
                    m: { a: 1, b: 2, c: 3 }
                };
                var policy = new aerospike_1.default.ReadPolicy({
                    deserialize: false
                });
                return client.put(key, bins)
                    .then(function () { return client.get(key, policy); })
                    .then(function (record) {
                    var bins = record.bins;
                    (0, chai_1.expect)(bins.i).to.eql(123);
                    (0, chai_1.expect)(bins.s).to.eql('abc');
                    (0, chai_1.expect)(bins.l).to.eql(Buffer.from([0x93, 0x01, 0x02, 0x03]));
                    (0, chai_1.expect)(bins.m).to.eql(Buffer.from([0x84, 0xc7, 0x00, 0x01, 0xc0, 0xa2, 0x03, 0x61, 0x01, 0xa2, 0x03, 0x62, 0x02, 0xa2, 0x03, 0x63, 0x03]));
                });
            });
        });
        context('readTouchTtlPercent policy', function () {
            helper.skipUnlessVersion('>= 7.1.0', this);
            this.timeout(4000);
            it('80% touches record', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, policy, record;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                key = keygen.integer(helper.namespace, helper.set)();
                                policy = new aerospike_1.default.ReadPolicy({
                                    readTouchTtlPercent: 80
                                });
                                return [4 /*yield*/, client.put(key, { i: 2 }, { ttl: 10 })];
                            case 1:
                                _a.sent();
                                return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 3000); })];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, client.get(key, policy)];
                            case 3:
                                record = _a.sent();
                                (0, chai_1.expect)(record.bins).to.eql({ i: 2 });
                                (0, chai_1.expect)(record.ttl).to.be.within(5, 8);
                                return [4 /*yield*/, client.get(key, policy)];
                            case 4:
                                record = _a.sent();
                                (0, chai_1.expect)(record.bins).to.eql({ i: 2 });
                                (0, chai_1.expect)(record.ttl).to.be.within(9, 11);
                                return [4 /*yield*/, client.remove(key)];
                            case 5:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                });
            });
            it('60% never touches record', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, policy, record;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                key = keygen.integer(helper.namespace, helper.set)();
                                policy = new aerospike_1.default.ReadPolicy({
                                    readTouchTtlPercent: 60
                                });
                                return [4 /*yield*/, client.put(key, { i: 2 }, { ttl: 10 })];
                            case 1:
                                _a.sent();
                                return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 3000); })];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, client.get(key, policy)];
                            case 3:
                                record = _a.sent();
                                (0, chai_1.expect)(record.bins).to.eql({ i: 2 });
                                (0, chai_1.expect)(record.ttl).to.be.within(5, 8);
                                return [4 /*yield*/, client.get(key, policy)];
                            case 4:
                                record = _a.sent();
                                (0, chai_1.expect)(record.bins).to.eql({ i: 2 });
                                (0, chai_1.expect)(record.ttl).to.be.within(5, 8);
                                return [4 /*yield*/, client.remove(key)];
                            case 5:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
    });
    it('should return the TTL for a never expiring record as Aerospike.ttl.NEVER_EXPIRE', function (done) {
        var key = keygen.string(helper.namespace, helper.set, { prefix: 'test/get/' })();
        var meta = metagen.constant({ ttl: aerospike_1.default.ttl.NEVER_EXPIRE })();
        var record = recgen.constant({ i: 123, s: 'abc' })();
        client.put(key, record, meta, function (err) {
            if (err)
                throw err;
            client.get(key, function (err, record) {
                if (err)
                    throw err;
                (0, chai_1.expect)(record === null || record === void 0 ? void 0 : record.ttl).to.equal(aerospike_1.default.ttl.NEVER_EXPIRE);
                client.remove(key, function (err) {
                    if (err)
                        throw err;
                    done();
                });
            });
        });
    });
    it('should return a Promise that resolves to a Record', function () {
        var key = keygen.string(helper.namespace, helper.set, { prefix: 'test/get/' })();
        return client.put(key, { i: 42 })
            .then(function () { return client.get(key); })
            .then(function (record) { return (0, chai_1.expect)(record.bins).to.eql({ i: 42 }); })
            .then(function () { return client.remove(key); });
    });
    it('fetches a record given the digest', function () {
        var key = new aerospike_1.default.Key(helper.namespace, helper.set, 'digestOnly');
        client.put(key, { foo: 'bar' })
            .then(function () {
            var digest = key.digest;
            var key2 = new aerospike_1.default.Key(helper.namespace, undefined, null, digest);
            return client.get(key2)
                .then(function (record) { return (0, chai_1.expect)(record.bins.foo).to.equal('bar'); });
        });
    });
});
