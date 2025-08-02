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
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-env mocha */
/* global expect */
var aerospike_1 = require("aerospike");
var chai_1 = require("chai");
var helper = require("./test_helper");
var Key = aerospike_1.default.Key;
var GeoJSON = aerospike_1.default.GeoJSON;
describe('Aerospike.GeoJSON', function () {
    context('GeoJSON class #noserver', function () {
        var subject = new GeoJSON({ type: 'Point', coordinates: [103.913, 1.308] });
        describe('constructor', function () {
            it('returns a new GeoJSON value when called as an Object constructor', function () {
                (0, chai_1.expect)(new GeoJSON({ type: 'Point', coordinates: [103.913, 1.308] })).to.be.instanceof(GeoJSON);
            });
            /*
            it('returns a new GeoJSON value when called as function', function () {
              expect(GeoJSON({ type: 'Point', coordinates: [103.913, 1.308] })).to.be.instanceof(GeoJSON)
            })
            */
            it('parses a GeoJSON string', function () {
                (0, chai_1.expect)(new GeoJSON('{"type": "Point", "coordinates": [103.913, 1.308]}')).to.be.instanceof(GeoJSON);
            });
            /*
            it('throws a type error if passed an invalid GeoJSON value', function () {
              const fn: function = () => new GeoJSON(45)
              expect(fn).to.throw(TypeError)
            })
            */
        });
        describe('#value()', function () {
            it('returns the value as a JSON object', function () {
                (0, chai_1.expect)(subject.value()).to.eql({ type: 'Point', coordinates: [103.913, 1.308] });
            });
        });
        describe('#toJSON()', function () {
            it('returns the GeoJSON value as a JSON object', function () {
                (0, chai_1.expect)(subject.toJSON()).to.eql({ type: 'Point', coordinates: [103.913, 1.308] });
            });
        });
        describe('#toString()', function () {
            it('returns a string representation of the GeoJSON value', function () {
                (0, chai_1.expect)(subject.toString()).to.equal('{"type":"Point","coordinates":[103.913,1.308]}');
            });
        });
        describe('GeoJSON.Point()', function () {
            it('returns the lat, lng as a GeoJSON point value', function () {
                var point = new GeoJSON({ type: 'Point', coordinates: [103.913, 1.308] });
                (0, chai_1.expect)(new GeoJSON.Point(103.913, 1.308)).to.eql(point);
            });
        });
        describe('GeoJSON.Polygon()', function () {
            it('returns the coordinates as a GeoJSON polygon value', function () {
                var polygon = new GeoJSON({ type: 'Polygon', coordinates: [[[103.913, 1.308], [104.913, 1.308], [104.913, 1.408], [103.913, 1.408], [103.913, 1.408]]] });
                (0, chai_1.expect)(new GeoJSON.Polygon([103.913, 1.308], [104.913, 1.308], [104.913, 1.408], [103.913, 1.408], [103.913, 1.408])).to.eql(polygon);
            });
        });
        describe('GeoJSON.Circle()', function () {
            it('creates a GeoJSON circle representation', function () {
                var circle = new GeoJSON({ type: 'AeroCircle', coordinates: [[-122.250629, 37.871022], 300] });
                (0, chai_1.expect)(new GeoJSON.Circle(-122.250629, 37.871022, 300)).to.eql(circle);
            });
        });
    });
    describe('putting and getting GeoJSON values', function () {
        var client = helper.client;
        var point = JSON.stringify({ type: 'Point', coordinates: [103.9139, 1.3030] });
        var geojson = new GeoJSON(point);
        var key = new Key(helper.namespace, helper.set, 'test/geojson');
        var meta = { ttl: 1000 };
        var policy = new aerospike_1.default.WritePolicy({
            exists: aerospike_1.default.policy.exists.CREATE_OR_REPLACE
        });
        it('can put/get a GeoJSON bin value', function (done) {
            var record = { location: geojson };
            client.put(key, record, meta, policy, function (err) {
                if (err)
                    throw err;
                client.get(key, function (err, record) {
                    if (err)
                        throw err;
                    (0, chai_1.expect)(record === null || record === void 0 ? void 0 : record.bins.location).to.equal(point);
                    done();
                });
            });
        });
        it('can put/get a GeoJSON value in a list bin', function (done) {
            var record = { locations: [geojson, geojson] };
            client.put(key, record, meta, policy, function (err) {
                if (err)
                    throw err;
                client.get(key, function (err, record) {
                    if (err)
                        throw err;
                    (0, chai_1.expect)(record === null || record === void 0 ? void 0 : record.bins.locations).to.eql([point, point]);
                    done();
                });
            });
        });
        it('can put/get a GeoJSON value in a map bin', function (done) {
            var record = { map: { location: geojson } };
            client.put(key, record, meta, policy, function (err) {
                if (err)
                    throw err;
                client.get(key, function (err, record) {
                    if (err)
                        throw err;
                    (0, chai_1.expect)((record === null || record === void 0 ? void 0 : record.bins.map).location).to.equal(point);
                    done();
                });
            });
        });
    });
});
