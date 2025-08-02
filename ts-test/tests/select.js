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
/* global expect, describe, it */
var aerospike_1 = require("aerospike");
var chai_1 = require("chai");
var helper = require("./test_helper");
var keygen = helper.keygen;
var recgen = helper.recgen;
var valgen = helper.valgen;
var status = aerospike_1.default.status;
describe('client.select()', function () {
    var client = helper.client;
    it('should read the record', function (done) {
        var key = keygen.string(helper.namespace, helper.set, { prefix: 'test/select/' })();
        var meta = { ttl: 1000 };
        var bins = recgen.record({ i: valgen.integer(), s: valgen.string(), b: valgen.bytes() })();
        var selected = ['i', 's'];
        client.put(key, bins, meta, function (err) {
            if (err)
                throw err;
            client.select(key, selected, function (err, record) {
                if (err)
                    throw err;
                (0, chai_1.expect)(record === null || record === void 0 ? void 0 : record.bins).to.have.all.keys(selected);
                for (var bin in selected) {
                    (0, chai_1.expect)(record === null || record === void 0 ? void 0 : record.bins[bin]).to.equal(bins[bin]);
                }
                client.remove(key, function (err) {
                    if (err)
                        throw err;
                    done();
                });
            });
        });
    });
    it('should fail - when a select is called without key', function (done) {
        var key = keygen.string(helper.namespace, helper.set, { prefix: 'test/select/' })();
        var meta = { ttl: 1000 };
        var bins = recgen.record({ i: valgen.integer(), s: valgen.string(), b: valgen.bytes() })();
        var selected = ['i', 's'];
        client.put(key, bins, meta, function (err) {
            if (err)
                throw err;
            client.select({ ns: helper.namespace, set: helper.set }, selected, function (err) {
                (0, chai_1.expect)(err.code).to.equal(status.ERR_PARAM);
                client.remove(key, function (err) {
                    if (err)
                        throw err;
                    done();
                });
            });
        });
    });
    it('should not find the record', function (done) {
        var key = keygen.string(helper.namespace, helper.set, { prefix: 'test/select/not_found/' })();
        client.select(key, ['i'], function (err, record) {
            (0, chai_1.expect)(err.code).to.equal(status.ERR_RECORD_NOT_FOUND);
            done();
        });
    });
    it('should read the record w/ a key send policy', function (done) {
        var key = keygen.string(helper.namespace, helper.set, { prefix: 'test/select/' })();
        var meta = { ttl: 1000 };
        var bins = recgen.record({ i: valgen.integer(), s: valgen.string(), b: valgen.bytes() })();
        var selected = ['i', 's'];
        var policy = new aerospike_1.default.ReadPolicy({
            key: aerospike_1.default.policy.key.SEND
        });
        client.put(key, bins, meta, function (err) {
            if (err)
                throw err;
            client.select(key, selected, policy, function (err, record) {
                if (err)
                    throw err;
                (0, chai_1.expect)(record.bins).to.have.all.keys(selected);
                for (var bin in selected) {
                    (0, chai_1.expect)(record.bins[bin]).to.equal(bins[bin]);
                }
                client.remove(key, function (err) {
                    if (err)
                        throw err;
                    done();
                });
            });
        });
    });
    it('should return a Promise that resolves to a Record', function () {
        var key = keygen.string(helper.namespace, helper.set, { prefix: 'test/select/' })();
        return client.put(key, { i: 42, s: 'abc', f: 3.1416 })
            .then(function () { return client.select(key, ['i', 'f']); })
            .then(function (record) { return (0, chai_1.expect)(record.bins).to.eql({ i: 42, f: 3.1416 }); })
            .then(function () { return client.remove(key); });
    });
});
