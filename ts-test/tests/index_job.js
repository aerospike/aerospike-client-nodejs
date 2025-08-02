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
/* global expect, beforeEach, afterEach, describe, it */
/* eslint-disable no-unused-expressions */
var aerospike_1 = require("aerospike");
var chai_1 = require("chai");
var helper = require("./test_helper");
var AerospikeError = aerospike_1.default.AerospikeError;
var IndexJob = aerospike_1.default.IndexJob;
describe('IndexJob', function () {
    var client = helper.client;
    var testIndex = { name: null, bin: null, counter: 0 };
    beforeEach(function () {
        testIndex.counter++;
        testIndex.name = 'idx-' + testIndex.counter + '-' + Math.floor(Math.random() * 10000000);
        testIndex.bin = 'bin-' + testIndex.counter + '-' + Math.floor(Math.random() * 10000000);
    });
    afterEach(function () { return helper.index.remove(testIndex.name); });
    describe('IndexJob#waitUntilDone()', function () {
        it('should wait until the index creation is completed', function (done) {
            var options = {
                ns: helper.namespace,
                set: helper.set,
                bin: testIndex.bin,
                index: testIndex.name
            };
            client.createIntegerIndex(options, function (err, job) {
                if (err)
                    throw err;
                job === null || job === void 0 ? void 0 : job.waitUntilDone(10, function (err) {
                    (0, chai_1.expect)(err).to.not.be.ok;
                    done();
                });
            });
        });
    });
    describe('IndexJob#checkStatus()', function () {
        it('should return a boolean indicating whether the job is done or not', function () {
            var options = {
                ns: helper.namespace,
                set: helper.set,
                bin: testIndex.bin,
                index: testIndex.name
            };
            return client.createIntegerIndex(options)
                .then(function (job) { return job.checkStatus(); })
                .then(function (status) { return (0, chai_1.expect)(status).to.be.a('boolean'); });
        });
        it('should return false if the index does not exist', function () {
            var job = new IndexJob(client, helper.namespace, 'thisIndexDoesNotExist');
            return job.checkStatus()
                .then(function (status) { return (0, chai_1.expect)(status).to.be.false; });
        });
        /*
        it('should return an error if one of the cluster nodes cannot be queried', function () {
          const client = Aerospike.client() // not connected, should return error when info command is executed
          const job: any = new IndexJob(client, helper.ns, 'thisIndexDoesNotExist')
          return job.checkStatus()
            .then(() => { throw new Error('Expected promise to reject') })
            .catch((error: any) => expect(error).to.be.instanceof(AerospikeError))
        })
        */
    });
});
