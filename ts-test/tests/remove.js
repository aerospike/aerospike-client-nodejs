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
/* global expect, describe, context, it */
var aerospike_1 = require("aerospike");
var chai_1 = require("chai");
var helper = require("./test_helper");
var keygen = helper.keygen;
var status = aerospike_1.default.status;
var AerospikeError = aerospike_1.default.AerospikeError;
describe('client.remove()', function () {
    var client = helper.client;
    it('removes an existing record', function () {
        var key = keygen.string(helper.namespace, helper.set, { prefix: 'test/remove/' })();
        return client.put(key, { str: 'abcde' })
            .then(function () { return client.remove(key); })
            .then(function () { return client.exists(key); })
            .then(function (result) { return (0, chai_1.expect)(result).to.be.false; });
    });
    it('returns an error when trying to remove a non-existing key', function () {
        var key = keygen.string(helper.namespace, helper.set, { prefix: 'test/remove/' })();
        return client.remove(key)
            .catch(function (error) {
            return (0, chai_1.expect)(error).to.be.instanceof(AerospikeError).with.property('code', status.ERR_RECORD_NOT_FOUND);
        });
    });
    context('with generation policy value', function () {
        it('should remove the record if the generation matches', function () {
            var key = keygen.string(helper.namespace, helper.set, { prefix: 'test/remove/' })();
            var policy = new aerospike_1.default.RemovePolicy({
                gen: aerospike_1.default.policy.gen.EQ,
                generation: 1
            });
            return client.put(key, { str: 'abcde' })
                .then(function () {
                return client.remove(key, policy);
            })
                .then(function () { return client.exists(key); })
                .then(function (result) { return (0, chai_1.expect)(result).to.be.false; });
        });
        it('should not remove the record if the generation does not match', function () {
            var key = keygen.string(helper.namespace, helper.set, { prefix: 'test/remove/' })();
            var policy = new aerospike_1.default.RemovePolicy({
                gen: aerospike_1.default.policy.gen.EQ,
                generation: 1
            });
            return client.put(key, { str: 'abcde' })
                .then(function () {
                return client.remove(key, policy)
                    .catch(function (error) {
                    return (0, chai_1.expect)(error).to.be.instanceof(AerospikeError).with.property('code', status.ERR_RECORD_GENERATION);
                });
            })
                .then(function () { return client.exists(key); })
                .then(function (result) { return (0, chai_1.expect)(result).to.be.false; });
        });
    });
});
