// *****************************************************************************
// Copyright 2022-2023 Aerospike, Inc.
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
var chai_1 = require("chai");
var helper = require("./test_helper");
// const util = require('util')
var batchType = aerospike_1.default.batchType;
var status = aerospike_1.default.status;
var op = aerospike_1.default.operations;
var GeoJSON = aerospike_1.default.GeoJSON;
var keygen = helper.keygen;
var metagen = helper.metagen;
var recgen = helper.recgen;
var putgen = helper.putgen;
var valgen = helper.valgen;
var Key = aerospike_1.default.Key;
var assertResultSatisfy = require('./util/statefulAsyncTest').assertResultSatisfy;
describe('client.batchWrite()', function () {
    var client = helper.client;
    before(function () {
        var nrecords = 20;
        var generators = {
            keygen: keygen.string(helper.namespace, helper.set, { prefix: 'test/batch_write/', random: false }),
            recgen: recgen.record({
                i: valgen.integer(),
                s: valgen.string(),
                str2: valgen.string('hello'),
                l: function () { return [1, 2, 3]; },
                m: function () { return { a: 1, b: 2, c: 3 }; }
            }),
            metagen: metagen.constant({ ttl: 1000 })
        };
        helper.udf.register('udf.lua');
        return putgen.put(nrecords, generators);
    });
    context('with batch write', function () {
        helper.skipUnlessVersion('>= 6.0.0', this);
        it('returns the status whether each key was found or not', function (done) {
            var batchRecords = [
                {
                    type: batchType.BATCH_READ,
                    key: new Key(helper.namespace, helper.set, 'test/batch_write/1'),
                    readAllBins: true
                },
                {
                    type: batchType.BATCH_READ,
                    key: new Key(helper.namespace, helper.set, 'test/batch_write/2')
                },
                {
                    type: batchType.BATCH_READ,
                    key: new Key(helper.namespace, helper.set, 'test/batch_write/3')
                },
                {
                    type: batchType.BATCH_READ,
                    key: new Key(helper.namespace, helper.set, 'test/batch_write/no_such_key')
                },
                {
                    type: batchType.BATCH_READ,
                    key: new Key(helper.namespace, helper.set, 'test/batch_write/not_either')
                }
            ];
            client.batchWrite(batchRecords, function (err, results) {
                var found = (results === null || results === void 0 ? void 0 : results.filter(function (result) { return (result === null || result === void 0 ? void 0 : result.status) === aerospike_1.default.status.OK; })) || [];
                var inDoubt = (results === null || results === void 0 ? void 0 : results.filter(function (result) { return (result === null || result === void 0 ? void 0 : result.inDoubt) === true; })) || [];
                var notFound = (results === null || results === void 0 ? void 0 : results.filter(function (result) { return (result === null || result === void 0 ? void 0 : result.status) === aerospike_1.default.status.ERR_RECORD_NOT_FOUND; })) || [];
                (0, chai_1.expect)(err).not.to.be.ok;
                (0, chai_1.expect)(results === null || results === void 0 ? void 0 : results.length).to.equal(5);
                (0, chai_1.expect)(found.length).to.equal(3 - inDoubt.length);
                (0, chai_1.expect)(notFound.length).to.equal(2);
                done();
            });
        });
        it('returns only meta data if no bins are selected', function (done) {
            var batchWriteRecords = [
                {
                    type: batchType.BATCH_WRITE,
                    key: new Key(helper.namespace, helper.set, 'test/batch_write/4'),
                    ops: [
                        op.write('string', 'def'),
                        op.write('geo', new GeoJSON({ type: 'Point', coordinates: [123.456, 1.308] })),
                        op.write('blob', Buffer.from('bar')),
                        op.append('str2', 'world')
                    ]
                },
                {
                    type: batchType.BATCH_REMOVE,
                    key: new Key(helper.namespace, helper.set, 'test/batch_write/5')
                }
            ];
            var batchReadRecords = [
                {
                    type: batchType.BATCH_READ,
                    key: new Key(helper.namespace, helper.set, 'test/batch_write/4'),
                    readAllBins: true
                },
                {
                    type: batchType.BATCH_READ,
                    key: new Key(helper.namespace, helper.set, 'test/batch_write/5'),
                    readAllBins: true
                },
                {
                    type: batchType.BATCH_READ,
                    key: new Key(helper.namespace, helper.set, 'test/batch_write/4')
                }
            ];
            client.batchWrite(batchWriteRecords, function (err, results) {
                (0, chai_1.expect)(err).to.be.null;
                (0, chai_1.expect)(results === null || results === void 0 ? void 0 : results.length).to.equal(2);
                (0, chai_1.expect)(results === null || results === void 0 ? void 0 : results[1].record.bins).to.be.empty;
                client.batchWrite(batchReadRecords, function (err, results) {
                    (0, chai_1.expect)(err).not.to.be.ok;
                    (0, chai_1.expect)(results === null || results === void 0 ? void 0 : results.length).to.equal(3);
                    (0, chai_1.expect)(results === null || results === void 0 ? void 0 : results[0].record.bins).to.have.all.keys('i', 's', 'l', 'm', 'str2', 'geo', 'blob', 'string');
                    (0, chai_1.expect)(results === null || results === void 0 ? void 0 : results[1].status).to.equal(aerospike_1.default.status.ERR_RECORD_NOT_FOUND);
                    (0, chai_1.expect)(results === null || results === void 0 ? void 0 : results[2].record.bins).to.be.empty;
                    // results.forEach(function (result) {
                    //   console.log(util.inspect(result, true, 10, true))
                    // })
                    done();
                });
            });
        });
    });
    context('with BatchPolicy', function () {
        helper.skipUnlessVersion('>= 6.0.0', this);
        it('returns list and map bins as byte buffers', function () {
            var batch = [{
                    type: batchType.BATCH_READ,
                    key: new Key(helper.namespace, helper.set, 'test/batch_write/6'),
                    readAllBins: true
                }];
            var policy = new aerospike_1.default.BatchPolicy({
                deserialize: false
            });
            return client.batchWrite(batch, policy)
                .then(function (results) {
                var bins = results[0].record.bins;
                (0, chai_1.expect)(bins.i).to.be.a('number');
                (0, chai_1.expect)(bins.s).to.be.a('string');
                (0, chai_1.expect)(bins.l).to.be.instanceof(Buffer);
                (0, chai_1.expect)(bins.m).to.be.instanceof(Buffer);
            });
        });
        it('returns a Promise that resolves to the batch results', function () {
            var batchRecords = [
                {
                    type: batchType.BATCH_READ,
                    key: new Key(helper.namespace, helper.set, 'test/batch_write/7'),
                    readAllBins: true
                }
            ];
            return client.batchWrite(batchRecords)
                .then(function (results) {
                (0, chai_1.expect)(results.length).to.equal(1);
                return results.pop();
            })
                .then(function (result) {
                (0, chai_1.expect)(result === null || result === void 0 ? void 0 : result.status).to.equal(status.OK);
                (0, chai_1.expect)(result === null || result === void 0 ? void 0 : result.record).to.be.instanceof(aerospike_1.default.Record);
            });
        });
    });
    context('with exists.IGNORE returning callback', function () {
        helper.skipUnlessVersion('>= 6.0.0', this);
        it('returns the status whether each key was found or not', function (done) {
            var batchRecords = [
                {
                    type: batchType.BATCH_WRITE,
                    key: new Key(helper.namespace, helper.set, 'test/batch_write/8'),
                    ops: [
                        op.write('geo', new GeoJSON({ type: 'Point', coordinates: [123.456, 1.308] })),
                        op.write('blob', Buffer.from('bar'))
                    ],
                    policy: new aerospike_1.default.BatchWritePolicy({
                        exists: aerospike_1.default.policy.exists.IGNORE
                    })
                }
            ];
            client.batchWrite(batchRecords, function (error, results) {
                if (error)
                    throw error;
                client.batchWrite(batchRecords, function (error, results) {
                    (0, chai_1.expect)(error).not.to.be.ok;
                    (0, chai_1.expect)(results === null || results === void 0 ? void 0 : results[0].status).to.equal(status.OK);
                    done();
                });
            });
        });
    });
    context('with exists.IGNORE returning promise', function () {
        helper.skipUnlessVersion('>= 6.0.0', this);
        it('returns the status whether each key was found or not', function () {
            var batchRecords = [
                {
                    type: batchType.BATCH_WRITE,
                    key: new Key(helper.namespace, helper.set, 'test/batch_write/9'),
                    ops: [
                        op.write('geo', new GeoJSON({ type: 'Point', coordinates: [123.456, 1.308] })),
                        op.write('blob', Buffer.from('bar'))
                    ],
                    policy: new aerospike_1.default.BatchWritePolicy({
                        exists: aerospike_1.default.policy.exists.IGNORE
                    })
                }
            ];
            return client.batchWrite(batchRecords)
                .then(function (results) {
                return client.batchWrite(batchRecords);
            })
                .then(function (results) {
                (0, chai_1.expect)(results[0].status).to.equal(status.OK);
            });
        });
    });
    context('with exists.CREATE returning callback', function () {
        helper.skipUnlessVersion('>= 6.0.0', this);
        it('returns the correct status and error value', function (done) {
            var batchRecords = [
                {
                    type: batchType.BATCH_WRITE,
                    key: new Key(helper.namespace, helper.set, 'test/batch_write/10'),
                    ops: [
                        op.write('geo', new GeoJSON({ type: 'Point', coordinates: [123.456, 1.308] })),
                        op.write('blob', Buffer.from('bar'))
                    ],
                    policy: new aerospike_1.default.BatchWritePolicy({
                        exists: aerospike_1.default.policy.exists.CREATE
                    })
                }
            ];
            client.batchWrite(batchRecords, function (error, results) {
                if (error)
                    throw error;
                client.batchWrite(batchRecords, function (error, results) {
                    (0, chai_1.expect)(error).not.to.be.ok;
                    (0, chai_1.expect)(results === null || results === void 0 ? void 0 : results[0].status).to.equal(status.ERR_RECORD_EXISTS);
                    done();
                });
            });
        });
        it('Returns correct status and error with async', function () {
            return __awaiter(this, void 0, void 0, function () {
                var batchRecords, results;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            batchRecords = [
                                {
                                    type: batchType.BATCH_WRITE,
                                    key: new Key(helper.namespace, helper.set, 'test/batch_write/11'),
                                    ops: [
                                        op.write('geo', new GeoJSON({ type: 'Point', coordinates: [123.456, 1.308] })),
                                        op.write('blob', Buffer.from('bar'))
                                    ],
                                    policy: new aerospike_1.default.BatchWritePolicy({
                                        exists: aerospike_1.default.policy.exists.CREATE
                                    })
                                }
                            ];
                            return [4 /*yield*/, client.batchWrite(batchRecords)];
                        case 1:
                            _a.sent();
                            return [4 /*yield*/, client.batchWrite(batchRecords)];
                        case 2:
                            results = _a.sent();
                            (0, chai_1.expect)(results[0].status).to.equal(status.ERR_RECORD_EXISTS);
                            return [2 /*return*/];
                    }
                });
            });
        });
    });
    context('with exists.CREATE returning promise', function () {
        helper.skipUnlessVersion('>= 6.0.0', this);
        it('returns the status whether each key was found or not', function () {
            var batchRecords = [
                {
                    type: batchType.BATCH_WRITE,
                    key: new Key(helper.namespace, helper.set, 'test/batch_write/11'),
                    ops: [
                        op.write('geo', new GeoJSON({ type: 'Point', coordinates: [123.456, 1.308] })),
                        op.write('blob', Buffer.from('bar'))
                    ],
                    policy: new aerospike_1.default.BatchWritePolicy({
                        exists: aerospike_1.default.policy.exists.CREATE
                    })
                }
            ];
            return client.batchWrite(batchRecords)
                .then(function (results) {
                return client.batchWrite(batchRecords);
            })
                .then(function (results) {
                (0, chai_1.expect)(results[0].status).to.equal(status.ERR_RECORD_EXISTS);
            });
        });
    });
    context('with exists.UPDATE return callback', function () {
        helper.skipUnlessVersion('>= 6.0.0', this);
        it('returns the status whether each key was found or not', function (done) {
            var batchRecords = [
                {
                    type: batchType.BATCH_WRITE,
                    key: new Key(helper.namespace, helper.set, 'test/batch_write/12'),
                    ops: [
                        op.write('geo', new GeoJSON({ type: 'Point', coordinates: [123.456, 1.308] })),
                        op.write('blob', Buffer.from('bar'))
                    ],
                    policy: new aerospike_1.default.BatchWritePolicy({
                        exists: aerospike_1.default.policy.exists.UPDATE
                    })
                }
            ];
            client.remove(new Key(helper.namespace, helper.set, 'test/batch_write/12'), function (error, results) {
                if (error)
                    throw error;
                client.batchWrite(batchRecords, function (error, results) {
                    (0, chai_1.expect)(error).not.to.be.ok;
                    (0, chai_1.expect)(results === null || results === void 0 ? void 0 : results[0].status).to.equal(status.ERR_RECORD_NOT_FOUND);
                    done();
                });
            });
        });
    });
    context('with exists.UPDATE returning promise', function () {
        helper.skipUnlessVersion('>= 6.0.0', this);
        it('returns the status whether each key was found or not', function () {
            var batchRecords = [
                {
                    type: batchType.BATCH_WRITE,
                    key: new Key(helper.namespace, helper.set, 'test/batch_write/13'),
                    ops: [
                        op.write('geo', new GeoJSON({ type: 'Point', coordinates: [123.456, 1.308] })),
                        op.write('blob', Buffer.from('bar'))
                    ],
                    policy: new aerospike_1.default.BatchWritePolicy({
                        exists: aerospike_1.default.policy.exists.UPDATE
                    })
                }
            ];
            return client.remove(new Key(helper.namespace, helper.set, 'test/batch_write/13'))
                .then(function (results) {
                return client.batchWrite(batchRecords);
            })
                .then(function (results) {
                (0, chai_1.expect)(results[0].status).to.equal(status.ERR_RECORD_NOT_FOUND);
            });
        });
    });
    context('with exists.REPLACE return callback', function () {
        helper.skipUnlessVersion('>= 6.0.0', this);
        it('returns the status whether each key was found or not', function (done) {
            var batchRecords = [
                {
                    type: batchType.BATCH_WRITE,
                    key: new Key(helper.namespace, helper.set, 'test/batch_write/14'),
                    ops: [
                        op.write('geo', new GeoJSON({ type: 'Point', coordinates: [123.456, 1.308] })),
                        op.write('blob', Buffer.from('bar'))
                    ],
                    policy: new aerospike_1.default.BatchWritePolicy({
                        exists: aerospike_1.default.policy.exists.REPLACE
                    })
                }
            ];
            client.remove(new Key(helper.namespace, helper.set, 'test/batch_write/14'), function (error, results) {
                if (error)
                    throw error;
                client.batchWrite(batchRecords, function (error, results) {
                    (0, chai_1.expect)(error).not.to.be.ok;
                    done();
                });
            });
        });
    });
    context('with exists.REPLACE returning promise', function () {
        helper.skipUnlessVersion('>= 6.0.0', this);
        it('returns the status whether each key was found or not', function () {
            var batchRecords = [
                {
                    type: batchType.BATCH_WRITE,
                    key: new Key(helper.namespace, helper.set, 'test/batch_write/15'),
                    ops: [
                        op.write('geo', new GeoJSON({ type: 'Point', coordinates: [123.456, 1.308] })),
                        op.write('blob', Buffer.from('bar'))
                    ],
                    policy: new aerospike_1.default.BatchWritePolicy({
                        exists: aerospike_1.default.policy.exists.REPLACE
                    })
                }
            ];
            return client.remove(new Key(helper.namespace, helper.set, 'test/batch_write/15'))
                .then(function (results) {
                return client.batchWrite(batchRecords);
            })
                .then(function (results) {
                (0, chai_1.expect)(results === null || results === void 0 ? void 0 : results[0].status).to.equal(status.ERR_RECORD_NOT_FOUND);
            });
        });
    });
    context('with exists.CREATE_OR_REPLACE return callback', function () {
        helper.skipUnlessVersion('>= 6.0.0', this);
        it('returns the status whether each key was found or not', function (done) {
            var batchRecords = [
                {
                    type: batchType.BATCH_WRITE,
                    key: new Key(helper.namespace, helper.set, 'test/batch_write/16'),
                    ops: [
                        op.write('geo', new GeoJSON({ type: 'Point', coordinates: [123.456, 1.308] })),
                        op.write('blob', Buffer.from('bar'))
                    ],
                    policy: new aerospike_1.default.BatchWritePolicy({
                        exists: aerospike_1.default.policy.exists.CREATE_OR_REPLACE
                    })
                }
            ];
            client.batchWrite(batchRecords, function (error, results) {
                if (error)
                    throw error;
                client.batchWrite(batchRecords, function (error, results) {
                    (0, chai_1.expect)(error).not.to.be.ok;
                    (0, chai_1.expect)(results === null || results === void 0 ? void 0 : results[0].status).to.equal(status.OK);
                    done();
                });
            });
        });
    });
    context('with exists.CREATE_OR_REPLACE returning promise', function () {
        helper.skipUnlessVersion('>= 6.0.0', this);
        it('returns the status whether each key was found or not', function () {
            var batchRecords = [
                {
                    type: batchType.BATCH_WRITE,
                    key: new Key(helper.namespace, helper.set, 'test/batch_write/17'),
                    ops: [
                        op.write('geo', new GeoJSON({ type: 'Point', coordinates: [123.456, 1.308] })),
                        op.write('blob', Buffer.from('bar'))
                    ],
                    policy: new aerospike_1.default.BatchWritePolicy({
                        exists: aerospike_1.default.policy.exists.CREATE_OR_REPLACE
                    })
                }
            ];
            return client.batchWrite(batchRecords)
                .then(function (results) {
                return client.batchWrite(batchRecords);
            })
                .then(function (results) {
                (0, chai_1.expect)(results[0].status).to.equal(status.OK);
            });
        });
    });
    context('with BatchParentWritePolicy', function () {
        helper.skipUnlessVersion('>= 6.0.0', this);
        this.timeout(10000);
        it('returns list and map bins as byte buffers', function () {
            return __awaiter(this, void 0, void 0, function () {
                var batch, config, dummyClient, results, bins;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            batch = [{
                                    type: batchType.BATCH_READ,
                                    key: new Key(helper.namespace, helper.set, 'test/batch_write/18'),
                                    readAllBins: true
                                }];
                            config = {
                                hosts: helper.config.hosts,
                                user: helper.config.user,
                                password: helper.config.password,
                                policies: {
                                    batchParentWrite: new aerospike_1.default.BatchPolicy({ socketTimeout: 0, totalTimeout: 0, deserialize: false })
                                },
                            };
                            return [4 /*yield*/, aerospike_1.default.connect(config)];
                        case 1:
                            dummyClient = _a.sent();
                            return [4 /*yield*/, dummyClient.batchWrite(batch)];
                        case 2:
                            results = _a.sent();
                            bins = results[0].record.bins;
                            (0, chai_1.expect)(bins.i).to.be.a('number');
                            (0, chai_1.expect)(bins.s).to.be.a('string');
                            (0, chai_1.expect)(bins.l).to.be.instanceof(Buffer);
                            (0, chai_1.expect)(bins.m).to.be.instanceof(Buffer);
                            return [4 /*yield*/, dummyClient.close()];
                        case 3:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        });
    });
    context('with BatchWritePolicy ttl', function () {
        helper.skipUnlessVersion('>= 6.0.0', this);
        it('writes value with correct ttl', function () {
            return __awaiter(this, void 0, void 0, function () {
                var batch;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            batch = [{
                                    type: batchType.BATCH_WRITE,
                                    key: new Key(helper.namespace, helper.set, 'test/batch_write/19'),
                                    ops: [
                                        op.write('example', 35),
                                        op.write('blob', [4, 14, 28])
                                    ],
                                    policy: new aerospike_1.default.BatchWritePolicy({
                                        exists: aerospike_1.default.policy.exists.REPLACE,
                                        ttl: 1367
                                    })
                                }];
                            return [4 /*yield*/, client.batchWrite(batch)];
                        case 1:
                            _a.sent();
                            return [2 /*return*/, client.get(new Key(helper.namespace, helper.set, 'test/batch_write/19'))
                                    .then(function (result) {
                                    var bins = result.bins;
                                    (0, chai_1.expect)(bins.example).to.be.a('number');
                                    (0, chai_1.expect)(bins.blob).to.be.a('array');
                                    (0, chai_1.expect)(result.ttl).to.be.within(1366, 1367);
                                })];
                    }
                });
            });
        });
    });
    context('Transaction tests', function () {
        helper.skipUnlessVersionAndEnterprise('>= 8.0.0', this);
        it('onLockingOnly should fail when writing to a locked record using BATCH_WRITE', function () {
            return __awaiter(this, void 0, void 0, function () {
                var key, key2, batchRecords, mrt, policy, result, error_1;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            key = new Key(helper.namespace, helper.set, 'test/batch_write/21');
                            key2 = new Key(helper.namespace, helper.set, 'test/batch_write/22');
                            batchRecords = [
                                {
                                    type: aerospike_1.default.batchType.BATCH_WRITE,
                                    key: key,
                                    ops: [aerospike_1.default.operations.write('exampleBin', 1)],
                                    policy: new aerospike_1.default.BatchWritePolicy({
                                        onLockingOnly: true,
                                    })
                                },
                                {
                                    type: batchType.BATCH_WRITE,
                                    key: key2,
                                    ops: [aerospike_1.default.operations.write('exampleBin', 1)],
                                    policy: new aerospike_1.default.BatchWritePolicy({
                                        onLockingOnly: true,
                                    })
                                }
                            ];
                            mrt = new aerospike_1.default.Transaction();
                            policy = new aerospike_1.default.BatchPolicy({
                                txn: mrt,
                            });
                            return [4 /*yield*/, client.batchWrite(batchRecords, policy)];
                        case 1:
                            _a.sent();
                            _a.label = 2;
                        case 2:
                            _a.trys.push([2, 4, 5, 7]);
                            return [4 /*yield*/, client.batchWrite(batchRecords, policy)];
                        case 3:
                            result = _a.sent();
                            (0, chai_1.expect)(result[0].status).to.eql(status.MRT_ALREADY_LOCKED);
                            return [3 /*break*/, 7];
                        case 4:
                            error_1 = _a.sent();
                            chai_1.assert.fail('An error should not have been caught');
                            return [3 /*break*/, 7];
                        case 5: return [4 /*yield*/, client.abort(mrt)];
                        case 6:
                            _a.sent();
                            return [7 /*endfinally*/];
                        case 7: return [2 /*return*/];
                    }
                });
            });
        });
        it('onLockingOnly should fail when writing to a locked record using BATCH_APPLY', function () {
            return __awaiter(this, void 0, void 0, function () {
                var key, key2, batchRecords, mrt, policy, result, result_1, error_2;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            key = new Key(helper.namespace, helper.set, 'test/batch_write/23');
                            key2 = new Key(helper.namespace, helper.set, 'test/batch_write/24');
                            return [4 /*yield*/, client.put(key, { foo: 45 }, { ttl: 1000 })];
                        case 1:
                            _a.sent();
                            return [4 /*yield*/, client.put(key2, { foo: 45 }, { ttl: 1000 })];
                        case 2:
                            _a.sent();
                            batchRecords = [
                                { type: batchType.BATCH_APPLY,
                                    key: key,
                                    policy: new aerospike_1.default.BatchApplyPolicy({
                                        onLockingOnly: true,
                                    }),
                                    udf: {
                                        module: 'udf',
                                        funcname: 'updateRecord',
                                        args: ['foo', 50]
                                    }
                                },
                                { type: batchType.BATCH_APPLY,
                                    key: key2,
                                    policy: new aerospike_1.default.BatchApplyPolicy({
                                        onLockingOnly: true,
                                    }),
                                    udf: {
                                        module: 'udf',
                                        funcname: 'updateRecord',
                                        args: ['foo', 50]
                                    }
                                }
                            ];
                            mrt = new aerospike_1.default.Transaction();
                            policy = new aerospike_1.default.BatchPolicy({
                                txn: mrt,
                            });
                            return [4 /*yield*/, client.batchWrite(batchRecords, policy)];
                        case 3:
                            result = _a.sent();
                            _a.label = 4;
                        case 4:
                            _a.trys.push([4, 6, 7, 9]);
                            return [4 /*yield*/, client.batchWrite(batchRecords, policy)];
                        case 5:
                            result_1 = _a.sent();
                            (0, chai_1.expect)(result_1[0].status).to.eql(status.MRT_ALREADY_LOCKED);
                            return [3 /*break*/, 9];
                        case 6:
                            error_2 = _a.sent();
                            chai_1.assert.fail('An error should not have been caught');
                            return [3 /*break*/, 9];
                        case 7: return [4 /*yield*/, client.abort(mrt)];
                        case 8:
                            _a.sent();
                            return [7 /*endfinally*/];
                        case 9: return [2 /*return*/];
                    }
                });
            });
        });
        it('Runs BATCH_WRITE with a single batch record an a command in a transaction', function () {
            return __awaiter(this, void 0, void 0, function () {
                var key, batchRecords, mrt, policy, result, error_3;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            key = new Key(helper.namespace, helper.set, 'test/batch_write/20');
                            batchRecords = [
                                {
                                    type: aerospike_1.default.batchType.BATCH_WRITE,
                                    key: key,
                                    ops: [aerospike_1.default.operations.write('exampleBin', 1)],
                                    policy: new aerospike_1.default.BatchWritePolicy({
                                        onLockingOnly: true,
                                    })
                                },
                            ];
                            mrt = new aerospike_1.default.Transaction();
                            policy = new aerospike_1.default.BatchPolicy({
                                txn: mrt,
                            });
                            _a.label = 1;
                        case 1:
                            _a.trys.push([1, 3, 4, 6]);
                            return [4 /*yield*/, client.batchWrite(batchRecords, policy)];
                        case 2:
                            result = _a.sent();
                            (0, chai_1.expect)(result[0].status).to.eql(status.OK);
                            return [3 /*break*/, 6];
                        case 3:
                            error_3 = _a.sent();
                            chai_1.assert.fail('An error should not have been caught');
                            return [3 /*break*/, 6];
                        case 4: return [4 /*yield*/, client.abort(mrt)];
                        case 5:
                            _a.sent();
                            return [7 /*endfinally*/];
                        case 6: return [2 /*return*/];
                    }
                });
            });
        });
    });
});
