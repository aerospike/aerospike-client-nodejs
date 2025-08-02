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
    var testSet = 'test/query-' + Math.floor(Math.random() * 100000);
    samples = [
        { name: 'filter', value: 1 },
        { name: 'filter', value: 2 },
        { name: 'filter', value: 3 },
        { name: 'filter', value: 4 },
        { name: 'nested aggregate', nested: { value: 10 } },
        { name: 'nested aggregate', nested: { value: 20 } },
        { name: 'nested aggregate', nested: { value: 30 } },
        { name: 'nested aggregate', nested: { doubleNested: { value: 10 } } },
        { name: 'nested aggregate', nested: { doubleNested: { value: 20 } } },
        { name: 'nested aggregate', nested: { doubleNested: { value: 30 } } },
        { name: 'aggregate', value: 10 },
        { name: 'aggregate', value: 20 },
        { name: 'aggregate', value: 30 },
        //{ name: 'nested int list match', li: { nested: [1, 5, 9] } },
        //{ name: 'nested int list non-match', li: { nested: [500, 501, 502] } },
        //{ name: 'nested int map match', mi: { nested: { a: 1, b: 5, c: 9 } } },
        //{ name: 'nested int map non-match', mi: { nested: { a: 500, b: 501, c: 502 } } },
        //{ name: 'nested string list match', ls: { nested: ['banana', 'blueberry'] } },
        //{ name: 'nested string list non-match', ls: { nested: ['tomato', 'cuccumber'] } },
        //{ name: 'nested string map match', ms: { nested: { a: 'banana', b: 'blueberry' } } },
        //{ name: 'nested string map non-match', ms: { nested: { a: 'tomato', b: 'cuccumber' } } },
        //{ name: 'nested string mapkeys match', mks: { nested: { banana: 1, blueberry: 2 } } },
        //{ name: 'nested string mapkeys non-match', mks: { nested: { tomato: 3, cuccumber: 4 } } },
        { name: 'int match', i: 5 },
        { name: 'int non-match', i: 500 },
        { name: 'int list match', li: [1, 5, 9] },
        { name: 'int list non-match', li: [500, 501, 502] },
        //{ name: 'int map match', mi: { a: 1, b: 5, c: 9 } },
        //{ name: 'int map non-match', mi: { a: 500, b: 501, c: 502 } },
        //{ name: 'string match', s: 'banana' },
        //{ name: 'string non-match', s: 'tomato' },
        //{ name: 'string list match', ls: ['banana', 'blueberry'] },
        //{ name: 'string list non-match', ls: ['tomato', 'cuccumber'] },
        //{ name: 'string map match', ms: { a: 'banana', b: 'blueberry' } },
        //{ name: 'string map non-match', ms: { a: 'tomato', b: 'cuccumber' } },
        //{ name: 'string mapkeys match', mks: { banana: 1, blueberry: 2 } },
        //{ name: 'string mapkeys non-match', mks: { tomato: 3, cuccumber: 4 } },
    ];
    var indexes = [
        ['qidxName', 'name', STRING],
        //['qidxInt', 'i', NUMERIC],
        ['qidxIntList', 'li', NUMERIC, LIST],
        //['qidxIntMap', 'mi', NUMERIC, MAPVALUES],
        //['qidxStr', 's', STRING],
        //['qidxStrList', 'ls', STRING, LIST],
        //['qidxStrMap', 'ms', STRING, MAPVALUES],
        //['qidxStrMapKeys', 'mks', STRING, MAPKEYS],
        //['qidxGeo', 'g', GEO2DSPHERE],
        //['qidxGeoList', 'lg', GEO2DSPHERE, LIST],
        //['qidxGeoMap', 'mg', GEO2DSPHERE, MAPVALUES],
        ['qidxNameNested', 'name', STRING, MAPKEYS, new Context().addMapKey('nested')],
        //['qidxIntListNested', 'li', NUMERIC, LIST, new Context().addMapKey('nested')],
        //['qidxIntMapNested', 'mi', NUMERIC, MAPVALUES, new Context().addMapKey('nested')],
        //['qidxStrListNested', 'ls', STRING, LIST, new Context().addMapKey('nested')],
        //['qidxStrMapNested', 'ms', STRING, MAPVALUES, new Context().addMapKey('nested')],
        //['qidxStrMapKeysNested', 'mks', STRING, MAPKEYS, new Context().addMapKey('nested')],
        //['qidxGeoListNested', 'lg', GEO2DSPHERE, LIST, new Context().addMapKey('nested')],
        //['qidxGeoMapNested', 'mg', GEO2DSPHERE, MAPVALUES, new Context().addMapKey('nested')],
        ['qidxAggregateMapNested', 'nested', STRING, MAPKEYS],
        ['qidxAggregateMapDoubleNested', 'nested', STRING, MAPKEYS, new Context().addMapKey('doubleNested')],
        ['qidxInt', 'i', NUMERIC],
        ['qidxIntList', 'li', NUMERIC, LIST],
        //['qidxIntMap', 'mi', NUMERIC, MAPVALUES],
        //['qidxStr', 's', STRING],
        //['qidxStrList', 'ls', STRING, LIST],
        //['qidxStrMap', 'ms', STRING, MAPVALUES],
        //['qidxStrMapKeys', 'mks', STRING, MAPKEYS],
        //['qidxGeo', 'g', GEO2DSPHERE],
        //['qidxGeoList', 'lg', GEO2DSPHERE, LIST],
        //['qidxGeoMap', 'mg', GEO2DSPHERE, MAPVALUES]
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
    describe('client.query()', function () {
        it('creates a new Query instance and sets up it\'s properties', function () {
            var namespace = helper.namespace;
            var set = 'demo';
            var options = {
                select: ['a', 'b', 'c'],
                nobins: false,
                filters: [aerospike_1.default.filter.equal('a', 9)]
            };
            var query = client.query(namespace, set, options);
            (0, chai_1.expect)(query).to.be.instanceof(aerospike_1.Query);
            (0, chai_1.expect)(query.ns).to.equal(helper.namespace);
            (0, chai_1.expect)(query.set).to.equal('demo');
            (0, chai_1.expect)(query.selected).to.eql(['a', 'b', 'c']);
            (0, chai_1.expect)(query.nobins).to.be.false;
            (0, chai_1.expect)(query.filters).to.be.instanceof(Array);
            (0, chai_1.expect)(query.filters.length).to.equal(1);
        });
        it('creates a query without specifying the set', function () {
            var namespace = helper.namespace;
            var query = client.query(namespace, { select: ['i'] });
            (0, chai_1.expect)(query).to.be.instanceof(aerospike_1.Query);
            (0, chai_1.expect)(query.ns).to.equal(helper.namespace);
            (0, chai_1.expect)(query.set).to.be.null;
            (0, chai_1.expect)(query.selected).to.eql(['i']);
        });
    });
    describe('query.select()', function () {
        it('sets the selected bins from an argument list', function () {
            var query = client.query(helper.namespace, helper.set);
            query.select('a', 'b', 'c');
            (0, chai_1.expect)(query.selected).to.eql(['a', 'b', 'c']);
        });
        it('sets the selected bins from an array', function () {
            var query = client.query(helper.namespace, helper.set);
            query.select(['a', 'b', 'c']);
            (0, chai_1.expect)(query.selected).to.eql(['a', 'b', 'c']);
        });
    });
    describe('query.where()', function () {
        it('adds a filter predicate to the query', function () {
            var query = client.query(helper.namespace, helper.set);
            query.where(aerospike_1.default.filter.equal('a', 9));
            (0, chai_1.expect)(query.filters.length).to.equal(1);
        });
    });
    describe('query.whereWithIndexName()', function () {
        it('adds a filter predicate to the query', function () {
            var query = client.query(helper.namespace, helper.set);
            query.where(aerospike_1.default.filter.equal('a', 9));
            (0, chai_1.expect)(query.filters.length).to.equal(1);
        });
    });
    describe('query.whereWithExp()', function () {
        it('adds a filter predicate to the query', function () {
            var query = client.query(helper.namespace, helper.set);
            query.where(aerospike_1.default.filter.equal('a', 9));
            (0, chai_1.expect)(query.filters.length).to.equal(1);
        });
    });
    describe('query.foreach() #slow', function () {
        it('Should run a regular primary index query', function (done) {
            var query = client.query(helper.namespace, testSet);
            var stream = query.foreach();
            var results = [];
            stream.on('error', function (error) { throw error; });
            stream.on('data', function (record) { return results.push(record.bins); });
            stream.on('end', function () {
                (0, chai_1.expect)(results.length).to.be.above(samples.length);
                done();
            });
        });
        context('expectedDuration', function () {
            // helper.skipUnlessVersion('>= 7.1.0', this)
            it('Should run a regular primary index query with expectedDuration=LONG', function (done) {
                var query = client.query(helper.namespace, testSet);
                var stream = query.foreach({ expectedDuration: aerospike_1.default.policy.queryDuration.LONG });
                var results = [];
                stream.on('error', function (error) { throw error; });
                stream.on('data', function (record) { return results.push(record.bins); });
                stream.on('end', function () {
                    (0, chai_1.expect)(results.length).to.be.above(samples.length);
                    done();
                });
            });
            it('Should run a regular primary index query with expectedDuration=SHORT', function (done) {
                var query = client.query(helper.namespace, testSet);
                var stream = query.foreach({ expectedDuration: aerospike_1.default.policy.queryDuration.SHORT });
                var results = [];
                stream.on('error', function (error) { throw error; });
                stream.on('data', function (record) { return results.push(record.bins); });
                stream.on('end', function () {
                    (0, chai_1.expect)(results.length).to.be.above(samples.length);
                    done();
                });
            });
            it('Should run a regular primary index query with expectedDuration=LONG_RELAX_AP', function (done) {
                var query = client.query(helper.namespace, testSet);
                var stream = query.foreach({ expectedDuration: aerospike_1.default.policy.queryDuration.LONG_RELAX_AP });
                var results = [];
                stream.on('error', function (error) {
                    (0, chai_1.expect)(error.message).to.eql('Request protocol invalid, or invalid protocol field.');
                    done();
                });
                stream.on('data', function (record) { return results.push(record.bins); });
                stream.on('end', function () {
                    (0, chai_1.expect)(results.length).to.be.above(samples.length);
                    done();
                });
            });
        });
        it('Should run a paginated primary index query', function () {
            return __awaiter(this, void 0, void 0, function () {
                var recordTotal, recordsReceived, maxRecs, query, results;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            this.timeout(15000);
                            recordTotal = 0;
                            recordsReceived = 0;
                            maxRecs = 8;
                            query = client.query(helper.namespace, testSet, { paginate: true, maxRecords: maxRecs });
                            results = [];
                            _a.label = 1;
                        case 1:
                            if (!1) return [3 /*break*/, 3];
                            return [4 /*yield*/, query.results()];
                        case 2:
                            results = _a.sent();
                            recordsReceived += results.length;
                            (0, chai_1.expect)(results.length).to.be.below(9);
                            results = [];
                            recordTotal += recordsReceived;
                            if (recordsReceived !== maxRecs) {
                                (0, chai_1.expect)(query.hasNextPage()).to.equal(false);
                                (0, chai_1.expect)(recordTotal).to.be.above(samples.length);
                                return [3 /*break*/, 3];
                            }
                            recordsReceived = 0;
                            return [3 /*break*/, 1];
                        case 3: return [2 /*return*/];
                    }
                });
            });
        });
        it('should apply a stream UDF to filter the results', function (done) {
            var args = {
                filters: [filter.equal('name', 'filter')]
            };
            var query = client.query(helper.namespace, testSet, args);
            query.setUdf('udf', 'even');
            var stream = query.foreach();
            var results = [];
            stream.on('error', function (error) { throw error; });
            stream.on('data', function (record) { return results.push(record.bins); });
            stream.on('end', function () {
                (0, chai_1.expect)(results.sort()).to.eql([2, 4]);
                done();
            });
        });
        describe('index with cdt context', function () {
            // helper.skipUnlessVersion('>= 6.1.0', this)
            it('should apply a stream UDF to the nested context', function (done) {
                var args = {
                    filters: [filter.contains('name', 'value', MAPKEYS, new Context().addMapKey('nested'))]
                };
                var query = client.query(helper.namespace, testSet, args);
                query.setUdf('udf', 'even');
                var stream = query.foreach();
                var results = [];
                stream.on('error', function (error) { throw error; });
                stream.on('data', function (record) { return results.push(record.bins); });
                stream.on('end', function () {
                    (0, chai_1.expect)(results.sort()).to.eql([]);
                    done();
                });
            });
        });
        describe('query.paginate()', function () {
            it('paginates with the correct amount of keys and pages', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var recordsReceived, recordTotal, pageTotal, lastPage, maxRecs, query, _loop_1, state_1;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                recordsReceived = 0;
                                recordTotal = 0;
                                pageTotal = 0;
                                lastPage = 3;
                                maxRecs = 2;
                                query = client.query(helper.namespace, testSet, { paginate: true, maxRecords: maxRecs, filters: [filter.equal('name', 'filter')] });
                                _loop_1 = function () {
                                    var stream;
                                    return __generator(this, function (_b) {
                                        switch (_b.label) {
                                            case 0:
                                                stream = query.foreach();
                                                stream.on('error', function (error) { throw error; });
                                                stream.on('data', function (record) {
                                                    recordsReceived++;
                                                });
                                                return [4 /*yield*/, new Promise(function (resolve) {
                                                        stream.on('end', function (queryState) {
                                                            query.queryState = queryState;
                                                            resolve();
                                                        });
                                                    })];
                                            case 1:
                                                _b.sent();
                                                pageTotal += 1;
                                                if (recordsReceived !== maxRecs) {
                                                    recordTotal += recordsReceived;
                                                    (0, chai_1.expect)(query.queryState).to.equal(undefined);
                                                    (0, chai_1.expect)(pageTotal).to.equal(lastPage);
                                                    (0, chai_1.expect)(recordTotal).to.equal(4);
                                                    return [2 /*return*/, "break"];
                                                }
                                                else {
                                                    recordTotal += recordsReceived;
                                                    recordsReceived = 0;
                                                }
                                                return [2 /*return*/];
                                        }
                                    });
                                };
                                _a.label = 1;
                            case 1:
                                if (!1) return [3 /*break*/, 3];
                                return [5 /*yield**/, _loop_1()];
                            case 2:
                                state_1 = _a.sent();
                                if (state_1 === "break")
                                    return [3 /*break*/, 3];
                                return [3 /*break*/, 1];
                            case 3: return [2 /*return*/];
                        }
                    });
                });
            });
            it('Paginates correctly using query.hasNextPage() and query.nextPage()', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var recordsReceived, recordTotal, pageTotal, lastPage, maxRecs, query, _loop_2, state_2;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                recordsReceived = 0;
                                recordTotal = 0;
                                pageTotal = 0;
                                lastPage = 3;
                                maxRecs = 2;
                                query = client.query(helper.namespace, testSet, { paginate: true, maxRecords: maxRecs, filters: [filter.equal('name', 'filter')] });
                                _loop_2 = function () {
                                    var stream;
                                    return __generator(this, function (_b) {
                                        switch (_b.label) {
                                            case 0:
                                                stream = query.foreach();
                                                stream.on('error', function (error) { throw error; });
                                                stream.on('data', function (record) {
                                                    recordsReceived++;
                                                });
                                                return [4 /*yield*/, new Promise(function (resolve) {
                                                        stream.on('end', function (queryState) {
                                                            query.nextPage(queryState);
                                                            resolve();
                                                        });
                                                    })];
                                            case 1:
                                                _b.sent();
                                                pageTotal += 1;
                                                if (recordsReceived !== maxRecs) {
                                                    recordTotal += recordsReceived;
                                                    (0, chai_1.expect)(query.hasNextPage()).to.equal(false);
                                                    (0, chai_1.expect)(pageTotal).to.equal(lastPage);
                                                    (0, chai_1.expect)(recordTotal).to.equal(4);
                                                    return [2 /*return*/, "break"];
                                                }
                                                else {
                                                    recordTotal += recordsReceived;
                                                    recordsReceived = 0;
                                                }
                                                return [2 /*return*/];
                                        }
                                    });
                                };
                                _a.label = 1;
                            case 1:
                                if (!1) return [3 /*break*/, 3];
                                return [5 /*yield**/, _loop_2()];
                            case 2:
                                state_2 = _a.sent();
                                if (state_2 === "break")
                                    return [3 /*break*/, 3];
                                return [3 /*break*/, 1];
                            case 3: return [2 /*return*/];
                        }
                    });
                });
            });
            it('Paginates correctly using query.results()', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var recordTotal, recordsReceived, pageTotal, lastPage, maxRecs, query, results;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                recordTotal = 0;
                                recordsReceived = 0;
                                pageTotal = 0;
                                lastPage = 3;
                                maxRecs = 2;
                                query = client.query(helper.namespace, testSet, { paginate: true, maxRecords: maxRecs, filters: [filter.equal('name', 'filter')] });
                                results = [];
                                _a.label = 1;
                            case 1:
                                if (!1) return [3 /*break*/, 3];
                                return [4 /*yield*/, query.results()];
                            case 2:
                                results = _a.sent();
                                recordsReceived += results.length;
                                results = [];
                                pageTotal += 1;
                                recordTotal += recordsReceived;
                                if (recordsReceived !== maxRecs) {
                                    (0, chai_1.expect)(query.hasNextPage()).to.equal(false);
                                    (0, chai_1.expect)(pageTotal).to.equal(lastPage);
                                    (0, chai_1.expect)(recordTotal).to.equal(4);
                                    return [3 /*break*/, 3];
                                }
                                recordsReceived = 0;
                                return [3 /*break*/, 1];
                            case 3: return [2 /*return*/];
                        }
                    });
                });
            });
            describe('index with cdt context', function () {
                // helper.skipUnlessVersion('>= 6.1.0', this)
                it('Paginates correctly using query.results() on an index with a cdt context', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var recordTotal, recordsReceived, pageTotal, lastPage, maxRecs, query, results;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    recordTotal = 0;
                                    recordsReceived = 0;
                                    pageTotal = 0;
                                    lastPage = 1;
                                    maxRecs = 5;
                                    query = client.query(helper.namespace, testSet, { paginate: true, maxRecords: maxRecs, filters: [filter.contains('nested', 'value', MAPKEYS, new Context().addMapKey('doubleNested'))] });
                                    results = [];
                                    _a.label = 1;
                                case 1:
                                    if (!1) return [3 /*break*/, 3];
                                    return [4 /*yield*/, query.results()];
                                case 2:
                                    results = _a.sent();
                                    recordsReceived += results.length;
                                    results = [];
                                    pageTotal += 1;
                                    recordTotal += recordsReceived;
                                    if (recordsReceived !== maxRecs) {
                                        (0, chai_1.expect)(query.hasNextPage()).to.equal(false);
                                        (0, chai_1.expect)(pageTotal).to.equal(lastPage);
                                        (0, chai_1.expect)(recordTotal).to.equal(3);
                                        return [3 /*break*/, 3];
                                    }
                                    recordsReceived = 0;
                                    return [3 /*break*/, 1];
                                case 3: return [2 /*return*/];
                            }
                        });
                    });
                });
            });
            it('Throw error when query.UDF is set and query.paginate is true', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var maxRecs, query, error_1;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                maxRecs = 2;
                                query = client.query(helper.namespace, testSet, { paginate: true, maxRecords: maxRecs, filters: [filter.equal('name', 'filter')] });
                                query.setUdf('udf', 'even');
                                _a.label = 1;
                            case 1:
                                _a.trys.push([1, 3, , 4]);
                                return [4 /*yield*/, query.results()];
                            case 2:
                                _a.sent();
                                (0, chai_1.expect)(1).to.equal(2);
                                return [3 /*break*/, 4];
                            case 3:
                                error_1 = _a.sent();
                                (0, chai_1.expect)(error_1.message).to.equal('Stream UDF cannot be applied using a paginated stream. Please disable pagination or UDF.');
                                return [3 /*break*/, 4];
                            case 4: return [2 /*return*/];
                        }
                    });
                });
            });
        });
        it('returns the key if it was stored on the server', function (done) {
            var uniqueKey = 'test/query/record_with_stored_key';
            var key = new aerospike_1.default.Key(helper.namespace, testSet, uniqueKey);
            var record = { name: uniqueKey };
            var meta = { ttl: 300 };
            var policy = new aerospike_1.default.WritePolicy({
                key: aerospike_1.default.policy.key.SEND
            });
            client.put(key, record, meta, policy, function (err) {
                if (err)
                    throw err;
                var query = client.query(helper.namespace, testSet);
                query.where(aerospike_1.default.filter.equal('name', uniqueKey));
                var stream = query.foreach();
                var count = 0;
                stream.on('data', function (record) {
                    (0, chai_1.expect)(++count).to.equal(1);
                    (0, chai_1.expect)(record.key).to.be.instanceof(Key);
                    (0, chai_1.expect)(record.key.key).to.equal(uniqueKey);
                });
                stream.on('end', done);
            });
        });
        context('with partitions settings', function () {
            // helper.skipUnlessVersion('>= 6.0.0', this)
            it('returns the key if it was stored on the given partitions', function (done) {
                var uniqueKey = 'test/query/record_with_stored_key';
                var key = new aerospike_1.default.Key(helper.namespace, testSet, uniqueKey);
                var record = { name: uniqueKey };
                var meta = { ttl: 300 };
                var policy = new aerospike_1.default.WritePolicy({
                    key: aerospike_1.default.policy.key.SEND
                });
                client.put(key, record, meta, policy, function (err) {
                    if (err)
                        throw err;
                    var query = client.query(helper.namespace, testSet);
                    query.where(aerospike_1.default.filter.equal('name', uniqueKey));
                    query.partitions(0, 4096);
                    var stream = query.foreach();
                    var count = 0;
                    stream.on('data', function (record) {
                        (0, chai_1.expect)(++count).to.equal(1);
                        (0, chai_1.expect)(record.key).to.be.instanceof(Key);
                        (0, chai_1.expect)(record.key.key).to.equal(uniqueKey);
                    });
                    stream.on('end', done);
                });
            });
        });
        it('returns the key matching the expression', function (done) {
            var uniqueExpKey = 'test/query/record_with_stored_key';
            var key = new aerospike_1.default.Key(helper.namespace, testSet, uniqueExpKey);
            var record = { name: uniqueExpKey };
            var meta = { ttl: 300 };
            var policy = new aerospike_1.default.WritePolicy({
                key: aerospike_1.default.policy.key.SEND
            });
            client.put(key, record, meta, policy, function (err) {
                if (err)
                    throw err;
                var query = client.query(helper.namespace, testSet);
                var queryPolicy = { filterExpression: exp.keyExist() };
                var stream = query.foreach(queryPolicy);
                var count = 0;
                stream.on('data', function (record) {
                    (0, chai_1.expect)(++count).to.equal(1);
                    (0, chai_1.expect)(record.key).to.be.instanceof(Key);
                    (0, chai_1.expect)(record.key.key).to.equal(uniqueExpKey);
                });
                stream.on('end', done);
            });
        });
        context('with nobins set to true', function () {
            // helper.skipUnlessVersion('>= 3.15.0', this)
            it('should return only meta data', function (done) {
                var query = client.query(helper.namespace, testSet);
                var queryPolicy = { filterExpression: exp.eq(exp.binInt('i'), exp.int(5)) };
                query.nobins = true;
                var received;
                var stream = query.foreach(queryPolicy);
                stream.on('error', function (error) { throw error; });
                stream.on('data', function (record) {
                    received = record;
                    stream.abort();
                });
                stream.on('end', function () {
                    (0, chai_1.expect)(received.bins).to.be.empty;
                    (0, chai_1.expect)(received.gen).to.be.ok;
                    (0, chai_1.expect)(received.ttl).to.be.ok;
                    done();
                });
            });
            it('should return only meta data', function (done) {
                var query = client.query(helper.namespace, testSet);
                query.where(aerospike_1.default.filter.equal('i', 5));
                query.nobins = true;
                var received;
                var stream = query.foreach();
                stream.on('error', function (error) { throw error; });
                stream.on('data', function (record) {
                    received = record;
                    stream.abort();
                });
                stream.on('end', function () {
                    (0, chai_1.expect)(received.bins).to.be.empty;
                    (0, chai_1.expect)(received.gen).to.be.ok;
                    (0, chai_1.expect)(received.ttl).to.be.ok;
                    done();
                });
            });
        });
        /*
        it('should raise client errors asynchronously', function () {
          const invalidPolicy = new Aerospike.QueryPolicy({
            timeout: 'not a valid timeout'
          })
    
          const query: Query = client.query(helper.namespace)
          const stream = query.foreach(invalidPolicy)
          // if error is raised synchronously we will never reach here
          stream.on('error', (error: any) => {
            expect(error).to.be.instanceof(AerospikeError).with.property('code', Aerospike.status.ERR_PARAM)
          })
        })
        */
        it('attaches event handlers to the stream', function (done) {
            var query = client.query(helper.namespace, testSet);
            var dataHandlerCalled = false;
            var stream = query.foreach(null, function (_record) {
                dataHandlerCalled = true;
                stream.abort();
            }, function (error) { throw error; }, function () {
                (0, chai_1.expect)(dataHandlerCalled).to.be.true;
                done();
            });
        });
    });
    describe('query.results()', function () {
        it('returns a Promise that resolves into the query results', function () {
            var query = client.query(helper.namespace, testSet);
            query.where(filter.equal('i', 5));
            return query.results().then(function (records) {
                (0, chai_1.expect)(records.length).to.eq(1);
                (0, chai_1.expect)(records[0].bins.name).to.eq('int match');
            });
        });
        context('with QueryPolicy', function () {
            context('with deserialize: false', function () {
                var policy = new aerospike_1.default.QueryPolicy({
                    deserialize: false
                });
                it('returns lists and maps as byte buffers', function () {
                    var query = client.query(helper.namespace, testSet);
                    query.where(filter.equal('name', 'int list match'));
                    return query.results(policy)
                        .then(function (records) {
                        (0, chai_1.expect)(records.length).to.eq(1);
                        (0, chai_1.expect)(records[0].bins.li).to.eql(Buffer.from([0x93, 0x01, 0x05, 0x09]));
                    });
                });
            });
        });
    });
    describe('query.apply()', function () {
        it('should apply a user defined function and aggregate the results', function (done) {
            var args = {
                filters: [filter.equal('name', 'aggregate')]
            };
            var query = client.query(helper.namespace, testSet, args);
            query.apply('udf', 'count', function (error, result) {
                if (error)
                    throw error;
                (0, chai_1.expect)(result).to.equal(3);
                done();
            });
        });
        describe('index with cdt context', function () {
            // helper.skipUnlessVersion('>= 6.1.0', this)
            it('should apply a user defined function and aggregate the results from a map', function (done) {
                var args = {
                    filters: [filter.contains('nested', 'value', MAPKEYS)]
                };
                var query = client.query(helper.namespace, testSet, args);
                query.apply('udf', 'count', function (error, result) {
                    if (error)
                        throw error;
                    (0, chai_1.expect)(result).to.equal(3);
                    done();
                });
            });
        });
        describe('index with cdt context', function () {
            // helper.skipUnlessVersion('>= 6.1.0', this)
            it('should apply a user defined function and aggregate the results from a nested map', function (done) {
                var args = {
                    filters: [filter.contains('nested', 'value', MAPKEYS, new Context().addMapKey('doubleNested'))]
                };
                var query = client.query(helper.namespace, testSet, args);
                query.apply('udf', 'count', function (error, result) {
                    if (error)
                        throw error;
                    (0, chai_1.expect)(result).to.equal(3);
                    done();
                });
            });
        });
        it('should apply a user defined function with arguments and aggregate the results', function (done) {
            var args = {
                filters: [filter.equal('name', 'aggregate')]
            };
            var query = client.query(helper.namespace, testSet, args);
            query.apply('udf', 'countGreaterThan', ['value', 15], function (error, result) {
                if (error)
                    throw error;
                (0, chai_1.expect)(result).to.equal(2);
                done();
            });
        });
        it('returns a Promise that resolves to the result of the aggregation', function () {
            var args = {
                filters: [filter.equal('name', 'aggregate')]
            };
            var query = client.query(helper.namespace, testSet, args);
            return query.apply('udf', 'count')
                .then(function (result) {
                (0, chai_1.expect)(result).to.equal(3);
            });
        });
    });
    describe('query.background()', function () {
        it('should run a background query and return a job', function (done) {
            var args = {
                filters: [filter.equal('name', 'aggregate')]
            };
            var query = client.query(helper.namespace, testSet, args);
            query.background('udf', 'noop', function (error, job) {
                if (error)
                    throw error;
                (0, chai_1.expect)(job).to.be.instanceof(Job);
                done();
            });
        });
        it('returns a Promise that resolves to a Job', function () {
            var args = {
                filters: [filter.equal('name', 'aggregate')]
            };
            var query = client.query(helper.namespace, testSet, args);
            return query.background('udf', 'noop')
                .then(function (job) {
                (0, chai_1.expect)(job).to.be.instanceof(Job);
            });
        });
        describe('index with cdt context', function () {
            // helper.skipUnlessVersion('>= 6.1.0', this)
            it('returns a Promise that resolves to a Job with a filter containing a CDT context', function () {
                var args = {
                    filters: [filter.contains('nested', 'value', MAPKEYS, new Context().addMapKey('doubleNested'))]
                };
                var query = client.query(helper.namespace, testSet, args);
                return query.background('udf', 'noop')
                    .then(function (job) {
                    (0, chai_1.expect)(job).to.be.instanceof(Job);
                });
            });
        });
    });
    describe('query.operate()', function () {
        // helper.skipUnlessVersion('>= 4.7.0', this)
        it('should perform a background query that executes the operations #slow', function () {
            return __awaiter(this, void 0, void 0, function () {
                var query, ops, job, key, record;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            query = client.query(helper.namespace, testSet);
                            ops = [op.write('backgroundOps', 4)];
                            return [4 /*yield*/, query.operate(ops)];
                        case 1:
                            job = _a.sent();
                            return [4 /*yield*/, job.waitUntilDone()];
                        case 2:
                            _a.sent();
                            key = keys[Math.floor(Math.random() * keys.length)];
                            return [4 /*yield*/, client.get(key)];
                        case 3:
                            record = _a.sent();
                            (0, chai_1.expect)(record.bins.backgroundOps).to.equal(4);
                            return [2 /*return*/];
                    }
                });
            });
        });
        it('should set TTL to the specified value #slow', function () {
            return __awaiter(this, void 0, void 0, function () {
                var query, ops, job, key, record;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            query = client.query(helper.namespace, testSet);
                            query.ttl = 3600;
                            ops = [op.incr('backgroundOps', 1)];
                            return [4 /*yield*/, query.operate(ops)];
                        case 1:
                            job = _a.sent();
                            return [4 /*yield*/, job.waitUntilDone()];
                        case 2:
                            _a.sent();
                            key = keys[Math.floor(Math.random() * keys.length)];
                            return [4 /*yield*/, client.get(key)];
                        case 3:
                            record = _a.sent();
                            (0, chai_1.expect)(record.ttl).to.be.within(3598, 3600);
                            return [2 /*return*/];
                    }
                });
            });
        });
        it('should set TTL to the specified value using query options #slow', function () {
            return __awaiter(this, void 0, void 0, function () {
                var query, ops, job, key, record;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            query = client.query(helper.namespace, testSet, { ttl: 7200 });
                            ops = [op.incr('backgroundOps', 1)];
                            return [4 /*yield*/, query.operate(ops)];
                        case 1:
                            job = _a.sent();
                            return [4 /*yield*/, job.waitUntilDone()];
                        case 2:
                            _a.sent();
                            key = keys[Math.floor(Math.random() * keys.length)];
                            return [4 /*yield*/, client.get(key)];
                        case 3:
                            record = _a.sent();
                            (0, chai_1.expect)(record.ttl).to.be.within(7198, 7200);
                            return [2 /*return*/];
                    }
                });
            });
        });
    });
    describe('stream.abort()', function () {
        it('should stop the query when the stream is aborted', function (done) {
            var query = client.query(helper.namespace, testSet);
            var stream = query.foreach();
            var recordsReceived = 0;
            stream.on('data', function () {
                recordsReceived++;
                if (recordsReceived === 5) {
                    stream.abort();
                }
            });
            stream.on('end', function () {
                (0, chai_1.expect)(recordsReceived).to.equal(5);
                done();
            });
        });
    });
    /*
    context('legacy scan interface', function () {
      ;['UDF', 'concurrent', 'percentage', 'priority'].forEach(function (key) {
        it('should throw an exception if the query options contain key "' + key + '"', function () {
          const args: QueryOptions = {}
          args[key] = 'foo'
          expect(() => client.query(helper.namespace, testSet, args)).to.throw('Invalid query arguments')
        })
      })
    })
    */
});
