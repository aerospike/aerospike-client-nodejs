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
/* eslint-disable no-unused-expressions */
var aerospike_1 = require("aerospike");
var helper = require("./test_helper");
var chai_1 = require("chai");
var keygen = helper.keygen;
var metagen = helper.metagen;
var recgen = helper.recgen;
var putgen = helper.putgen;
var valgen = helper.valgen;
describe('client.batchGet()', function () {
    var client = helper.client;
    it('should successfully read 10 records', function () {
        var numberOfRecords = 10;
        var generators = {
            keygen: keygen.string(helper.namespace, helper.set, { prefix: 'test/batch_get/success', random: false }),
            recgen: recgen.record({ i: valgen.integer(), s: valgen.string(), b: valgen.bytes() }),
            metagen: metagen.constant({ ttl: 1000 })
        };
        return putgen.put(numberOfRecords, generators)
            .then(function (records) {
            var keys = records.map(function (record) { return record.key; });
            return client.batchGet(keys)
                .then(function (results) {
                (0, chai_1.expect)(results.length).to.equal(numberOfRecords);
                results.forEach(function (result) {
                    var putRecord = records.find(function (record) { return record.key.key === (result === null || result === void 0 ? void 0 : result.record.key.key); });
                    (0, chai_1.expect)(result === null || result === void 0 ? void 0 : result.status).to.equal(aerospike_1.default.status.OK);
                    (0, chai_1.expect)(result === null || result === void 0 ? void 0 : result.record.bins).to.eql(putRecord === null || putRecord === void 0 ? void 0 : putRecord.bins);
                });
            });
        });
    });
    it('should fail reading 10 records', function (done) {
        var numberOfRecords = 10;
        var kgen = keygen.string(helper.namespace, helper.set, { prefix: 'test/batch_get/fail/', random: false });
        var keys = keygen.range(kgen, numberOfRecords);
        client.batchGet(keys, function (err, results) {
            (0, chai_1.expect)(err).not.to.be.ok;
            (0, chai_1.expect)(results === null || results === void 0 ? void 0 : results.length).to.equal(numberOfRecords);
            results === null || results === void 0 ? void 0 : results.forEach(function (result) {
                (0, chai_1.expect)(result.status).to.equal(aerospike_1.default.status.ERR_RECORD_NOT_FOUND);
            });
            done();
        });
    });
    it('returns an empty array when no keys are passed', function () {
        client.batchGet([])
            .then(function (results) { return (0, chai_1.expect)(results).to.eql([]); });
    });
});
