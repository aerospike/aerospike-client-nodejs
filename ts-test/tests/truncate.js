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
/* eslint-env mocha */
var aerospike_1 = require("aerospike");
var helper = require("./test_helper");
var sleep = helper.util.sleep;
var setgen = helper.valgen.string({
    prefix: 'test/trunc/',
    random: true,
    length: { min: 6, max: 6 }
});
var keygen = helper.keygen;
var metagen = helper.metagen;
var recgen = helper.recgen;
var putgen = helper.putgen;
describe('client.truncate() #slow', function () {
    helper.skipUnlessVersion('>= 3.12.0', this);
    var client = helper.client;
    // Generates a number of records; the callback function is called with a list
    // of the record keys.
    function genRecords(kgen, noRecords) {
        var generators = {
            keygen: kgen,
            recgen: recgen.constant({ a: 'foo', b: 'bar' }),
            metagen: metagen.constant({ ttl: 300 })
        };
        return putgen.put(noRecords, generators, {});
    }
    // Checks to verify that records that are supposed to have been truncated
    // are gone and that records that are supposed to remain still exist. If some
    // truncated records still exist it will try again every pollInt ms.
    function checkRecords(truncated, remaining, pollInt) {
        return __awaiter(this, void 0, void 0, function () {
            var results, _loop_1, _i, results_1, result, state_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, client.batchRead((truncated || []).concat(remaining || []))];
                    case 1:
                        results = _a.sent();
                        _loop_1 = function (result) {
                            var expectExist, _b;
                            return __generator(this, function (_c) {
                                switch (_c.label) {
                                    case 0:
                                        expectExist = !!remaining.find(function (record) { return record.key.equals(result.record.key); });
                                        _b = result.status;
                                        switch (_b) {
                                            case aerospike_1.default.status.OK: return [3 /*break*/, 1];
                                            case aerospike_1.default.status.ERR_RECORD_NOT_FOUND: return [3 /*break*/, 4];
                                        }
                                        return [3 /*break*/, 5];
                                    case 1:
                                        if (!!expectExist) return [3 /*break*/, 3];
                                        return [4 /*yield*/, sleep(pollInt)];
                                    case 2:
                                        _c.sent();
                                        return [2 /*return*/, { value: checkRecords(truncated, remaining, pollInt) }];
                                    case 3: return [3 /*break*/, 6];
                                    case 4:
                                        if (expectExist)
                                            throw new Error("Truncate removed record it wasn't supposed to: " + result.record.key);
                                        return [3 /*break*/, 6];
                                    case 5: throw new Error('Unexpected batchRead status code: ' + result.status);
                                    case 6: return [2 /*return*/];
                                }
                            });
                        };
                        _i = 0, results_1 = results;
                        _a.label = 2;
                    case 2:
                        if (!(_i < results_1.length)) return [3 /*break*/, 5];
                        result = results_1[_i];
                        return [5 /*yield**/, _loop_1(result)];
                    case 3:
                        state_1 = _a.sent();
                        if (typeof state_1 === "object")
                            return [2 /*return*/, state_1.value];
                        _a.label = 4;
                    case 4:
                        _i++;
                        return [3 /*break*/, 2];
                    case 5: return [2 /*return*/];
                }
            });
        });
    }
    it('deletes all records in the set', function () {
        return __awaiter(this, void 0, void 0, function () {
            var ns, set, noRecords, pollIntMs, kgen, records;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        ns = helper.namespace;
                        set = setgen();
                        noRecords = 5;
                        pollIntMs = 10 // Poll interval in ms to check whether records have been removed
                        ;
                        kgen = keygen.string(ns, set, { prefix: 'test/trunc/', random: false });
                        return [4 /*yield*/, genRecords(kgen, noRecords)];
                    case 1:
                        records = _a.sent();
                        return [4 /*yield*/, sleep(5)];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, client.truncate(ns, set, 0)];
                    case 3:
                        _a.sent();
                        return [4 /*yield*/, checkRecords(records, [], pollIntMs)];
                    case 4:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    });
    it('deletes all records with an older update timestamp', function () {
        return __awaiter(this, void 0, void 0, function () {
            var ns, set, noRecordsToDelete, noRecordsToRemain, pollIntMs, allowanceMs, kgen, batchToDelete, timeNanos, batchToRemain;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.timeout(15000);
                        ns = helper.namespace;
                        set = setgen();
                        noRecordsToDelete = 5;
                        noRecordsToRemain = 2;
                        pollIntMs = 100 // Poll interval in ms to check whether records have been removed
                        ;
                        allowanceMs = 5000 // Test will fail if client and server clocks differ by more than this many ms!
                        ;
                        kgen = keygen.string(ns, set, { prefix: 'test/trunc/del/', random: false });
                        return [4 /*yield*/, genRecords(kgen, noRecordsToDelete)];
                    case 1:
                        batchToDelete = _a.sent();
                        return [4 /*yield*/, sleep(allowanceMs)];
                    case 2:
                        _a.sent();
                        timeNanos = Date.now() * 1000000;
                        return [4 /*yield*/, sleep(allowanceMs)];
                    case 3:
                        _a.sent();
                        kgen = keygen.string(ns, set, { prefix: 'test/trunc/rem/', random: false });
                        return [4 /*yield*/, genRecords(kgen, noRecordsToRemain)];
                    case 4:
                        batchToRemain = _a.sent();
                        return [4 /*yield*/, sleep(5)];
                    case 5:
                        _a.sent();
                        return [4 /*yield*/, client.truncate(ns, set, timeNanos)];
                    case 6:
                        _a.sent();
                        return [4 /*yield*/, checkRecords(batchToDelete, batchToRemain, pollIntMs)];
                    case 7:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    });
});
