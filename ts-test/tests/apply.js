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
/* global expect, describe, it, before, after */
var aerospike_1 = require("aerospike");
var helper = require("./test_helper");
var chai_1 = require("chai");
var AerospikeError = aerospike_1.default.AerospikeError;
var keygen = helper.keygen;
describe('client.apply()', function () {
    var client = helper.client;
    var key = keygen.string(helper.namespace, helper.set, { prefix: 'test/apply/' })();
    before(function () { return helper.udf.register('udf.lua')
        .then(function () { return client.put(key, { foo: 'bar' }, { ttl: 1000 }); }); });
    after(function () { return helper.udf.remove('udf.lua')
        .then(function () { return client.remove(key); }); });
    it('should invoke an UDF to without any args', function (done) {
        var udfArgs = { module: 'udf', funcname: 'withoutArguments' };
        client.apply(key, udfArgs, function (error, result) {
            if (error)
                throw error;
            (0, chai_1.expect)(result).to.equal(1);
            done();
        });
    });
    it('should invoke an UDF with arguments', function (done) {
        var udfArgs = { module: 'udf', funcname: 'withArguments', args: [42] };
        client.apply(key, udfArgs, function (error, result) {
            if (error)
                throw error;
            (0, chai_1.expect)(result).to.equal(42);
            done();
        });
    });
    context('with ApplyPolicy', function () {
        helper.skipUnlessVersionAndEnterprise('>= 8.0.0', this);
        it('onLockingOnly should fail when writing to a locked record', function () {
            return __awaiter(this, void 0, void 0, function () {
                var mrt, policy, udf, error_1, result;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            mrt = new aerospike_1.default.Transaction();
                            policy = new aerospike_1.default.ApplyPolicy({
                                totalTimeout: 1500,
                                onLockingOnly: true,
                                txn: mrt
                            });
                            udf = {
                                module: 'udf',
                                funcname: 'updateRecord',
                                args: ['example', 45]
                            };
                            return [4 /*yield*/, client.apply(key, udf, policy)];
                        case 1:
                            _a.sent();
                            _a.label = 2;
                        case 2:
                            _a.trys.push([2, 4, 6, 8]);
                            return [4 /*yield*/, client.apply(key, udf, policy)];
                        case 3:
                            _a.sent();
                            chai_1.assert.fail('An error should have been caught');
                            return [3 /*break*/, 8];
                        case 4:
                            error_1 = _a.sent();
                            (0, chai_1.expect)(error_1).to.be.instanceof(AerospikeError).with.property('code', aerospike_1.status.MRT_ALREADY_LOCKED);
                            return [4 /*yield*/, client.get(key)];
                        case 5:
                            result = _a.sent();
                            (0, chai_1.expect)(result.bins).to.eql({ foo: 'bar' });
                            return [3 /*break*/, 8];
                        case 6: return [4 /*yield*/, client.abort(mrt)];
                        case 7:
                            _a.sent();
                            return [7 /*endfinally*/];
                        case 8: return [2 /*return*/];
                    }
                });
            });
        });
    });
    it('should invoke an UDF with apply policy', function (done) {
        var policy = new aerospike_1.default.ApplyPolicy({
            totalTimeout: 1500
        });
        var udf = {
            module: 'udf',
            funcname: 'withArguments',
            args: [[1, 2, 3]]
        };
        client.apply(key, udf, policy, function (error, result) {
            if (error)
                throw error;
            (0, chai_1.expect)(result).to.eql([1, 2, 3]);
            done();
        });
    });
    it('should return an error if the user-defined function does not exist', function (done) {
        var udfArgs = { module: 'udf', funcname: 'not-such-function' };
        client.apply(key, udfArgs, function (error, result) {
            (0, chai_1.expect)(error).to.be.instanceof(AerospikeError).with.property('code', aerospike_1.default.status.ERR_UDF);
            done();
        });
    });
    /*
    it('should return an error if the UDF arguments are invalid', function (done) {
      const udfArgs = { module: 'udf', funcname: 'noop', args: 42 } // args should always be an array
      client.apply(key, udfArgs, function (error?: Error, result?: AerospikeRecord) {
        expect(error).to.be.instanceof(AerospikeError).with.property('code', Aerospike.status.ERR_PARAM)
        done()
      })
    })
    */
    it('should return a Promise that resolves to the return value of the UDF function', function () {
        var udfArgs = { module: 'udf', funcname: 'withoutArguments' };
        return client.apply(key, udfArgs)
            .then(function (result) { return (0, chai_1.expect)(result).to.equal(1); });
    });
});
