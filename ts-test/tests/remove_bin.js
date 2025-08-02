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
/* global describe, context, it */
var aerospike_1 = require("aerospike");
var chai_1 = require("chai");
var helper = require("./test_helper");
var keygen = helper.keygen;
var status = aerospike_1.default.status;
var AerospikeError = aerospike_1.default.AerospikeError;
describe('client.put(null bin)', function () {
    var client = helper.client;
    context('with simple put null value', function () {
        it('delete bin using null put', function () {
            var key = keygen.string(helper.namespace, helper.set, { prefix: 'test/remove_bin/' })();
            return client.put(key, { str: 'abcde' })
                .then(function () {
                client.put(key, { str: null })
                    .then(function () {
                    client.get(key, function (err) {
                        (0, chai_1.expect)(err).to.be.instanceof(AerospikeError).with.property('code', status.ERR_RECORD_NOT_FOUND);
                    });
                });
            });
        });
    });
});
