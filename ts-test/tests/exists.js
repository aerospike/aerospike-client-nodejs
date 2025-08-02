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
var helper = require("./test_helper");
var chai_1 = require("chai");
var keygen = helper.keygen;
describe('client.exists()', function () {
    var client = helper.client;
    context('Promises', function () {
        it('returns true if the record exists', function () {
            var key = keygen.string(helper.namespace, helper.set, { prefix: 'test/exists/1' })();
            return client.put(key, { str: 'abcde' })
                .then(function () { return client.exists(key); })
                .then(function (result) { return (0, chai_1.expect)(result).to.be.true; })
                .then(function () { return client.remove(key); });
        });
        it('returns false if the record does not exist', function () {
            var key = keygen.string(helper.namespace, helper.set, { prefix: 'test/exists/2' })();
            return client.exists(key)
                .then(function (result) { return (0, chai_1.expect)(result).to.be.false; });
        });
    });
    context('Callbacks', function () {
        it('returns true if the record exists', function (done) {
            var key = keygen.string(helper.namespace, helper.set, { prefix: 'test/exists/3' })();
            client.put(key, { str: 'abcde' }, function (error) {
                if (error)
                    throw error;
                client.exists(key, function (error, result) {
                    if (error)
                        throw error;
                    (0, chai_1.expect)(result).to.be.true;
                    client.remove(key, function (error) {
                        if (error)
                            throw error;
                        done();
                    });
                });
            });
        });
        it('returns false if the record does not exist', function (done) {
            var key = keygen.string(helper.namespace, helper.set, { prefix: 'test/exists/4' })();
            client.exists(key, function (error, result) {
                if (error)
                    throw error;
                (0, chai_1.expect)(result).to.be.false;
                done();
            });
        });
    });
});
describe('client.existsWithMetadata()', function () {
    var client = helper.client;
    context('Promises', function () {
        it('returns an Aerospike Record with Metatdata if the record exists', function () {
            var key = keygen.string(helper.namespace, helper.set, { prefix: 'test/exists/5' })();
            return client.put(key, { str: 'abcde' }, { ttl: 50, gen: 7 })
                .then(function () { return client.put(key, { str: 'abcd' }, { ttl: 50, gen: 7 }); })
                .then(function () { return client.put(key, { str: 'abc' }, { ttl: 50, gen: 7 }); })
                .then(function () { return client.put(key, { str: 'ab' }, { ttl: 50, gen: 7 }); })
                .then(function () { return client.put(key, { str: 'a' }, { ttl: 50, gen: 7 }); })
                .then(function () { return client.put(key, { str: 'abcde' }, { ttl: 50, gen: 7 }); })
                .then(function () { return client.existsWithMetadata(key); })
                .then(function (result) {
                (0, chai_1.expect)(result.key).to.eql(key);
                (0, chai_1.expect)(result.bins).to.be.null;
                (0, chai_1.expect)(result.ttl).to.be.within(48, 51);
                (0, chai_1.expect)(result.gen).to.eql(6);
            })
                .then(function () { return client.remove(key); });
        });
        it('returns an Aerospike Record with Metatdata if the record exists and no meta or ttl is set', function () {
            var key = keygen.string(helper.namespace, helper.set, { prefix: 'test/exists/6' })();
            return client.put(key, { str: 'abcde' }, { ttl: -1 })
                .then(function () { return client.existsWithMetadata(key); })
                .then(function (result) {
                (0, chai_1.expect)(result.key).to.eql(key);
                (0, chai_1.expect)(result.bins).to.be.null;
                (0, chai_1.expect)(result.ttl).to.eql(-1);
                (0, chai_1.expect)(result.gen).to.eql(1);
            })
                .then(function () { return client.remove(key); });
        });
        it('returns false if the record does not exist', function () {
            var key = keygen.string(helper.namespace, helper.set, { prefix: 'test/exists/7' })();
            return client.existsWithMetadata(key)
                .then(function (result) {
                (0, chai_1.expect)(result.key).to.equal(key);
                (0, chai_1.expect)(result.bins).to.be.null;
                (0, chai_1.expect)(result.ttl).to.be.null;
                (0, chai_1.expect)(result.gen).to.be.null;
            });
        });
    });
    context('Callbacks', function () {
        it('returns an Aerospike Record with Metatdata if the record exists', function (done) {
            var key = keygen.string(helper.namespace, helper.set, { prefix: 'test/exists/8' })();
            client.put(key, { str: 'abcde' }, { ttl: 100, gen: 14 }, function (error) {
                if (error)
                    throw error;
                client.existsWithMetadata(key, function (error, result) {
                    if (error)
                        throw error;
                    (0, chai_1.expect)(result === null || result === void 0 ? void 0 : result.key).to.equal(key);
                    (0, chai_1.expect)(result === null || result === void 0 ? void 0 : result.bins).to.be.null;
                    (0, chai_1.expect)(result === null || result === void 0 ? void 0 : result.ttl).to.be.within(98, 101);
                    (0, chai_1.expect)(result === null || result === void 0 ? void 0 : result.gen).to.eql(1);
                    client.remove(key, function (error) {
                        if (error)
                            throw error;
                        done();
                    });
                });
            });
        });
        it('returns an Aerospike Record without Metatdata if the record does not exist', function (done) {
            var key = keygen.string(helper.namespace, helper.set, { prefix: 'test/exists/9' })();
            client.existsWithMetadata(key, function (error, result) {
                if (error)
                    throw error;
                (0, chai_1.expect)(result === null || result === void 0 ? void 0 : result.key).to.equal(key);
                (0, chai_1.expect)(result === null || result === void 0 ? void 0 : result.bins).to.be.null;
                (0, chai_1.expect)(result === null || result === void 0 ? void 0 : result.ttl).to.be.null;
                (0, chai_1.expect)(result === null || result === void 0 ? void 0 : result.gen).to.be.null;
                done();
            });
        });
    });
});
