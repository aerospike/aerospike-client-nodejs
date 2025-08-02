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
        { name: 'point match', g: new GeoJSON.Point(103.913, 1.308) },
        { name: 'point non-match', g: new GeoJSON.Point(-122.101, 37.421) },
        { name: 'point list match', lg: [new GeoJSON.Point(103.913, 1.308), new GeoJSON.Point(105.913, 3.308)] },
        { name: 'point list non-match', lg: [new GeoJSON.Point(-122.101, 37.421), new GeoJSON.Point(-120.101, 39.421)] },
        { name: 'point map match', mg: { a: new GeoJSON.Point(103.913, 1.308), b: new GeoJSON.Point(105.913, 3.308) } },
        { name: 'point map non-match', mg: { a: new GeoJSON.Point(-122.101, 37.421), b: new GeoJSON.Point(-120.101, 39.421) } },
        { name: 'region match', g: new GeoJSON.Polygon([102.913, 0.308], [102.913, 2.308], [104.913, 2.308], [104.913, 0.308], [102.913, 0.308]) },
        { name: 'region non-match', g: new GeoJSON.Polygon([-121.101, 36.421], [-121.101, 38.421], [-123.101, 38.421], [-123.101, 36.421], [-121.101, 36.421]) },
        { name: 'region list match', lg: [new GeoJSON.Polygon([102.913, 0.308], [102.913, 2.308], [104.913, 2.308], [104.913, 0.308], [102.913, 0.308])] },
        { name: 'region list non-match', lg: [new GeoJSON.Polygon([-121.101, 36.421], [-121.101, 38.421], [-123.101, 38.421], [-123.101, 36.421], [-121.101, 36.421])] },
        { name: 'region map match', mg: { a: new GeoJSON.Polygon([102.913, 0.308], [102.913, 2.308], [104.913, 2.308], [104.913, 0.308], [102.913, 0.308]) } },
        { name: 'region map non-match', mg: [new GeoJSON.Polygon([-121.101, 36.421], [-121.101, 38.421], [-123.101, 38.421], [-123.101, 36.421], [-121.101, 36.421])] },
        { name: 'nested point match', g: { nested: new GeoJSON.Point(103.913, 1.308) } },
        { name: 'nested point non-match', g: { nested: new GeoJSON.Point(-122.101, 37.421) } },
        { name: 'nested point list match', lg: { nested: [new GeoJSON.Point(103.913, 1.308), new GeoJSON.Point(105.913, 3.308)] } },
        { name: 'nested point list non-match', lg: { nested: [new GeoJSON.Point(-122.101, 37.421), new GeoJSON.Point(-120.101, 39.421)] } },
        { name: 'nested point map match', mg: { nested: { a: new GeoJSON.Point(103.913, 1.308), b: new GeoJSON.Point(105.913, 3.308) } } },
        { name: 'nested point map non-match', mg: { nested: { a: new GeoJSON.Point(-122.101, 37.421), b: new GeoJSON.Point(-120.101, 39.421) } } },
        { name: 'nested region match', g: { nested: new GeoJSON.Polygon([102.913, 0.308], [102.913, 2.308], [104.913, 2.308], [104.913, 0.308], [102.913, 0.308]) } },
        { name: 'nested region non-match', g: { nested: new GeoJSON.Polygon([-121.101, 36.421], [-121.101, 38.421], [-123.101, 38.421], [-123.101, 36.421], [-121.101, 36.421]) } },
        { name: 'nested region list match', lg: { nested: [new GeoJSON.Polygon([102.913, 0.308], [102.913, 2.308], [104.913, 2.308], [104.913, 0.308], [102.913, 0.308])] } },
        { name: 'nested region list non-match', lg: { nested: [new GeoJSON.Polygon([-121.101, 36.421], [-121.101, 38.421], [-123.101, 38.421], [-123.101, 36.421], [-121.101, 36.421])] } },
        { name: 'nested region map match', mg: { nested: { a: new GeoJSON.Polygon([102.913, 0.308], [102.913, 2.308], [104.913, 2.308], [104.913, 0.308], [102.913, 0.308]) } } },
        { name: 'nested region map non-match', mg: { nested: [new GeoJSON.Polygon([-121.101, 36.421], [-121.101, 38.421], [-123.101, 38.421], [-123.101, 36.421], [-121.101, 36.421])] } },
        //{ name: 'blob match', blob: Buffer.from('guava') },
        //{ name: 'blob non-match', blob: Buffer.from('pumpkin') },
        //{ name: 'blob list match', lblob: [Buffer.from('guava'), Buffer.from('papaya')] },
        //{ name: 'blob list non-match', lblob: [Buffer.from('pumpkin'), Buffer.from('turnip')] },
        //{ name: 'blob map match', mblob: { a: Buffer.from('guava'), b: Buffer.from('papaya') } },
        //{ name: 'blob map non-match', mblob: { a: Buffer.from('pumpkin'), b: Buffer.from('turnip') } },
        //{ name: 'blob mapkeys match', mkblob: new Map([[Buffer.from('guava'), 1], [Buffer.from('papaya'), 2]]) },
        //{ name: 'blob mapkeys non-match', mkblob: new Map([[Buffer.from('pumpkin'), 3], [Buffer.from('turnip'), 4]]) },
        //{ name: 'nested blob match', blob: { nested: Buffer.from('guava') } },
        //{ name: 'nested blob non-match', blob: { nested: Buffer.from('pumpkin') } },
        //{ name: 'nested blob list match', lblob: { nested: [Buffer.from('guava'), Buffer.from('papaya')] } },
        //{ name: 'nested blob list non-match', lblob: { nested: [Buffer.from('pumpkin'), Buffer.from('turnip')] } },
        //{ name: 'nested blob map match', mblob: { nested: { a: Buffer.from('guava'), b: Buffer.from('papaya') } } },
        //{ name: 'nested blob map non-match', mblob: { nested: { a: Buffer.from('pumpkin'), b: Buffer.from('turnip') } } },
        //{ name: 'nested blob mapkeys match', mkblob: { nested: new Map([[Buffer.from('guava'), 1], [Buffer.from('papaya'), 2]]) } },
        //{ name: 'nested blob mapkeys non-match', mkblob: { nested: new Map([[Buffer.from('pumpkin'), 3], [Buffer.from('turnip'), 4]]) } },
        //{ name: 'filter', value: 1 },
        //{ name: 'filter', value: 2 },
        //{ name: 'filter', value: 3 },
        //{ name: 'filter', value: 4 },
        //{ name: 'nested aggregate', nested: { value: 10 } },
        //{ name: 'nested aggregate', nested: { value: 20 } },
        //{ name: 'nested aggregate', nested: { value: 30 } },
        //{ name: 'nested aggregate', nested: { doubleNested: { value: 10 } } },
        //{ name: 'nested aggregate', nested: { doubleNested: { value: 20 } } },
        //{ name: 'nested aggregate', nested: { doubleNested: { value: 30 } } },
        //{ name: 'aggregate', value: 10 },
        //{ name: 'aggregate', value: 20 },
        //{ name: 'aggregate', value: 30 },
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
        //{ name: 'int match', i: 5 },
        //{ name: 'int non-match', i: 500 },
        //{ name: 'int list match', li: [1, 5, 9] },
        //{ name: 'int list non-match', li: [500, 501, 502] },
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
        //['qidxName', 'name', STRING],
        //['qidxInt', 'i', NUMERIC],
        //['qidxIntList', 'li', NUMERIC, LIST],
        //['qidxIntMap', 'mi', NUMERIC, MAPVALUES],
        //['qidxStr', 's', STRING],
        //['qidxStrList', 'ls', STRING, LIST],
        //['qidxStrMap', 'ms', STRING, MAPVALUES],
        //['qidxStrMapKeys', 'mks', STRING, MAPKEYS],
        ['qidxGeo', 'g', GEO2DSPHERE],
        ['qidxGeoList', 'lg', GEO2DSPHERE, LIST],
        ['qidxGeoMap', 'mg', GEO2DSPHERE, MAPVALUES],
        //['qidxNameNested', 'name', STRING, MAPKEYS, new Context().addMapKey('nested')],
        //['qidxIntListNested', 'li', NUMERIC, LIST, new Context().addMapKey('nested')],
        //['qidxIntMapNested', 'mi', NUMERIC, MAPVALUES, new Context().addMapKey('nested')],
        //['qidxStrListNested', 'ls', STRING, LIST, new Context().addMapKey('nested')],
        //['qidxStrMapNested', 'ms', STRING, MAPVALUES, new Context().addMapKey('nested')],
        //['qidxStrMapKeysNested', 'mks', STRING, MAPKEYS, new Context().addMapKey('nested')],
        ['qidxGeoListNested', 'lg', GEO2DSPHERE, LIST, new Context().addMapKey('nested')],
        ['qidxGeoMapNested', 'mg', GEO2DSPHERE, MAPVALUES, new Context().addMapKey('nested')],
        //['qidxAggregateMapNested', 'nested', STRING, MAPKEYS],
        //['qidxAggregateMapDoubleNested', 'nested', STRING, MAPKEYS, new Context().addMapKey('doubleNested')],
        //['qidxInt', 'i', NUMERIC],
        //['qidxIntList', 'li', NUMERIC, LIST],
        //['qidxIntMap', 'mi', NUMERIC, MAPVALUES],
        //['qidxStr', 's', STRING],
        //['qidxStrList', 'ls', STRING, LIST],
        //['qidxStrMap', 'ms', STRING, MAPVALUES],
        //['qidxStrMapKeys', 'mks', STRING, MAPKEYS],
        //['qidxGeo', 'g', GEO2DSPHERE],
        //['qidxGeoList', 'lg', GEO2DSPHERE, LIST],
        //['qidxGeoMap', 'mg', GEO2DSPHERE, MAPVALUES]
        //['qidxBlob', 'blob', BLOB],
        //['qidxBlobList', 'lblob', BLOB, LIST],
        //['qidxBlobMap', 'mblob', BLOB, MAPVALUES],
        //['qidxBlobMapKeys', 'mkblob', BLOB, MAPKEYS],
        //['qidxBlobListNested', 'lblob', BLOB, LIST, new Context().addMapKey('nested')],
        //['qidxBlobMapNested', 'mblob', BLOB, MAPVALUES, new Context().addMapKey('nested')],
        //['qidxBlobMapKeysNested', 'mkblob', BLOB, MAPKEYS, new Context().addMapKey('nested')],
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
        describe('filter.geoWithinGeoJSONRegion()', function () {
            it('should match locations within a GeoJSON region', function (done) {
                var region = new GeoJSON({ type: 'Polygon', coordinates: [[[103, 1.3], [104, 1.3], [104, 1.4], [103, 1.4], [103, 1.3]]] });
                var args = { filters: [filter.geoWithinGeoJSONRegion('g', region)] };
                verifyQueryResults(args, 'point match', done);
            });
            it('should match locations in a list within a GeoJSON region', function (done) {
                var region = new GeoJSON({ type: 'Polygon', coordinates: [[[103, 1.3], [104, 1.3], [104, 1.4], [103, 1.4], [103, 1.3]]] });
                var args = { filters: [filter.geoWithinGeoJSONRegion('lg', region, LIST)] };
                verifyQueryResults(args, 'point list match', done);
            });
            describe('index with cdt context', function () {
                helper.skipUnlessVersion('>= 6.1.0', this);
                it('should match locations in a list within a GeoJSON region in a nested context', function (done) {
                    var region = new GeoJSON({ type: 'Polygon', coordinates: [[[103, 1.3], [104, 1.3], [104, 1.4], [103, 1.4], [103, 1.3]]] });
                    var args = { filters: [filter.geoWithinGeoJSONRegion('lg', region, LIST, new Context().addMapKey('nested'))] };
                    verifyQueryResults(args, 'nested point list match', done);
                });
            });
            it('should match locations in a map within a GeoJSON region', function (done) {
                var region = new GeoJSON({ type: 'Polygon', coordinates: [[[103, 1.3], [104, 1.3], [104, 1.4], [103, 1.4], [103, 1.3]]] });
                var args = { filters: [filter.geoWithinGeoJSONRegion('mg', region, MAPVALUES)] };
                verifyQueryResults(args, 'point map match', done);
            });
            describe('index with cdt context', function () {
                helper.skipUnlessVersion('>= 6.1.0', this);
                it('should match locations in a map within a GeoJSON region in a nested context', function (done) {
                    var region = new GeoJSON({ type: 'Polygon', coordinates: [[[103, 1.3], [104, 1.3], [104, 1.4], [103, 1.4], [103, 1.3]]] });
                    var args = { filters: [filter.geoWithinGeoJSONRegion('mg', region, MAPVALUES, new Context().addMapKey('nested'))] };
                    verifyQueryResults(args, 'nested point map match', done);
                });
            });
            it('accepts a plain object as GeoJSON', function (done) {
                var region = { type: 'Polygon', coordinates: [[[103, 1.3], [104, 1.3], [104, 1.4], [103, 1.4], [103, 1.3]]] };
                var args = { filters: [filter.geoWithinGeoJSONRegion('g', region)] };
                verifyQueryResults(args, 'point match', done);
            });
        });
        describe('filter.geoWithinRadius()', function () {
            it('should match locations within a radius from another location', function (done) {
                var args = { filters: [filter.geoWithinRadius('g', 103.9135, 1.3085, 15000)] };
                verifyQueryResults(args, 'point match', done);
            });
            it('should match locations in a list within a radius from another location', function (done) {
                var args = { filters: [filter.geoWithinRadius('lg', 103.9135, 1.3085, 15000, LIST)] };
                verifyQueryResults(args, 'point list match', done);
            });
            describe('index with cdt context', function () {
                helper.skipUnlessVersion('>= 6.1.0', this);
                it('should match locations in a list within a radius from another location in a nested context', function (done) {
                    var args = { filters: [filter.geoWithinRadius('lg', 103.9135, 1.3085, 15000, LIST, new Context().addMapKey('nested'))] };
                    verifyQueryResults(args, 'nested point list match', done);
                });
            });
            it('should match locations in a map within a radius from another location', function (done) {
                var args = { filters: [filter.geoWithinRadius('mg', 103.9135, 1.3085, 15000, MAPVALUES)] };
                verifyQueryResults(args, 'point map match', done);
            });
            describe('index with cdt context', function () {
                helper.skipUnlessVersion('>= 6.1.0', this);
                it('should match locations in a map within a radius from another location in a nested context', function (done) {
                    var args = { filters: [filter.geoWithinRadius('mg', 103.9135, 1.3085, 15000, MAPVALUES, new Context().addMapKey('nested'))] };
                    verifyQueryResults(args, 'nested point map match', done);
                });
            });
        });
        describe('filter.geoContainsGeoJSONPoint()', function () {
            it('should match regions that contain a GeoJSON point', function (done) {
                var point = new GeoJSON({ type: 'Point', coordinates: [103.913, 1.308] });
                var args = { filters: [filter.geoContainsGeoJSONPoint('g', point)] };
                verifyQueryResults(args, 'region match', done);
            });
            it('should match regions in a list that contain a GeoJSON point', function (done) {
                var point = new GeoJSON({ type: 'Point', coordinates: [103.913, 1.308] });
                var args = { filters: [filter.geoContainsGeoJSONPoint('lg', point, LIST)] };
                verifyQueryResults(args, 'region list match', done);
            });
            describe('index with cdt context', function () {
                helper.skipUnlessVersion('>= 6.1.0', this);
                it('should match regions in a list that contain a GeoJSON point in a nested context', function (done) {
                    var point = new GeoJSON({ type: 'Point', coordinates: [103.913, 1.308] });
                    var args = { filters: [filter.geoContainsGeoJSONPoint('lg', point, LIST, new Context().addMapKey('nested'))] };
                    verifyQueryResults(args, 'nested region list match', done);
                });
            });
            it('should match regions in a map that contain a GeoJSON point', function (done) {
                var point = new GeoJSON({ type: 'Point', coordinates: [103.913, 1.308] });
                var args = { filters: [filter.geoContainsGeoJSONPoint('mg', point, MAPVALUES)] };
                verifyQueryResults(args, 'region map match', done);
            });
            describe('index with cdt context', function () {
                helper.skipUnlessVersion('>= 6.1.0', this);
                it('should match regions in a map that contain a GeoJSON point in a nested context', function (done) {
                    var point = new GeoJSON({ type: 'Point', coordinates: [103.913, 1.308] });
                    var args = { filters: [filter.geoContainsGeoJSONPoint('mg', point, MAPVALUES, new Context().addMapKey('nested'))] };
                    verifyQueryResults(args, 'nested region map match', done);
                });
            });
            it('accepts a plain object as GeoJSON', function (done) {
                var point = { type: 'Point', coordinates: [103.913, 1.308] };
                var args = { filters: [filter.geoContainsGeoJSONPoint('g', point)] };
                verifyQueryResults(args, 'region match', done);
            });
        });
        describe('filter.geoContainsPoint()', function () {
            it('should match regions that contain a lng/lat coordinate pair', function (done) {
                var args = { filters: [filter.geoContainsPoint('g', 103.913, 1.308)] };
                verifyQueryResults(args, 'region match', done);
            });
            it('should match regions in a list that contain a lng/lat coordinate pair', function (done) {
                var args = { filters: [filter.geoContainsPoint('lg', 103.913, 1.308, LIST)] };
                verifyQueryResults(args, 'region list match', done);
            });
            describe('index with cdt context', function () {
                helper.skipUnlessVersion('>= 6.1.0', this);
                it('should match regions in a list that contain a lng/lat coordinate pair in a nested context', function (done) {
                    var args = { filters: [filter.geoContainsPoint('lg', 103.913, 1.308, LIST, new Context().addMapKey('nested'))] };
                    verifyQueryResults(args, 'nested region list match', done);
                });
            });
            it('should match regions in a map that contain a lng/lat coordinate pair', function (done) {
                var args = { filters: [filter.geoContainsPoint('mg', 103.913, 1.308, MAPVALUES)] };
                verifyQueryResults(args, 'region map match', done);
            });
            describe('index with cdt context', function () {
                helper.skipUnlessVersion('>= 6.1.0', this);
                it('should match regions in a map that contain a lng/lat coordinate pair in a nested context', function (done) {
                    var args = { filters: [filter.geoContainsPoint('mg', 103.913, 1.308, MAPVALUES, new Context().addMapKey('nested'))] };
                    verifyQueryResults(args, 'nested region map match', done);
                });
            });
        });
    });
});
