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
var chai_1 = require("chai");
var helper = require("./test_helper");
var query = aerospike_1.default.Query;
var Job = aerospike_1.default.Job;
var exp = aerospike_1.default.exp;
var Context = aerospike_1.default.cdt.Context;
var AerospikeError = aerospike_1.default.AerospikeError;
var GeoJSON = aerospike_1.default.GeoJSON;
var Key = aerospike_1.default.Key;
var filter = aerospike_1.default.filter;
var op = aerospike_1.default.operations;
var NUMERIC = aerospike_1.default.indexDataType.NUMERIC;
var STRING = aerospike_1.default.indexDataType.STRING;
var GEO2DSPHERE = aerospike_1.default.indexDataType.GEO2DSPHERE;
var BLOB = aerospike_1.default.indexDataType.BLOB;
var LIST = aerospike_1.default.indexType.LIST;
var MAPVALUES = aerospike_1.default.indexType.MAPVALUES;
var MAPKEYS = aerospike_1.default.indexType.MAPKEYS;
var keygen = helper.keygen;
var metagen = helper.metagen;
var putgen = helper.putgen;
var samples;
describe('Queries', function () {
    var _this = this;
    var client = helper.client;
    if (!helper.cluster.isVersionInRange('>= 7.0.0')) {
        helper.skip(this, "Blob indexes require server version 7.0.0 or greater");
    }
    var testSet = 'test/query-' + Math.floor(Math.random() * 100000);
    samples = [
        { name: 'blob match', blob: Buffer.from('guava') },
        { name: 'blob non-match', blob: Buffer.from('pumpkin') },
        { name: 'blob list match', lblob: [Buffer.from('guava'), Buffer.from('papaya')] },
        { name: 'blob list non-match', lblob: [Buffer.from('pumpkin'), Buffer.from('turnip')] },
        { name: 'blob map match', mblob: { a: Buffer.from('guava'), b: Buffer.from('papaya') } },
        { name: 'blob map non-match', mblob: { a: Buffer.from('pumpkin'), b: Buffer.from('turnip') } },
        { name: 'blob mapkeys match', mkblob: new Map([[Buffer.from('guava'), 1], [Buffer.from('papaya'), 2]]) },
        { name: 'blob mapkeys non-match', mkblob: new Map([[Buffer.from('pumpkin'), 3], [Buffer.from('turnip'), 4]]) },
        { name: 'nested blob match', blob: { nested: Buffer.from('guava') } },
        { name: 'nested blob non-match', blob: { nested: Buffer.from('pumpkin') } },
        { name: 'nested blob list match', lblob: { nested: [Buffer.from('guava'), Buffer.from('papaya')] } },
        { name: 'nested blob list non-match', lblob: { nested: [Buffer.from('pumpkin'), Buffer.from('turnip')] } },
        { name: 'nested blob map match', mblob: { nested: { a: Buffer.from('guava'), b: Buffer.from('papaya') } } },
        { name: 'nested blob map non-match', mblob: { nested: { a: Buffer.from('pumpkin'), b: Buffer.from('turnip') } } },
        { name: 'nested blob mapkeys match', mkblob: { nested: new Map([[Buffer.from('guava'), 1], [Buffer.from('papaya'), 2]]) } },
        { name: 'nested blob mapkeys non-match', mkblob: { nested: new Map([[Buffer.from('pumpkin'), 3], [Buffer.from('turnip'), 4]]) } },
    ];
    var indexes = [
        ['qidxBlob', 'blob', BLOB],
        ['qidxBlobList', 'lblob', BLOB, LIST],
        ['qidxBlobMap', 'mblob', BLOB, MAPVALUES],
        ['qidxBlobMapKeys', 'mkblob', BLOB, MAPKEYS],
        ['qidxBlobListNested', 'lblob', BLOB, LIST, new Context().addMapKey('nested')],
        ['qidxBlobMapNested', 'mblob', BLOB, MAPVALUES, new Context().addMapKey('nested')],
        ['qidxBlobMapKeysNested', 'mkblob', BLOB, MAPKEYS, new Context().addMapKey('nested')],
        //['qidxBlobExp', exp.binBlob('blob'), BLOB],
    ];
    var keys = [];
    function verifyQueryResults(queryOptions, matchName, done) {
        var query = client.query(helper.namespace, testSet, queryOptions);
        var matches = 0;
        var stream = query.foreach();
        stream.on('error', function (error) { throw error; });
        stream.on('data', function (record) {
            (0, chai_1.expect)(record.bins).to.have.property('name', matchName);
            matches++;
        });
        stream.on('end', function () {
            (0, chai_1.expect)(matches).to.equal(1);
            done();
        });
    }
    before(function () { return __awaiter(_this, void 0, void 0, function () {
        var generators, numberOfSamples, records, promises, i, idx, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    generators = {
                        keygen: keygen.string(helper.namespace, testSet, { prefix: 'test/query/', random: false }),
                        recgen: function () { return samples.pop(); },
                        metagen: metagen.constant({ ttl: 300 })
                    };
                    numberOfSamples = samples.length;
                    return [4 /*yield*/, putgen.put(numberOfSamples, generators)];
                case 1:
                    records = _a.sent();
                    keys = records.map(function (rec) { return rec.key; });
                    promises = [];
                    promises.push(helper.udf.register('udf.lua'));
                    for (i in indexes) {
                        idx = indexes[i];
                        promises.push(helper.index.create(idx[0], testSet, idx[1], idx[2], idx[3], idx[4]));
                    }
                    return [4 /*yield*/, Promise.all(promises)];
                case 2:
                    result = _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    after(function () { return __awaiter(_this, void 0, void 0, function () {
        var promises, i, idx, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    promises = [];
                    promises.push(helper.udf.remove('udf.lua'));
                    for (i in indexes) {
                        idx = indexes[i];
                        promises.push(helper.index.remove(idx[0]));
                    }
                    return [4 /*yield*/, Promise.all(promises)
                        //await new Promise(r => setTimeout(r, 3000));
                    ];
                case 1:
                    result = _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    context('filter predicates', function () {
        describe('filter.equal()', function () {
            context('Uses blob Secondary indexes', function () {
                helper.skipUnlessVersion('>= 7.0.0', this);
                it('should match equal blob values', function (done) {
                    var args = { filters: [filter.equal('blob', Buffer.from('guava'))] };
                    verifyQueryResults(args, 'blob match', done);
                });
                context('Query using index name', function () {
                    it('should match equal blob values using an index name', function (done) {
                        var args = { filters: [filter.equal(null, Buffer.from('guava'))] };
                        args.filters[0].indexName = 'qidxBlob';
                        verifyQueryResults(args, 'blob match', done);
                    });
                });
                //it('should match equal blob values', function (done) {
                //  const args: QueryOptions = { filters: [filter.equal(null as any, Buffer.from('guava'))] }
                //  args.filters![0].exp = exp.binStr('value')
                //  verifyQueryResults(args, 'blob match', done)
                //})
            });
            context('Uses blob Secondary indexes', function () {
                helper.skipUnlessVersion('>= 7.0.0', this);
                it('should match lists containing a blob', function (done) {
                    var args = { filters: [filter.contains('lblob', Buffer.from('guava'), LIST)] };
                    verifyQueryResults(args, 'blob list match', done);
                });
                it('should match lists containing a blob in a nested context', function (done) {
                    var args = { filters: [filter.contains('lblob', Buffer.from('guava'), LIST, new Context().addMapKey('nested'))] };
                    verifyQueryResults(args, 'nested blob list match', done);
                });
                it('should match maps containing a blob value', function (done) {
                    var args = { filters: [filter.contains('mblob', Buffer.from('guava'), MAPVALUES)] };
                    verifyQueryResults(args, 'blob map match', done);
                });
                it('should match maps containing a blob value in a nested context', function (done) {
                    var args = { filters: [filter.contains('mblob', Buffer.from('guava'), MAPVALUES, new Context().addMapKey('nested'))] };
                    verifyQueryResults(args, 'nested blob map match', done);
                });
                it('should match maps containing a blob key', function (done) {
                    var args = { filters: [filter.contains('mkblob', Buffer.from('guava'), MAPKEYS)] };
                    verifyQueryResults(args, 'blob mapkeys match', done);
                });
                it('should match maps containing a blob key in a nested context', function (done) {
                    var args = { filters: [filter.contains('mkblob', Buffer.from('guava'), MAPKEYS, new Context().addMapKey('nested'))] };
                    verifyQueryResults(args, 'nested blob mapkeys match', done);
                });
                context('Query using index name', function () {
                    it('should match lists containing a blob using an index name', function (done) {
                        var args = { filters: [filter.contains(null, Buffer.from('guava'), LIST)] };
                        args.filters[0].indexName = 'qidxBlobList';
                        verifyQueryResults(args, 'blob list match', done);
                    });
                    it('should match lists containing a blob in a nested context using an index name', function (done) {
                        var args = { filters: [filter.contains(null, Buffer.from('guava'), LIST, new Context().addMapKey('nested'))] };
                        args.filters[0].indexName = 'qidxBlobListNested';
                        verifyQueryResults(args, 'nested blob list match', done);
                    });
                    it('should match maps containing a blob value using an index name', function (done) {
                        var args = { filters: [filter.contains(null, Buffer.from('guava'), MAPVALUES)] };
                        args.filters[0].indexName = 'qidxBlobMap';
                        verifyQueryResults(args, 'blob map match', done);
                    });
                    it('should match maps containing a blob value in a nested context using an index name', function (done) {
                        var args = { filters: [filter.contains(null, Buffer.from('guava'), MAPVALUES, new Context().addMapKey('nested'))] };
                        args.filters[0].indexName = 'qidxBlobMapNested';
                        verifyQueryResults(args, 'nested blob map match', done);
                    });
                    it('should match maps containing a blob key using an index name', function (done) {
                        var args = { filters: [filter.contains(null, Buffer.from('guava'), MAPKEYS)] };
                        args.filters[0].indexName = 'qidxBlobMapKeys';
                        verifyQueryResults(args, 'blob mapkeys match', done);
                    });
                    it('should match maps containing a blob key in a nested context using an index name', function (done) {
                        var args = { filters: [filter.contains(null, Buffer.from('guava'), MAPKEYS, new Context().addMapKey('nested'))] };
                        args.filters[0].indexName = 'qidxBlobMapKeysNested';
                        verifyQueryResults(args, 'nested blob mapkeys match', done);
                    });
                });
            });
        });
    });
});
