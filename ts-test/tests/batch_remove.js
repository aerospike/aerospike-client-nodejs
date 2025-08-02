// *****************************************************************************
// Copyright 2022-2023 Aerospike, Inc.
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
/* eslint-env mocha */
/* global expect */
/* eslint-disable no-unused-expressions */
var aerospike_1 = require("aerospike");
var helper = require("./test_helper");
var chai_1 = require("chai");
// const util = require('util')
var keygen = helper.keygen;
var metagen = helper.metagen;
var recgen = helper.recgen;
var putgen = helper.putgen;
var valgen = helper.valgen;
var Key = aerospike_1.default.Key;
describe('client.batchRemove()', function () {
    var client = helper.client;
    before(function () {
        var nrecords = 10;
        var generators = {
            keygen: keygen.string(helper.namespace, helper.set, { prefix: 'test/batch_remove/', random: false }),
            recgen: recgen.record({
                i: valgen.integer(),
                s: valgen.string(),
                str2: valgen.string('hello'),
                l: function () { return [1, 2, 3]; },
                m: function () { return { a: 1, b: 2, c: 3 }; }
            }),
            metagen: metagen.constant({ ttl: 1000 })
        };
        return putgen.put(nrecords, generators);
    });
    context('with batch remove', function () {
        helper.skipUnlessVersion('>= 6.0.0', this);
        it('removes batch of records', function (done) {
            var batchRecords = [
                new Key(helper.namespace, helper.set, 'test/batch_remove/1'),
                new Key(helper.namespace, helper.set, 'test/batch_remove/2'),
                new Key(helper.namespace, helper.set, 'test/batch_remove/3'),
                new Key(helper.namespace, helper.set, 'test/batch_remove/4'),
                new Key(helper.namespace, helper.set, 'test/batch_remove/5')
            ];
            client.batchRemove(batchRecords, function (err, results) {
                (0, chai_1.expect)(err).not.to.be.ok;
                results = results || [];
                (0, chai_1.expect)(results.length).to.equal(5);
                results.forEach(function (result) {
                    (0, chai_1.expect)(result.status).to.equal(aerospike_1.default.status.OK);
                    // expect(results.record.bins).to.be.empty()
                    // console.log(util.inspect(result, true, 10, true))
                });
                done();
            });
        });
        it('Will return records even if generation values is not correct', function () {
            return __awaiter(this, void 0, void 0, function () {
                var batchRecords, error_1, results;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            batchRecords = [
                                new Key(helper.namespace, helper.set, 'test/batch_remove/6'),
                                new Key(helper.namespace, helper.set, 'test/batch_remove/7'),
                                new Key(helper.namespace, helper.set, 'test/batch_remove/8'),
                                new Key(helper.namespace, helper.set, 'test/batch_remove/9'),
                                new Key(helper.namespace, helper.set, 'test/batch_remove/0')
                            ];
                            _a.label = 1;
                        case 1:
                            _a.trys.push([1, 3, , 5]);
                            return [4 /*yield*/, client.batchRemove(batchRecords, null, new aerospike_1.default.BatchRemovePolicy({ gen: aerospike_1.default.policy.gen.EQ, generation: 10 }))
                                // Will fail if code makes it here
                            ];
                        case 2:
                            _a.sent();
                            // Will fail if code makes it here
                            chai_1.assert.fail('An error should have been caught');
                            return [3 /*break*/, 5];
                        case 3:
                            error_1 = _a.sent();
                            (0, chai_1.expect)(error_1.code).to.eql(-16);
                            return [4 /*yield*/, client.batchRemove(batchRecords)];
                        case 4:
                            results = _a.sent();
                            (0, chai_1.expect)(results.length).to.equal(5);
                            results.forEach(function (result) {
                                (0, chai_1.expect)(result.status).to.equal(aerospike_1.default.status.OK);
                                // expect(results.record.bins).to.be.empty()
                                // console.log(util.inspect(result, true, 10, true))
                            });
                            return [3 /*break*/, 5];
                        case 5: return [2 /*return*/];
                    }
                });
            });
        });
    });
});
