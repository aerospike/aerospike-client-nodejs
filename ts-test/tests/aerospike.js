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
var client;
describe('Aerospike', function () {
    describe('Aerospike.client() #noserver', function () {
        it('instantiates a new client instance', function (done) {
            client = aerospike_1.default.client(helper.config);
            (0, chai_1.expect)(client).to.be.instanceof(aerospike_1.default.Client);
            done();
        });
    });
    describe('Aerospike.connect()', function () {
        it('instantiates a new client instance and connects to the cluster', function (done) {
            aerospike_1.default.connect(helper.config, function (error, client) {
                if (error)
                    throw error;
                (0, chai_1.expect)(client).to.be.instanceof(aerospike_1.default.Client);
                client === null || client === void 0 ? void 0 : client.infoAny(function (err) {
                    if (err)
                        throw err;
                    client.close(false);
                    done();
                });
            });
        });
        it('returns a Promise that resolves to a client', function () {
            return aerospike_1.default.connect(helper.config)
                .then(function (client) {
                (0, chai_1.expect)(client).to.be.instanceof(aerospike_1.default.Client);
                return client;
            })
                .then(function (client) { return client.close(false); });
        });
    });
});
