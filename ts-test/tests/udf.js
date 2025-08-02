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
/* global context, it, expect */
var path = require('path');
var aerospike_1 = require("aerospike");
var chai_1 = require("chai");
var helper = require("./test_helper");
context('registering/unregistering UDF modules', function () {
    var client = helper.client;
    var module = 'udf.lua';
    var filename = path.join(__dirname, module);
    it('should register and then remove a module', function (done) {
        client.udfRegister(filename, function (err, registerJob) {
            if (err)
                throw err;
            registerJob === null || registerJob === void 0 ? void 0 : registerJob.wait(10, function (err) {
                if (err)
                    throw err;
                client.udfRemove(module, function (err, removeJob) {
                    if (err)
                        throw err;
                    removeJob === null || removeJob === void 0 ? void 0 : removeJob.wait(10, done);
                });
            });
        });
    });
    it('should register a module as Lua language', function (done) {
        client.udfRegister(filename, aerospike_1.default.language.LUA, function (err, registerJob) {
            if (err)
                throw err;
            registerJob === null || registerJob === void 0 ? void 0 : registerJob.wait(10, function (err) {
                if (err)
                    throw err;
                client.udfRemove(module, function (err, removeJob) {
                    if (err)
                        throw err;
                    removeJob === null || removeJob === void 0 ? void 0 : removeJob.wait(10, done);
                });
            });
        });
    });
    it('should register a module with an info policy', function (done) {
        var policy = new aerospike_1.default.InfoPolicy({
            timeout: 1000,
            sendAsIs: true,
            checkBounds: false
        });
        client.udfRegister(filename, policy, function (err, registerJob) {
            if (err)
                throw err;
            registerJob === null || registerJob === void 0 ? void 0 : registerJob.wait(10, function (err) {
                if (err)
                    throw err;
                client.udfRemove(module, function (err, removeJob) {
                    if (err)
                        throw err;
                    removeJob === null || removeJob === void 0 ? void 0 : removeJob.wait(10, done);
                });
            });
        });
    });
    it('should register a module as Lua language with an info policy', function (done) {
        var policy = new aerospike_1.default.InfoPolicy({
            timeout: 1000,
            sendAsIs: true,
            checkBounds: false
        });
        client.udfRegister(filename, aerospike_1.default.language.LUA, policy, function (err, registerJob) {
            if (err)
                throw err;
            registerJob === null || registerJob === void 0 ? void 0 : registerJob.wait(10, function (err) {
                if (err)
                    throw err;
                client.udfRemove(module, function (err, removeJob) {
                    if (err)
                        throw err;
                    removeJob === null || removeJob === void 0 ? void 0 : removeJob.wait(10, done);
                });
            });
        });
    });
    it('returns a Promise if no callback function is passed', function () {
        return client.udfRegister(filename)
            .then(function (job) { return job.wait(10); })
            .then(function () { return client.udfRemove(module); })
            .then(function (job) { return job.wait(10); });
    });
    context('error handling', function () {
        it('should fail to register an non-existent module', function (done) {
            client.udfRegister('no-such-udf.lua', function (err) {
                (0, chai_1.expect)(err === null || err === void 0 ? void 0 : err.code).to.equal(aerospike_1.default.status.ERR_CLIENT);
                done();
            });
        });
        it('should fail to register module with invalid language', function (done) {
            client.udfRegister(filename, -99, function (err) {
                (0, chai_1.expect)(err === null || err === void 0 ? void 0 : err.code).to.equal(aerospike_1.default.status.ERR_PARAM);
                done();
            });
        });
        context('removing a non-existent module', function () {
            context('server version 4.5.1 and later', function () {
                helper.skipUnlessVersion('>= 4.5.1', this);
                it('should not fail when removing a non-existent module', function () {
                    return client.udfRemove('no-such-udf.lua').then(function (job) { return job.waitUntilDone(); });
                });
            });
            context('server version 4.5.0 and earlier', function () {
                helper.skipUnlessVersion('< 4.5.1', this);
                it('should return an error when removing a non-existent module', function (done) {
                    client.udfRemove('no-such-udf.lua', function (error) {
                        (0, chai_1.expect)(error).to.exist.and.have.property('code', aerospike_1.default.status.ERR_UDF);
                        done();
                    });
                });
            });
        });
    });
});
