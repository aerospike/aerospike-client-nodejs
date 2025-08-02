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
var aerospike_1 = require("aerospike");
var chai_1 = require("chai");
var helper = require("./test_helper");
var exp = aerospike_1.default.exp;
var op = aerospike_1.default.operations;
var lists = aerospike_1.default.lists;
var Context = aerospike_1.default.cdt.Context;
var keygen = helper.keygen;
var tempBin = 'ExpVar';
var FILTERED_OUT = aerospike_1.default.status.FILTERED_OUT;
describe('Aerospike.exp_operations', function () {
    helper.skipUnlessVersion('>= 5.0.0', this);
    var client = helper.client;
    function createRecord(bins_1) {
        return __awaiter(this, arguments, void 0, function (bins, meta) {
            var key;
            if (meta === void 0) { meta = null; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        key = keygen.string(helper.namespace, helper.set, { prefix: 'test/exp' })();
                        return [4 /*yield*/, client.put(key, bins, meta)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, key];
                }
            });
        });
    }
    function testNoMatch(key, filterExpression) {
        return __awaiter(this, void 0, void 0, function () {
            var rejectPolicy, operationSuccessful, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        rejectPolicy = { filterExpression: filterExpression };
                        operationSuccessful = false;
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, client.remove(key, rejectPolicy)];
                    case 2:
                        _a.sent();
                        operationSuccessful = true;
                        return [3 /*break*/, 4];
                    case 3:
                        error_1 = _a.sent();
                        (0, chai_1.expect)(error_1.code).to.eq(FILTERED_OUT, "Received unexpected error code with message \"".concat(error_1.message, "\""));
                        return [3 /*break*/, 4];
                    case 4:
                        if (operationSuccessful) {
                            chai_1.expect.fail('Test no-match: Operation should have not have been executed due to failed expression match');
                        }
                        return [2 /*return*/];
                }
            });
        });
    }
    function testMatch(key, filterExpression) {
        return __awaiter(this, void 0, void 0, function () {
            var passPolicy;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        passPolicy = { filterExpression: filterExpression };
                        return [4 /*yield*/, client.remove(key, passPolicy)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    }
    it('builds up a filter expression value', function () {
        var filter = exp.eq(exp.binInt('intVal'), exp.int(42));
        (0, chai_1.expect)(filter).to.be.an('array');
    });
    describe('list expressions', function () {
        describe('list size', function () {
            it('matches the size of a list value', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: ['blue', 'green', 'yellow'] })];
                            case 1:
                                key = _a.sent();
                                return [4 /*yield*/, testNoMatch(key, exp.eq(exp.lists.size(exp.binList('tags')), exp.int(5)))];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, testMatch(key, exp.eq(exp.lists.size(exp.binList('tags')), exp.int(3)))];
                            case 3:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
        describe('list size with context', function () {
            it('matches the size of a list value within a nested context', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, context;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: ['blue', 'green', ['orange', 'pink', 'white', 'black']] })];
                            case 1:
                                key = _a.sent();
                                context = new Context().addListIndex(2);
                                return [4 /*yield*/, testNoMatch(key, exp.eq(exp.lists.size(exp.binList('tags'), context), exp.int(5)))];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, testMatch(key, exp.eq(exp.lists.size(exp.binList('tags'), context), exp.int(4)))];
                            case 3:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
        describe('clear', function () {
            it('removes all items in a map', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, ops, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: ['blue', 'green', 'yellow'] })];
                            case 1:
                                key = _a.sent();
                                ops = [
                                    exp.operations.write('tags', exp.lists.clear(exp.binList('tags')), 0),
                                    op.read('tags')
                                ];
                                return [4 /*yield*/, client.operate(key, ops, {})];
                            case 2:
                                result = _a.sent();
                                (0, chai_1.expect)(result.bins).to.eql({ tags: [] });
                                return [2 /*return*/];
                        }
                    });
                });
            });
            it('selects item identified by index inside nested map', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, context, ops, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: ['blue', 'green', ['orange', 'pink', 'white', 'black']] })];
                            case 1:
                                key = _a.sent();
                                context = new Context().addListIndex(2);
                                ops = [
                                    exp.operations.write('tags', exp.lists.clear(exp.binList('tags'), context), 0),
                                    op.read('tags')
                                ];
                                return [4 /*yield*/, client.operate(key, ops, {})];
                            case 2:
                                result = _a.sent();
                                (0, chai_1.expect)(result.bins).to.eql({ tags: ['blue', 'green', []] });
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
        describe('removeByValue', function () {
            it('removes list item by value', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, ops, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: ['blue', 'green', 'yellow'] })];
                            case 1:
                                key = _a.sent();
                                ops = [
                                    exp.operations.write('tags', exp.lists.removeByValue(exp.binList('tags'), exp.str('green')), 0),
                                    op.read('tags')
                                ];
                                return [4 /*yield*/, client.operate(key, ops, {})];
                            case 2:
                                result = _a.sent();
                                (0, chai_1.expect)(result.bins).to.eql({ tags: ['blue', 'yellow'] });
                                return [2 /*return*/];
                        }
                    });
                });
            });
            it('removes list item by value in a cdt context', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, context, ops, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: ['blue', 'green', ['orange', 'pink', 'white', 'black']] })];
                            case 1:
                                key = _a.sent();
                                context = new Context().addListIndex(2);
                                ops = [
                                    exp.operations.write('tags', exp.lists.removeByValue(exp.binList('tags'), exp.str('white'), context), 0),
                                    op.read('tags')
                                ];
                                return [4 /*yield*/, client.operate(key, ops, {})];
                            case 2:
                                result = _a.sent();
                                (0, chai_1.expect)(result.bins).to.eql({ tags: ['blue', 'green', ['orange', 'pink', 'black']] });
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
        describe('removeByValueList', function () {
            it('removes list item by value list', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, ops, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: ['blue', 'green', 'yellow'] })];
                            case 1:
                                key = _a.sent();
                                ops = [
                                    exp.operations.write('tags', exp.lists.removeByValueList(exp.binList('tags'), exp.list(['green', 'yellow'])), 0),
                                    op.read('tags')
                                ];
                                return [4 /*yield*/, client.operate(key, ops, {})];
                            case 2:
                                result = _a.sent();
                                (0, chai_1.expect)(result.bins).to.eql({ tags: ['blue'] });
                                return [2 /*return*/];
                        }
                    });
                });
            });
            it('removes list item by value list in a cdt context', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, context, ops, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: ['blue', 'green', ['orange', 'pink', 'white', 'black']] })];
                            case 1:
                                key = _a.sent();
                                context = new Context().addListIndex(2);
                                ops = [
                                    exp.operations.write('tags', exp.lists.removeByValueList(exp.binList('tags'), exp.list(['orange', 'white']), context), 0),
                                    op.read('tags')
                                ];
                                return [4 /*yield*/, client.operate(key, ops, {})];
                            case 2:
                                result = _a.sent();
                                (0, chai_1.expect)(result.bins).to.eql({ tags: ['blue', 'green', ['pink', 'black']] });
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
        describe('removeByValueRange', function () {
            it('removes list item by value range', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, ops, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: ['blue', 'green', 'yellow'] })];
                            case 1:
                                key = _a.sent();
                                ops = [
                                    exp.operations.write('tags', exp.lists.removeByValueRange(exp.binList('tags'), exp.str('green'), exp.str('blue')), 0),
                                    op.read('tags')
                                ];
                                return [4 /*yield*/, client.operate(key, ops, {})];
                            case 2:
                                result = _a.sent();
                                (0, chai_1.expect)(result.bins).to.eql({ tags: ['green', 'yellow'] });
                                return [2 /*return*/];
                        }
                    });
                });
            });
            it('removes list item by value range in a cdt context', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, context, ops, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: ['blue', 'green', ['orange', 'pink', 'white', 'black']] })];
                            case 1:
                                key = _a.sent();
                                context = new Context().addListIndex(2);
                                ops = [
                                    exp.operations.write('tags', exp.lists.removeByValueRange(exp.binList('tags'), exp.str('pink'), exp.str('black'), context), 0),
                                    op.read('tags')
                                ];
                                return [4 /*yield*/, client.operate(key, ops, {})];
                            case 2:
                                result = _a.sent();
                                (0, chai_1.expect)(result.bins).to.eql({ tags: ['blue', 'green', ['pink', 'white']] });
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
        describe('removeByRelRankRangeToEnd', function () {
            it('removes list item by value relative rank range to end', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, ops, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: ['blue', 'green', 'yellow'] })];
                            case 1:
                                key = _a.sent();
                                ops = [
                                    exp.operations.write('tags', exp.lists.removeByRelRankRangeToEnd(exp.binList('tags'), exp.int(1), exp.str('blue')), 0),
                                    op.read('tags')
                                ];
                                return [4 /*yield*/, client.operate(key, ops, {})];
                            case 2:
                                result = _a.sent();
                                (0, chai_1.expect)(result.bins).to.eql({ tags: ['blue'] });
                                return [2 /*return*/];
                        }
                    });
                });
            });
            it('removes list item by value relative rank range to end in a cdt context', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, context, ops, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: ['blue', 'green', ['orange', 'pink', 'white', 'black']] })];
                            case 1:
                                key = _a.sent();
                                context = new Context().addListIndex(2);
                                ops = [
                                    exp.operations.write('tags', exp.lists.removeByRelRankRangeToEnd(exp.binList('tags'), exp.int(1), exp.str('orange'), context), 0),
                                    op.read('tags')
                                ];
                                return [4 /*yield*/, client.operate(key, ops, {})];
                            case 2:
                                result = _a.sent();
                                (0, chai_1.expect)(result.bins).to.eql({ tags: ['blue', 'green', ['orange', 'black']] });
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
        describe('removeByRelRankRange', function () {
            it('removes list item by value relative rank range', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, ops, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: ['blue', 'green', 'yellow'] })];
                            case 1:
                                key = _a.sent();
                                ops = [
                                    exp.operations.write('tags', exp.lists.removeByRelRankRange(exp.binList('tags'), exp.int(1), exp.int(-1), exp.str('green')), 0),
                                    op.read('tags')
                                ];
                                return [4 /*yield*/, client.operate(key, ops, {})];
                            case 2:
                                result = _a.sent();
                                (0, chai_1.expect)(result.bins).to.eql({ tags: ['green', 'yellow'] });
                                return [2 /*return*/];
                        }
                    });
                });
            });
            it('removes list item by value relative rank range in a cdt context', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, context, ops, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: ['blue', 'green', ['orange', 'pink', 'white', 'black']] })];
                            case 1:
                                key = _a.sent();
                                context = new Context().addListIndex(2);
                                ops = [
                                    exp.operations.write('tags', exp.lists.removeByRelRankRange(exp.binList('tags'), exp.int(1), exp.int(-1), exp.str('pink'), context), 0),
                                    op.read('tags')
                                ];
                                return [4 /*yield*/, client.operate(key, ops, {})];
                            case 2:
                                result = _a.sent();
                                (0, chai_1.expect)(result.bins).to.eql({ tags: ['blue', 'green', ['pink', 'white', 'black']] });
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
        describe('removeByIndex', function () {
            it('removes a list item by index', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, ops, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: ['blue', 'green', 'yellow'] })];
                            case 1:
                                key = _a.sent();
                                ops = [
                                    exp.operations.write('tags', exp.lists.removeByIndex(exp.binList('tags'), exp.int(1)), 0),
                                    op.read('tags')
                                ];
                                return [4 /*yield*/, client.operate(key, ops, {})];
                            case 2:
                                result = _a.sent();
                                (0, chai_1.expect)(result.bins).to.eql({ tags: ['blue', 'yellow'] });
                                return [2 /*return*/];
                        }
                    });
                });
            });
            it('removes a list item by index in a cdt context in a cdt context', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, context, ops, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: ['blue', 'green', ['orange', 'pink', 'white', 'black']] })];
                            case 1:
                                key = _a.sent();
                                context = new Context().addListIndex(2);
                                ops = [
                                    exp.operations.write('tags', exp.lists.removeByIndex(exp.binList('tags'), exp.int(1), context), 0),
                                    op.read('tags')
                                ];
                                return [4 /*yield*/, client.operate(key, ops, {})];
                            case 2:
                                result = _a.sent();
                                (0, chai_1.expect)(result.bins).to.eql({ tags: ['blue', 'green', ['orange', 'white', 'black']] });
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
        describe('removeByIndexRangeToEnd', function () {
            it('removes a list item by index range to end', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, ops, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: ['blue', 'green', 'yellow'] })];
                            case 1:
                                key = _a.sent();
                                ops = [
                                    exp.operations.write('tags', exp.lists.removeByIndexRangeToEnd(exp.binList('tags'), exp.int(1)), 0),
                                    op.read('tags')
                                ];
                                return [4 /*yield*/, client.operate(key, ops, {})];
                            case 2:
                                result = _a.sent();
                                (0, chai_1.expect)(result.bins).to.eql({ tags: ['blue'] });
                                return [2 /*return*/];
                        }
                    });
                });
            });
            it('removes a list item by index range to end in a cdt context in a cdt context', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, context, ops, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: ['blue', 'green', ['orange', 'pink', 'white', 'black']] })];
                            case 1:
                                key = _a.sent();
                                context = new Context().addListIndex(2);
                                ops = [
                                    exp.operations.write('tags', exp.lists.removeByIndexRangeToEnd(exp.binList('tags'), exp.int(1), context), 0),
                                    op.read('tags')
                                ];
                                return [4 /*yield*/, client.operate(key, ops, {})];
                            case 2:
                                result = _a.sent();
                                (0, chai_1.expect)(result.bins).to.eql({ tags: ['blue', 'green', ['orange']] });
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
        describe('removeByIndexRange', function () {
            it('removes a list item by index range', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, ops, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: ['blue', 'green', 'yellow'] })];
                            case 1:
                                key = _a.sent();
                                ops = [
                                    exp.operations.write('tags', exp.lists.removeByIndexRange(exp.binList('tags'), exp.int(2), exp.int(0)), 0),
                                    op.read('tags')
                                ];
                                return [4 /*yield*/, client.operate(key, ops, {})];
                            case 2:
                                result = _a.sent();
                                (0, chai_1.expect)(result.bins).to.eql({ tags: ['yellow'] });
                                return [2 /*return*/];
                        }
                    });
                });
            });
            it('removes a list item by index range in a cdt context', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, context, ops, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: ['blue', 'green', ['orange', 'pink', 'white', 'black']] })];
                            case 1:
                                key = _a.sent();
                                context = new Context().addListIndex(2);
                                ops = [
                                    exp.operations.write('tags', exp.lists.removeByIndexRange(exp.binList('tags'), exp.int(2), exp.int(0), context), 0),
                                    op.read('tags')
                                ];
                                return [4 /*yield*/, client.operate(key, ops, {})];
                            case 2:
                                result = _a.sent();
                                (0, chai_1.expect)(result.bins).to.eql({ tags: ['blue', 'green', ['white', 'black']] });
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
        describe('removeByRank', function () {
            it('removes a list item by rank', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, ops, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: ['yellow', 'green', 'blue'] })];
                            case 1:
                                key = _a.sent();
                                ops = [
                                    exp.operations.write('tags', exp.lists.removeByRank(exp.binList('tags'), exp.int(2)), 0),
                                    op.read('tags')
                                ];
                                return [4 /*yield*/, client.operate(key, ops, {})];
                            case 2:
                                result = _a.sent();
                                (0, chai_1.expect)(result.bins).to.eql({ tags: ['green', 'blue'] });
                                return [2 /*return*/];
                        }
                    });
                });
            });
            it('removes a list item by rank in a cdt context', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, context, ops, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: ['blue', 'green', ['orange', 'pink', 'white', 'black']] })];
                            case 1:
                                key = _a.sent();
                                context = new Context().addListIndex(2);
                                ops = [
                                    exp.operations.write('tags', exp.lists.removeByRank(exp.binList('tags'), exp.int(2), context), 0),
                                    op.read('tags')
                                ];
                                return [4 /*yield*/, client.operate(key, ops, {})];
                            case 2:
                                result = _a.sent();
                                (0, chai_1.expect)(result.bins).to.eql({ tags: ['blue', 'green', ['orange', 'white', 'black']] });
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
        describe('removeByRankRangeToEnd', function () {
            it('removes a list item by rank range to end', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, ops, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: ['yellow', 'green', 'blue'] })];
                            case 1:
                                key = _a.sent();
                                ops = [
                                    exp.operations.write('tags', exp.lists.removeByRankRangeToEnd(exp.binList('tags'), exp.int(1)), 0),
                                    op.read('tags')
                                ];
                                return [4 /*yield*/, client.operate(key, ops, {})];
                            case 2:
                                result = _a.sent();
                                (0, chai_1.expect)(result.bins).to.eql({ tags: ['blue'] });
                                return [2 /*return*/];
                        }
                    });
                });
            });
            it('removes a list item by rank range to end in a cdt context', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, context, ops, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: ['blue', 'green', ['orange', 'pink', 'white', 'black']] })];
                            case 1:
                                key = _a.sent();
                                context = new Context().addListIndex(2);
                                ops = [
                                    exp.operations.write('tags', exp.lists.removeByRankRangeToEnd(exp.binList('tags'), exp.int(1), context), 0),
                                    op.read('tags')
                                ];
                                return [4 /*yield*/, client.operate(key, ops, {})];
                            case 2:
                                result = _a.sent();
                                (0, chai_1.expect)(result.bins).to.eql({ tags: ['blue', 'green', ['black']] });
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
        describe('removeByRankRange', function () {
            it('removes a list item by rank range', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, ops, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: ['yellow', 'green', 'blue'] })];
                            case 1:
                                key = _a.sent();
                                ops = [
                                    exp.operations.write('tags', exp.lists.removeByRankRange(exp.binList('tags'), exp.int(2), exp.int(0)), 0),
                                    op.read('tags')
                                ];
                                return [4 /*yield*/, client.operate(key, ops, {})];
                            case 2:
                                result = _a.sent();
                                (0, chai_1.expect)(result.bins).to.eql({ tags: ['yellow'] });
                                return [2 /*return*/];
                        }
                    });
                });
            });
            it('removes a list item by rank range in a cdt context', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, context, ops, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: ['blue', 'green', ['orange', 'pink', 'white', 'black']] })];
                            case 1:
                                key = _a.sent();
                                context = new Context().addListIndex(2);
                                ops = [
                                    exp.operations.write('tags', exp.lists.removeByRankRange(exp.binList('tags'), exp.int(2), exp.int(0), context), 0),
                                    op.read('tags')
                                ];
                                return [4 /*yield*/, client.operate(key, ops, {})];
                            case 2:
                                result = _a.sent();
                                (0, chai_1.expect)(result.bins).to.eql({ tags: ['blue', 'green', ['pink', 'white']] });
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
        describe('getByValue', function () {
            it('matches the count of the matched list values', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: ['blue', 'green', 'yellow', 'green'] })];
                            case 1:
                                key = _a.sent();
                                return [4 /*yield*/, testNoMatch(key, exp.eq(exp.lists.getByValue(exp.binList('tags'), exp.str('green'), lists.returnType.COUNT), exp.int(1)))];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, testMatch(key, exp.eq(exp.lists.getByValue(exp.binList('tags'), exp.str('green'), lists.returnType.COUNT), exp.int(2)))];
                            case 3:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
        describe('getByValue with context', function () {
            it('matches the count of the matched list values', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, context;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: ['blue', 'green', 'yellow', 'green', ['orange', 'pink', 'white', 'black', 'pink']] })];
                            case 1:
                                key = _a.sent();
                                context = new Context().addListIndex(4);
                                return [4 /*yield*/, testNoMatch(key, exp.eq(exp.lists.getByValue(exp.binList('tags'), exp.str('pink'), lists.returnType.COUNT, context), exp.int(1)))];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, testMatch(key, exp.eq(exp.lists.getByValue(exp.binList('tags'), exp.str('pink'), lists.returnType.COUNT, context), exp.int(2)))];
                            case 3:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
        describe('getByValueRange', function () {
            it('matches the count of the matched range of list values', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ values: [53, 16, 94, 38, 25, 88, 48] })];
                            case 1:
                                key = _a.sent();
                                return [4 /*yield*/, testNoMatch(key, exp.eq(exp.lists.getByValueRange(exp.binList('values'), exp.int(25), exp.int(50), lists.returnType.COUNT), exp.int(1)))];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, testMatch(key, exp.eq(exp.lists.getByValueRange(exp.binList('values'), exp.int(25), exp.int(50), lists.returnType.COUNT), exp.int(3)))];
                            case 3:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
        describe('getByValueRange with context', function () {
            it('matches the count of the matched range of list values', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, context;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ values: [53, 16, 94, 38, 25, 88, 48, [1, 92, 94, 96]] })];
                            case 1:
                                key = _a.sent();
                                context = new Context().addListIndex(7);
                                return [4 /*yield*/, testNoMatch(key, exp.eq(exp.lists.getByValueRange(exp.binList('values'), exp.int(90), exp.int(99), lists.returnType.COUNT, context), exp.int(1)))];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, testMatch(key, exp.eq(exp.lists.getByValueRange(exp.binList('values'), exp.int(90), exp.int(99), lists.returnType.COUNT, context), exp.int(3)))];
                            case 3:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
        describe('getByValueList', function () {
            it('matches the count of the matched values', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ values: [53, 16, 94, 38, 25, 88, 88, 48, 16] })];
                            case 1:
                                key = _a.sent();
                                return [4 /*yield*/, testNoMatch(key, exp.eq(exp.lists.getByValueList(exp.binList('values'), exp.list([88, 94]), lists.returnType.COUNT), exp.int(2)))];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, testMatch(key, exp.eq(exp.lists.getByValueList(exp.binList('values'), exp.list([88, 94]), lists.returnType.COUNT), exp.int(3)))];
                            case 3:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
        describe('getByValueList with context', function () {
            it('matches the count of the matched values', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, context;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ values: [53, 16, 94, 38, 25, 88, 88, 48, 16, [0, 1, 2, 73, 74, 73, 74]] })];
                            case 1:
                                key = _a.sent();
                                context = new Context().addListIndex(9);
                                return [4 /*yield*/, testNoMatch(key, exp.eq(exp.lists.getByValueList(exp.binList('values'), exp.list([73, 74]), lists.returnType.COUNT, context), exp.int(2)))];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, testMatch(key, exp.eq(exp.lists.getByValueList(exp.binList('values'), exp.list([73, 74]), lists.returnType.COUNT, context), exp.int(4)))];
                            case 3:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
        describe('getByRelRankRangeToEnd', function () {
            it('selects list items nearest to value and greater by relative rank', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ values: [53, 16, 94, 38, 25, 88, 88, 48, 16] })];
                            case 1:
                                key = _a.sent();
                                return [4 /*yield*/, testNoMatch(key, exp.eq(exp.lists.getByRelRankRangeToEnd(exp.binList('values'), exp.int(38), exp.int(1), lists.returnType.VALUE), exp.list([38, 48, 53, 88, 88, 94])))];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, testMatch(key, exp.eq(exp.lists.getByRelRankRangeToEnd(exp.binList('values'), exp.int(38), exp.int(1), lists.returnType.VALUE), exp.list([48, 53, 88, 88, 94])))];
                            case 3:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
        describe('getByRelRankRangeToEnd with context', function () {
            it('selects list items nearest to value and greater by relative rank', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, context;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ values: [53, 16, [2, 12, 14, 17]] })];
                            case 1:
                                key = _a.sent();
                                context = new Context().addListIndex(2);
                                return [4 /*yield*/, testNoMatch(key, exp.eq(exp.lists.getByRelRankRangeToEnd(exp.binList('values'), exp.int(12), exp.int(1), lists.returnType.VALUE, context), exp.list([16, 53])))];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, testMatch(key, exp.eq(exp.lists.getByRelRankRangeToEnd(exp.binList('values'), exp.int(12), exp.int(1), lists.returnType.VALUE, context), exp.list([14, 17])))];
                            case 3:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
        describe('getByRelRankRange', function () {
            it('selects list items nearest to value and greater by relative rank with a count limit', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ values: [53, 16, 94, 38, 25, 88, 88, 48, 16] })];
                            case 1:
                                key = _a.sent();
                                return [4 /*yield*/, testNoMatch(key, exp.eq(exp.lists.getByRelRankRange(exp.binList('values'), exp.int(38), exp.int(1), exp.int(3), lists.returnType.VALUE), exp.list([38, 48, 53])))];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, testMatch(key, exp.eq(exp.lists.getByRelRankRange(exp.binList('values'), exp.int(38), exp.int(1), exp.int(3), lists.returnType.VALUE), exp.list([48, 53, 88])))];
                            case 3:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
        describe('getByRelRankRange with context', function () {
            it('selects list items nearest to value and greater by relative rank with a count limit', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, context;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ values: [53, 16, 94, [30, 40, 45, 20]] })];
                            case 1:
                                key = _a.sent();
                                context = new Context().addListIndex(3);
                                return [4 /*yield*/, testNoMatch(key, exp.eq(exp.lists.getByRelRankRange(exp.binList('values'), exp.int(30), exp.int(1), exp.int(3), lists.returnType.VALUE, context), exp.list([94])))];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, testMatch(key, exp.eq(exp.lists.getByRelRankRange(exp.binList('values'), exp.int(30), exp.int(1), exp.int(3), lists.returnType.VALUE, context), exp.list([40, 45])))];
                            case 3:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
        describe('getByIndex', function () {
            it('selects item identified by index', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ values: ['Singapore', 'Hamburg', 'San Francisco', 'Tokyo'] })];
                            case 1:
                                key = _a.sent();
                                return [4 /*yield*/, testNoMatch(key, exp.eq(exp.lists.getByIndex(exp.binList('values'), exp.int(2), exp.type.STR, lists.returnType.VALUE), exp.str('Hamburg')))];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, testMatch(key, exp.eq(exp.lists.getByIndex(exp.binList('values'), exp.int(2), exp.type.STR, lists.returnType.VALUE), exp.str('San Francisco')))];
                            case 3:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
        describe('getByIndex with context', function () {
            it('selects item identified by index within nested context', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, context;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ values: ['Singapore', 'Hamburg', 'San Francisco', 'Tokyo', ['Firth', 'Hickman', 'Palmyra']] })];
                            case 1:
                                key = _a.sent();
                                context = new Context().addListIndex(4);
                                return [4 /*yield*/, testNoMatch(key, exp.eq(exp.lists.getByIndex(exp.binList('values'), exp.int(2), exp.type.STR, lists.returnType.VALUE, context), exp.str('San Francisco')))];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, testMatch(key, exp.eq(exp.lists.getByIndex(exp.binList('values'), exp.int(2), exp.type.STR, lists.returnType.VALUE, context), exp.str('Palmyra')))];
                            case 3:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
        describe('getByIndexRangeToEnd', function () {
            it('selects list items starting at specified index to the end of the list', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ values: ['Singapore', 'Hamburg', 'San Francisco', 'Tokyo'] })];
                            case 1:
                                key = _a.sent();
                                return [4 /*yield*/, testNoMatch(key, exp.eq(exp.lists.getByIndexRangeToEnd(exp.binList('values'), exp.int(2), lists.returnType.VALUE), exp.list(['Hamburg', 'San Francisco'])))];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, testMatch(key, exp.eq(exp.lists.getByIndexRangeToEnd(exp.binList('values'), exp.int(2), lists.returnType.VALUE), exp.list(['San Francisco', 'Tokyo'])))];
                            case 3:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
        describe('getByIndexRangeToEnd with context', function () {
            it('selects list items starting at specified index to the end of the list', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, context;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ values: ['Singapore', 'Hamburg', 'San Francisco', 'Tokyo', ['Firth', 'Hickman', 'Palmyra']] })];
                            case 1:
                                key = _a.sent();
                                context = new Context().addListIndex(4);
                                return [4 /*yield*/, testNoMatch(key, exp.eq(exp.lists.getByIndexRangeToEnd(exp.binList('values'), exp.int(1), lists.returnType.VALUE, context), exp.list(['Hamburg', 'San Francisco', 'Tokyo'])))];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, testMatch(key, exp.eq(exp.lists.getByIndexRangeToEnd(exp.binList('values'), exp.int(1), lists.returnType.VALUE, context), exp.list(['Hickman', 'Palmyra'])))];
                            case 3:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
        describe('getByIndexRange', function () {
            it('selects "count" list items starting at specified index', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ values: ['Singapore', 'Hamburg', 'San Francisco', 'Tokyo'] })];
                            case 1:
                                key = _a.sent();
                                return [4 /*yield*/, testNoMatch(key, exp.eq(exp.lists.getByIndexRange(exp.binList('values'), exp.int(2), exp.int(1), lists.returnType.VALUE), exp.list(['Hamburg'])))];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, testMatch(key, exp.eq(exp.lists.getByIndexRange(exp.binList('values'), exp.int(2), exp.int(1), lists.returnType.VALUE), exp.list(['San Francisco'])))];
                            case 3:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
        describe('getByIndexRange with context', function () {
            it('selects "count" list items starting at specified index', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, context;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ values: ['Singapore', 'Hamburg', 'San Francisco', 'Tokyo', ['Firth', 'Hickman', 'Palmyra']] })];
                            case 1:
                                key = _a.sent();
                                context = new Context().addListIndex(4);
                                return [4 /*yield*/, testNoMatch(key, exp.eq(exp.lists.getByIndexRange(exp.binList('values'), exp.int(0), exp.int(2), lists.returnType.VALUE, context), exp.list(['Singapore', 'Hamburg'])))];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, testMatch(key, exp.eq(exp.lists.getByIndexRange(exp.binList('values'), exp.int(0), exp.int(2), lists.returnType.VALUE, context), exp.list(['Firth', 'Hickman'])))];
                            case 3:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
        describe('getByRank', function () {
            it('selects list item identified by rank', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ values: [83, 39, 49, 20, 42, 41, 98] })];
                            case 1:
                                key = _a.sent();
                                return [4 /*yield*/, testNoMatch(key, exp.eq(exp.lists.getByRank(exp.binList('values'), exp.int(2), exp.type.INT, lists.returnType.VALUE), exp.int(42)))];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, testMatch(key, exp.eq(exp.lists.getByRank(exp.binList('values'), exp.int(2), exp.type.INT, lists.returnType.VALUE), exp.int(41)))];
                            case 3:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
        describe('getByRank with context', function () {
            it('selects list item identified by rank', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, context;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ values: [83, [0, 4, 2, 8], 40] })];
                            case 1:
                                key = _a.sent();
                                context = new Context().addListIndex(1);
                                return [4 /*yield*/, testNoMatch(key, exp.eq(exp.lists.getByRank(exp.binList('values'), exp.int(2), exp.type.INT, lists.returnType.VALUE, context), exp.int(40)))];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, testMatch(key, exp.eq(exp.lists.getByRank(exp.binList('values'), exp.int(2), exp.type.INT, lists.returnType.VALUE, context), exp.int(4)))];
                            case 3:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
        describe('getByRankRangeToEnd', function () {
            it('selects list items starting at specified rank to the last ranked item', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ values: [83, 39, 49, 20, 42, 41, 98] })];
                            case 1:
                                key = _a.sent();
                                return [4 /*yield*/, testNoMatch(key, exp.eq(exp.lists.getByRankRangeToEnd(exp.binList('values'), exp.int(2), lists.returnType.VALUE), exp.list([39, 41, 42, 49, 83, 98])))];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, testMatch(key, exp.eq(exp.lists.getByRankRangeToEnd(exp.binList('values'), exp.int(2), lists.returnType.VALUE), exp.list([41, 42, 49, 83, 98])))];
                            case 3:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
        describe('getByRankRangeToEnd with context', function () {
            it('selects list items starting at specified rank to the last ranked item', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, context;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ values: [83, [0, 4, 2, 8]] })];
                            case 1:
                                key = _a.sent();
                                context = new Context().addListIndex(1);
                                return [4 /*yield*/, testNoMatch(key, exp.eq(exp.lists.getByRankRangeToEnd(exp.binList('values'), exp.int(1), lists.returnType.VALUE, context), exp.list([0, 2, 4, 8])))];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, testMatch(key, exp.eq(exp.lists.getByRankRangeToEnd(exp.binList('values'), exp.int(1), lists.returnType.VALUE, context), exp.list([2, 4, 8])))];
                            case 3:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
        describe('getByRankRange', function () {
            it('selects "count" list items starting at specified rank', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ values: [83, 39, 49, 20, 42, 41, 98] })];
                            case 1:
                                key = _a.sent();
                                return [4 /*yield*/, testNoMatch(key, exp.eq(exp.lists.getByRankRange(exp.binList('values'), exp.int(2), exp.int(2), lists.returnType.VALUE), exp.list([39, 41, 42])))];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, testMatch(key, exp.eq(exp.lists.getByRankRange(exp.binList('values'), exp.int(2), exp.int(2), lists.returnType.VALUE), exp.list([42, 41])))];
                            case 3:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
        describe('getByRankRange with context', function () {
            it('selects "count" list items starting at specified rank', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, context;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ values: [83, [0, 4, 2, 8]] })];
                            case 1:
                                key = _a.sent();
                                context = new Context().addListIndex(1);
                                return [4 /*yield*/, testNoMatch(key, exp.eq(exp.lists.getByRankRange(exp.binList('values'), exp.int(1), exp.int(4), lists.returnType.VALUE, context), exp.list([83, [0, 4, 2, 8]])))];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, testMatch(key, exp.eq(exp.lists.getByRankRange(exp.binList('values'), exp.int(1), exp.int(4), lists.returnType.VALUE, context), exp.list([2, 4, 8])))];
                            case 3:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
        describe('list bin append expression', function () {
            it('appends integer value to list', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, ops, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ list: [2, 3, 4, 5], intVal: 6 })];
                            case 1:
                                key = _a.sent();
                                ops = [
                                    exp.operations.read(tempBin, exp.lists.append(exp.binList('list'), exp.binInt('intVal')), 0),
                                    op.read('list')
                                ];
                                return [4 /*yield*/, client.operate(key, ops, {})];
                            case 2:
                                result = _a.sent();
                                (0, chai_1.expect)(result.bins.list).to.eql([2, 3, 4, 5]);
                                (0, chai_1.expect)(result.bins.ExpVar).to.eql([2, 3, 4, 5, 6]);
                                return [2 /*return*/];
                        }
                    });
                });
            });
            it('appends integer value to a list within a nested context', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, context, ops, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ list: [2, 3, 4, 5, [4]], intVal: 6 })];
                            case 1:
                                key = _a.sent();
                                context = new Context().addListIndex(4);
                                ops = [
                                    exp.operations.read(tempBin, exp.lists.append(exp.binList('list'), exp.binInt('intVal'), null, context), 0),
                                    op.read('list')
                                ];
                                return [4 /*yield*/, client.operate(key, ops, {})];
                            case 2:
                                result = _a.sent();
                                (0, chai_1.expect)(result.bins.list).to.eql([2, 3, 4, 5, [4]]);
                                (0, chai_1.expect)(result.bins.ExpVar).to.eql([2, 3, 4, 5, [4, 6]]);
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
        describe('list bin appendItems expression', function () {
            it('appends list to itself', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, ops, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ list: [2, 3, 4, 5] })];
                            case 1:
                                key = _a.sent();
                                ops = [
                                    exp.operations.read(tempBin, exp.lists.appendItems(exp.binList('list'), exp.binList('list')), 0),
                                    op.read('list')
                                ];
                                return [4 /*yield*/, client.operate(key, ops, {})];
                            case 2:
                                result = _a.sent();
                                (0, chai_1.expect)(result.bins.list).to.eql([2, 3, 4, 5]);
                                (0, chai_1.expect)(result.bins.ExpVar).to.eql([2, 3, 4, 5, 2, 3, 4, 5]);
                                return [2 /*return*/];
                        }
                    });
                });
            });
            it('appends list to a list within a nested context', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, context, ops, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ list: [2, 3, 4, 5, [80, 90, 100]] })];
                            case 1:
                                key = _a.sent();
                                context = new Context().addListIndex(4);
                                ops = [
                                    exp.operations.read(tempBin, exp.lists.appendItems(exp.binList('list'), exp.binList('list'), null, context), 0),
                                    op.read('list')
                                ];
                                return [4 /*yield*/, client.operate(key, ops, {})];
                            case 2:
                                result = _a.sent();
                                (0, chai_1.expect)(result.bins.list).to.eql([2, 3, 4, 5, [80, 90, 100]]);
                                (0, chai_1.expect)(result.bins.ExpVar).to.eql([2, 3, 4, 5, [80, 90, 100, 2, 3, 4, 5, [80, 90, 100]]]);
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
    });
    describe('list bin insert expression', function () {
        it('inserts value at specified index', function () {
            return __awaiter(this, void 0, void 0, function () {
                var key, ops, result;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, createRecord({ list: [2, 3, 4, 5], intVal: 6 })];
                        case 1:
                            key = _a.sent();
                            ops = [
                                exp.operations.read(tempBin, exp.lists.insert(exp.binList('list'), exp.binInt('intVal'), exp.int(2)), 0),
                                op.read('list')
                            ];
                            return [4 /*yield*/, client.operate(key, ops, {})];
                        case 2:
                            result = _a.sent();
                            (0, chai_1.expect)(result.bins.list).to.eql([2, 3, 4, 5]);
                            (0, chai_1.expect)(result.bins.ExpVar).to.eql([2, 3, 6, 4, 5]);
                            return [2 /*return*/];
                    }
                });
            });
        });
        it('inserts value at specified index within a nested context', function () {
            return __awaiter(this, void 0, void 0, function () {
                var key, context, ops, result;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, createRecord({ list: [2, 3, 4, 5, [4, 1, 9]], intVal: 7 })];
                        case 1:
                            key = _a.sent();
                            context = new Context().addListIndex(4);
                            ops = [
                                exp.operations.read(tempBin, exp.lists.insert(exp.binList('list'), exp.binInt('intVal'), exp.int(2), null, context), 0),
                                op.read('list')
                            ];
                            return [4 /*yield*/, client.operate(key, ops, {})];
                        case 2:
                            result = _a.sent();
                            (0, chai_1.expect)(result.bins.list).to.eql([2, 3, 4, 5, [4, 1, 9]]);
                            (0, chai_1.expect)(result.bins.ExpVar).to.eql([2, 3, 4, 5, [4, 1, 7, 9]]);
                            return [2 /*return*/];
                    }
                });
            });
        });
    });
    describe('list bin insertItems expression', function () {
        it('inserts values at specified index', function () {
            return __awaiter(this, void 0, void 0, function () {
                var key, ops, result;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, createRecord({ list: [2, 3, 4, 5] })];
                        case 1:
                            key = _a.sent();
                            ops = [
                                exp.operations.read(tempBin, exp.lists.insertItems(exp.binList('list'), exp.binList('list'), exp.int(1)), 0),
                                op.read('list')
                            ];
                            return [4 /*yield*/, client.operate(key, ops, {})];
                        case 2:
                            result = _a.sent();
                            (0, chai_1.expect)(result.bins.list).to.eql([2, 3, 4, 5]);
                            (0, chai_1.expect)(result.bins.ExpVar).to.eql([2, 2, 3, 4, 5, 3, 4, 5]);
                            return [2 /*return*/];
                    }
                });
            });
        });
        it('inserts values at specified index within a nested context', function () {
            return __awaiter(this, void 0, void 0, function () {
                var key, context, ops, result;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, createRecord({ list: [2, 3, [9, 9]] })];
                        case 1:
                            key = _a.sent();
                            context = new Context().addListIndex(2);
                            ops = [
                                exp.operations.read(tempBin, exp.lists.insertItems(exp.binList('list'), exp.binList('list'), exp.int(1), null, context), 0),
                                op.read('list')
                            ];
                            return [4 /*yield*/, client.operate(key, ops, {})];
                        case 2:
                            result = _a.sent();
                            (0, chai_1.expect)(result.bins.list).to.eql([2, 3, [9, 9]]);
                            (0, chai_1.expect)(result.bins.ExpVar).to.eql([2, 3, [9, 2, 3, [9, 9], 9]]);
                            return [2 /*return*/];
                    }
                });
            });
        });
    });
    describe('list bin sort expression', function () {
        it('sorts specified list', function () {
            return __awaiter(this, void 0, void 0, function () {
                var key, ops, result;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, createRecord({ list: [2, 3, 4, 5] })];
                        case 1:
                            key = _a.sent();
                            ops = [
                                exp.operations.write('list', exp.lists.insertItems(exp.binList('list'), exp.binList('list'), exp.int(1)), 0),
                                exp.operations.read(tempBin, exp.lists.sort(exp.binList('list'), 1), 0),
                                op.read('list')
                            ];
                            return [4 /*yield*/, client.operate(key, ops, {})];
                        case 2:
                            result = _a.sent();
                            (0, chai_1.expect)(result.bins.ExpVar).to.eql([5, 5, 4, 4, 3, 3, 2, 2]);
                            (0, chai_1.expect)(result.bins.list).to.eql([2, 2, 3, 4, 5, 3, 4, 5]);
                            return [2 /*return*/];
                    }
                });
            });
        });
        it('sorts specified nested list', function () {
            return __awaiter(this, void 0, void 0, function () {
                var key, context, ops, result;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, createRecord({ list: [2, 3, 4, 5, [9, 100]] })];
                        case 1:
                            key = _a.sent();
                            context = new Context().addListIndex(4);
                            ops = [
                                exp.operations.read(tempBin, exp.lists.sort(exp.binList('list'), 1, context), 0),
                                op.read('list')
                            ];
                            return [4 /*yield*/, client.operate(key, ops, {})];
                        case 2:
                            result = _a.sent();
                            (0, chai_1.expect)(result.bins.ExpVar).to.eql([2, 3, 4, 5, [100, 9]]);
                            (0, chai_1.expect)(result.bins.list).to.eql([2, 3, 4, 5, [9, 100]]);
                            return [2 /*return*/];
                    }
                });
            });
        });
    });
});
