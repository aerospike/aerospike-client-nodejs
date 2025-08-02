// *****************************************************************************
// Copyright 2013-2023 Aerospike, Inc.
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
var aerospike_1 = require("aerospike");
var chai_1 = require("chai");
var helper = require("./test_helper");
var keygen = helper.keygen;
var metagen = helper.metagen;
var recgen = helper.recgen;
describe('set_xdr_filter tests', function () {
    var client = helper.client;
    context('set_xdr_filter tests', function () {
        var run_xdr = helper.skipUnlessXDR(this);
        var dc;
        var ns;
        before(function () {
            return __awaiter(this, void 0, void 0, function () {
                var dc_request, nodes, node_0, dc_response, ns_request, ns_response;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!run_xdr) return [3 /*break*/, 5];
                            dc_request = "get-config:context=xdr";
                            return [4 /*yield*/, client.getNodes()];
                        case 1:
                            nodes = _a.sent();
                            node_0 = nodes[0] // node_name in python
                            ;
                            return [4 /*yield*/, client.infoNode(dc_request, node_0)];
                        case 2:
                            dc_response = _a.sent();
                            dc = dc_response.split("=")[2].split(";")[0];
                            ns_request = "get-config:context=xdr;dc=".concat(dc);
                            return [4 /*yield*/, client.infoNode(ns_request, node_0)];
                        case 3:
                            ns_response = _a.sent();
                            ns = ns_response.split("namespaces=")[1];
                            return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 1000); })];
                        case 4:
                            _a.sent();
                            _a.label = 5;
                        case 5: return [2 /*return*/];
                    }
                });
            });
        });
        it('Add a simple XDR filter', function () {
            return __awaiter(this, void 0, void 0, function () {
                var response;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, client.setXDRFilter(aerospike_1.exp.eq(aerospike_1.exp.binInt("bin1"), aerospike_1.exp.int(6)), 'dc2', 'test', undefined)];
                        case 1:
                            response = _a.sent();
                            (0, chai_1.expect)(response.trim()).to.eql(("xdr-set-filter:dc=dc2;namespace=test;exp=kwGTUQKkYmluMQY=\tok\n").trim());
                            return [2 /*return*/];
                    }
                });
            });
        });
        it('Set XDR filter with large expression', function () {
            return __awaiter(this, void 0, void 0, function () {
                var bin1, exp_eq1, exp_eq2, exp_eq3, exp_eq4, exp_eq5, expr, response;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            bin1 = aerospike_1.exp.binList("bin1");
                            exp_eq1 = aerospike_1.exp.eq(aerospike_1.exp.lists.getByRelRankRange(bin1, aerospike_1.exp.int(1), aerospike_1.exp.int(3), aerospike_1.exp.lists.getByIndex(bin1, aerospike_1.exp.int(0), aerospike_1.exp.type.INT, aerospike_1.lists.returnType.VALUE), aerospike_1.lists.returnType.COUNT), aerospike_1.exp.int(2));
                            exp_eq2 = aerospike_1.exp.eq(aerospike_1.exp.lists.getByValue(aerospike_1.exp.lists.getByValueRange(bin1, aerospike_1.exp.int(1), aerospike_1.exp.int(7), aerospike_1.lists.returnType.VALUE), aerospike_1.exp.int(6), aerospike_1.lists.returnType.VALUE), aerospike_1.exp.list([2]));
                            exp_eq3 = aerospike_1.exp.eq(aerospike_1.exp.lists.getByValueList(aerospike_1.exp.lists.getByRelRankRangeToEnd(bin1, aerospike_1.exp.int(1), aerospike_1.exp.int(1), aerospike_1.lists.returnType.VALUE), aerospike_1.exp.list([2, 6]), aerospike_1.lists.returnType.COUNT), aerospike_1.exp.int(2));
                            exp_eq4 = aerospike_1.exp.eq(aerospike_1.exp.lists.getByIndexRangeToEnd(aerospike_1.exp.lists.getByIndexRange(bin1, aerospike_1.exp.int(1), aerospike_1.exp.int(3), aerospike_1.lists.returnType.VALUE), aerospike_1.exp.int(1), aerospike_1.lists.returnType.COUNT), aerospike_1.exp.int(1));
                            exp_eq5 = aerospike_1.exp.eq(aerospike_1.exp.lists.getByRank(aerospike_1.exp.lists.getByRankRange(bin1, aerospike_1.exp.int(0), aerospike_1.exp.int(1), aerospike_1.lists.returnType.VALUE), aerospike_1.exp.int(1), aerospike_1.exp.type.INT, aerospike_1.lists.returnType.RANK), aerospike_1.exp.int(1));
                            expr = aerospike_1.exp.and(exp_eq1, exp_eq2, exp_eq3, exp_eq4, exp_eq5);
                            return [4 /*yield*/, client.setXDRFilter(expr, 'dc2', 'test')];
                        case 1:
                            response = _a.sent();
                            (0, chai_1.expect)(response.trim()).to.eql(("xdr-set-filter:dc=dc2;namespace=test;exp=lhCTAZV/AgCVGwUBA5V/AgCTEwcAk1EEpGJpbjGTUQSkYmluMQKTAZV/BACTFgcGlX8EAJQZBwEHk1EEpGJpbjGSfpECkwGVfwIAkxcFkn6SAgaVfwQAlBsHAQGTUQSkYmluMQKTAZV/AgCTGAUBlX8EAJQYBwEDk1EEpGJpbjEBkwGVfwIAkxUDAZV/BACUGgcAAZNRBKRiaW4xAQ==\tok").trim());
                            return [2 /*return*/];
                    }
                });
            });
        });
        it('Set XDR filter with null', function () {
            return __awaiter(this, void 0, void 0, function () {
                var response;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, client.setXDRFilter(null, 'dc2', 'test')];
                        case 1:
                            response = _a.sent();
                            (0, chai_1.expect)(response.trim()).to.eql(("xdr-set-filter:dc=dc2;namespace=test;exp=null\tok").trim());
                            return [2 /*return*/];
                    }
                });
            });
        });
        it('Set XDR filter with invalid expressions', function () {
            return __awaiter(this, void 0, void 0, function () {
                var response, error_1;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, client.setXDRFilter(5, 'dc2', 'test')];
                        case 1:
                            response = _a.sent();
                            chai_1.assert.fail("An error should have been caught!");
                            return [3 /*break*/, 3];
                        case 2:
                            error_1 = _a.sent();
                            (0, chai_1.expect)(error_1.message).to.eql("Expression must be an array");
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            });
        });
    });
});
