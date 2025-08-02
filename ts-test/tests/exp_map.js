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
var exp = aerospike_1.default.exp;
var maps = aerospike_1.default.maps;
var op = aerospike_1.default.operations;
var Context = aerospike_1.default.cdt.Context;
var helper = require("./test_helper");
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
    var orderMap = function (binName, order, key, ctx) {
        var policy = new aerospike_1.default.MapPolicy({ order: order });
        var setMapPolicy = maps.setPolicy(binName, policy);
        if (ctx)
            setMapPolicy.withContext(ctx);
        return client.operate(key, [setMapPolicy]);
    };
    var orderByKey = function (binName, key, ctx) { return orderMap(binName, maps.order.KEY_ORDERED, key, ctx); };
    it('builds up a filter expression value', function () {
        var filter = exp.eq(exp.binInt('intVal'), exp.int(42));
        (0, chai_1.expect)(filter).to.be.an('array');
    });
    describe('map expressions', function () {
        describe('clear', function () {
            it('removes all items in a map', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, ops, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow' } })];
                            case 1:
                                key = _a.sent();
                                ops = [
                                    exp.operations.write('tags', exp.maps.clear(exp.binMap('tags')), 0),
                                    op.read('tags')
                                ];
                                return [4 /*yield*/, client.operate(key, ops, {})];
                            case 2:
                                result = _a.sent();
                                (0, chai_1.expect)(result.bins).to.eql({ tags: {} });
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
                            case 0: return [4 /*yield*/, createRecord({ tags: { a: 'blue', nested: { d: 'orange', e: 'pink', f: 'white', g: 'black' } } })];
                            case 1:
                                key = _a.sent();
                                context = new Context().addMapKey('nested');
                                ops = [
                                    exp.operations.write('tags', exp.maps.clear(exp.binMap('tags'), context), 0),
                                    op.read('tags')
                                ];
                                return [4 /*yield*/, client.operate(key, ops, {})];
                            case 2:
                                result = _a.sent();
                                (0, chai_1.expect)(result.bins).to.eql({ tags: { a: 'blue', nested: {} } });
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
        describe('removeByKey', function () {
            it('removes map item by key', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, ops, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow' } })];
                            case 1:
                                key = _a.sent();
                                ops = [
                                    exp.operations.write('tags', exp.maps.removeByKey(exp.binMap('tags'), exp.str('a')), 0),
                                    op.read('tags')
                                ];
                                return [4 /*yield*/, client.operate(key, ops, {})];
                            case 2:
                                result = _a.sent();
                                (0, chai_1.expect)(result.bins).to.eql({ tags: { b: 'green', c: 'yellow' } });
                                return [2 /*return*/];
                        }
                    });
                });
            });
            it('removes map item by key in a cdt context', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, context, ops, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: { a: 'blue', nested: { d: 'orange', e: 'pink', f: 'white', g: 'black' } } })];
                            case 1:
                                key = _a.sent();
                                context = new Context().addMapKey('nested');
                                ops = [
                                    exp.operations.write('tags', exp.maps.removeByKey(exp.binMap('tags'), exp.str('e'), context), 0),
                                    op.read('tags')
                                ];
                                return [4 /*yield*/, client.operate(key, ops, {})];
                            case 2:
                                result = _a.sent();
                                (0, chai_1.expect)(result.bins).to.eql({ tags: { a: 'blue', nested: { d: 'orange', f: 'white', g: 'black' } } });
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
        describe('removeByKeyList', function () {
            it('removes map item by key list', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, ops, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow' } })];
                            case 1:
                                key = _a.sent();
                                ops = [
                                    exp.operations.write('tags', exp.maps.removeByKeyList(exp.binMap('tags'), exp.list(['a', 'b'])), 0),
                                    op.read('tags')
                                ];
                                return [4 /*yield*/, client.operate(key, ops, {})];
                            case 2:
                                result = _a.sent();
                                (0, chai_1.expect)(result.bins).to.eql({ tags: { c: 'yellow' } });
                                return [2 /*return*/];
                        }
                    });
                });
            });
            it('removes map item by key list in a cdt context', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, context, ops, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: { a: 'blue', nested: { d: 'orange', e: 'pink', f: 'white', g: 'black' } } })];
                            case 1:
                                key = _a.sent();
                                context = new Context().addMapKey('nested');
                                ops = [
                                    exp.operations.write('tags', exp.maps.removeByKeyList(exp.binMap('tags'), exp.list(['d', 'e']), context), 0),
                                    op.read('tags')
                                ];
                                return [4 /*yield*/, client.operate(key, ops, {})];
                            case 2:
                                result = _a.sent();
                                (0, chai_1.expect)(result.bins).to.eql({ tags: { a: 'blue', nested: { f: 'white', g: 'black' } } });
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
        describe('removeByKeyRange', function () {
            it('removes map item by key range', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, ops, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow' } })];
                            case 1:
                                key = _a.sent();
                                ops = [
                                    exp.operations.write('tags', exp.maps.removeByKeyRange(exp.binMap('tags'), exp.str('c'), exp.str('a')), 0),
                                    op.read('tags')
                                ];
                                return [4 /*yield*/, client.operate(key, ops, {})];
                            case 2:
                                result = _a.sent();
                                (0, chai_1.expect)(result.bins).to.eql({ tags: { c: 'yellow' } });
                                return [2 /*return*/];
                        }
                    });
                });
            });
            it('removes map item by key range in a cdt context', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, context, ops, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: { a: 'blue', nested: { d: 'orange', e: 'pink', f: 'white', g: 'black' } } })];
                            case 1:
                                key = _a.sent();
                                context = new Context().addMapKey('nested');
                                ops = [
                                    exp.operations.write('tags', exp.maps.removeByKeyRange(exp.binMap('tags'), exp.str('h'), exp.str('e'), context), 0),
                                    op.read('tags')
                                ];
                                return [4 /*yield*/, client.operate(key, ops, {})];
                            case 2:
                                result = _a.sent();
                                (0, chai_1.expect)(result.bins).to.eql({ tags: { a: 'blue', nested: { d: 'orange' } } });
                                return [2 /*return*/];
                        }
                    });
                });
            });
            it('removes inverted map item by key range', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, ops, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow' } })];
                            case 1:
                                key = _a.sent();
                                ops = [
                                    exp.operations.write('tags', exp.maps.removeByKeyRange(exp.binMap('tags'), exp.str('c'), exp.str('a'), null, maps.returnType.INVERTED), 0),
                                    op.read('tags')
                                ];
                                return [4 /*yield*/, client.operate(key, ops, {})];
                            case 2:
                                result = _a.sent();
                                (0, chai_1.expect)(result.bins).to.eql({ tags: { a: 'blue', b: 'green' } });
                                return [2 /*return*/];
                        }
                    });
                });
            });
            it('removes inverted map item by key range in a cdt context', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, context, ops, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: { a: 'blue', nested: { d: 'orange', e: 'pink', f: 'white', g: 'black' } } })];
                            case 1:
                                key = _a.sent();
                                context = new Context().addMapKey('nested');
                                ops = [
                                    exp.operations.write('tags', exp.maps.removeByKeyRange(exp.binMap('tags'), exp.str('h'), exp.str('e'), context, maps.returnType.INVERTED), 0),
                                    op.read('tags')
                                ];
                                return [4 /*yield*/, client.operate(key, ops, {})];
                            case 2:
                                result = _a.sent();
                                (0, chai_1.expect)(result.bins).to.eql({ tags: { a: 'blue', nested: { e: 'pink', f: 'white', g: 'black' } } });
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
        describe('removeByKeyRelIndexRangeToEnd', function () {
            it('removes map item by key relative index range to end', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, ops, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow' } })];
                            case 1:
                                key = _a.sent();
                                ops = [
                                    exp.operations.write('tags', exp.maps.removeByKeyRelIndexRangeToEnd(exp.binMap('tags'), exp.int(1), exp.str('b')), 0),
                                    op.read('tags')
                                ];
                                return [4 /*yield*/, client.operate(key, ops, {})];
                            case 2:
                                result = _a.sent();
                                (0, chai_1.expect)(result.bins).to.eql({ tags: { a: 'blue', b: 'green' } });
                                return [2 /*return*/];
                        }
                    });
                });
            });
            it('removes map item by key relative index range to end in a cdt context', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, context, ops, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: { a: 'blue', nested: { d: 'orange', e: 'pink', f: 'white', g: 'black' } } })];
                            case 1:
                                key = _a.sent();
                                context = new Context().addMapKey('nested');
                                ops = [
                                    exp.operations.write('tags', exp.maps.removeByKeyRelIndexRangeToEnd(exp.binMap('tags'), exp.int(1), exp.str('e'), context), 0),
                                    op.read('tags')
                                ];
                                return [4 /*yield*/, client.operate(key, ops, {})];
                            case 2:
                                result = _a.sent();
                                (0, chai_1.expect)(result.bins).to.eql({ tags: { a: 'blue', nested: { d: 'orange', e: 'pink' } } });
                                return [2 /*return*/];
                        }
                    });
                });
            });
            it('removes inverted map item by key relative index range to end', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, ops, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow' } })];
                            case 1:
                                key = _a.sent();
                                ops = [
                                    exp.operations.write('tags', exp.maps.removeByKeyRelIndexRangeToEnd(exp.binMap('tags'), exp.int(1), exp.str('b'), null, maps.returnType.INVERTED), 0),
                                    op.read('tags')
                                ];
                                return [4 /*yield*/, client.operate(key, ops, {})];
                            case 2:
                                result = _a.sent();
                                (0, chai_1.expect)(result.bins).to.eql({ tags: { c: 'yellow' } });
                                return [2 /*return*/];
                        }
                    });
                });
            });
            it('removes inverted map item by key relative index range to end in a cdt context', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, context, ops, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: { a: 'blue', nested: { d: 'orange', e: 'pink', f: 'white', g: 'black' } } })];
                            case 1:
                                key = _a.sent();
                                context = new Context().addMapKey('nested');
                                ops = [
                                    exp.operations.write('tags', exp.maps.removeByKeyRelIndexRangeToEnd(exp.binMap('tags'), exp.int(1), exp.str('e'), context, maps.returnType.INVERTED), 0),
                                    op.read('tags')
                                ];
                                return [4 /*yield*/, client.operate(key, ops, {})];
                            case 2:
                                result = _a.sent();
                                (0, chai_1.expect)(result.bins).to.eql({ tags: { a: 'blue', nested: { f: 'white', g: 'black' } } });
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
        describe('removeByKeyRelIndexRange', function () {
            it('removes map item by key relative index range', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, ops, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow' } })];
                            case 1:
                                key = _a.sent();
                                ops = [
                                    exp.operations.write('tags', exp.maps.removeByKeyRelIndexRange(exp.binMap('tags'), exp.int(2), exp.int(0), exp.str('a')), 0),
                                    op.read('tags')
                                ];
                                return [4 /*yield*/, client.operate(key, ops, {})];
                            case 2:
                                result = _a.sent();
                                (0, chai_1.expect)(result.bins).to.eql({ tags: { c: 'yellow' } });
                                return [2 /*return*/];
                        }
                    });
                });
            });
            it('removes map item by key relative index range in a cdt context', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, context, ops, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: { a: 'blue', nested: { d: 'orange', e: 'pink', f: 'white', g: 'black' } } })];
                            case 1:
                                key = _a.sent();
                                context = new Context().addMapKey('nested');
                                ops = [
                                    exp.operations.write('tags', exp.maps.removeByKeyRelIndexRange(exp.binMap('tags'), exp.int(2), exp.int(0), exp.str('d'), context), 0),
                                    op.read('tags')
                                ];
                                return [4 /*yield*/, client.operate(key, ops, {})];
                            case 2:
                                result = _a.sent();
                                (0, chai_1.expect)(result.bins).to.eql({ tags: { a: 'blue', nested: { f: 'white', g: 'black' } } });
                                return [2 /*return*/];
                        }
                    });
                });
            });
            it('removes inverted map item by key relative index range', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, ops, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow' } })];
                            case 1:
                                key = _a.sent();
                                ops = [
                                    exp.operations.write('tags', exp.maps.removeByKeyRelIndexRange(exp.binMap('tags'), exp.int(2), exp.int(0), exp.str('a'), null, maps.returnType.INVERTED), 0),
                                    op.read('tags')
                                ];
                                return [4 /*yield*/, client.operate(key, ops, {})];
                            case 2:
                                result = _a.sent();
                                (0, chai_1.expect)(result.bins).to.eql({ tags: { a: 'blue', b: 'green' } });
                                return [2 /*return*/];
                        }
                    });
                });
            });
            it('removes inverted map item by key relative index range in a cdt context', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, context, ops, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: { a: 'blue', nested: { d: 'orange', e: 'pink', f: 'white', g: 'black' } } })];
                            case 1:
                                key = _a.sent();
                                context = new Context().addMapKey('nested');
                                ops = [
                                    exp.operations.write('tags', exp.maps.removeByKeyRelIndexRange(exp.binMap('tags'), exp.int(2), exp.int(0), exp.str('a'), context, maps.returnType.INVERTED), 0),
                                    op.read('tags')
                                ];
                                return [4 /*yield*/, client.operate(key, ops, {})];
                            case 2:
                                result = _a.sent();
                                (0, chai_1.expect)(result.bins).to.eql({ tags: { a: 'blue', nested: { d: 'orange', e: 'pink' } } });
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
        describe('removeByValue', function () {
            it('removes map item by value', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, ops, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow' } })];
                            case 1:
                                key = _a.sent();
                                ops = [
                                    exp.operations.write('tags', exp.maps.removeByValue(exp.binMap('tags'), exp.str('green')), 0),
                                    op.read('tags')
                                ];
                                return [4 /*yield*/, client.operate(key, ops, {})];
                            case 2:
                                result = _a.sent();
                                (0, chai_1.expect)(result.bins).to.eql({ tags: { a: 'blue', c: 'yellow' } });
                                return [2 /*return*/];
                        }
                    });
                });
            });
            it('removes map item by value in a cdt context', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, context, ops, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: { a: 'blue', nested: { d: 'orange', e: 'pink', f: 'white', g: 'black' } } })];
                            case 1:
                                key = _a.sent();
                                context = new Context().addMapKey('nested');
                                ops = [
                                    exp.operations.write('tags', exp.maps.removeByValue(exp.binMap('tags'), exp.str('white'), context), 0),
                                    op.read('tags')
                                ];
                                return [4 /*yield*/, client.operate(key, ops, {})];
                            case 2:
                                result = _a.sent();
                                (0, chai_1.expect)(result.bins).to.eql({ tags: { a: 'blue', nested: { d: 'orange', e: 'pink', g: 'black' } } });
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
        describe('removeByValueList', function () {
            it('removes map item by value list', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, ops, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow' } })];
                            case 1:
                                key = _a.sent();
                                ops = [
                                    exp.operations.write('tags', exp.maps.removeByValueList(exp.binMap('tags'), exp.list(['green', 'yellow'])), 0),
                                    op.read('tags')
                                ];
                                return [4 /*yield*/, client.operate(key, ops, {})];
                            case 2:
                                result = _a.sent();
                                (0, chai_1.expect)(result.bins).to.eql({ tags: { a: 'blue' } });
                                return [2 /*return*/];
                        }
                    });
                });
            });
            it('removes map item by value list in a cdt context', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, context, ops, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: { a: 'blue', nested: { d: 'orange', e: 'pink', f: 'white', g: 'black' } } })];
                            case 1:
                                key = _a.sent();
                                context = new Context().addMapKey('nested');
                                ops = [
                                    exp.operations.write('tags', exp.maps.removeByValueList(exp.binMap('tags'), exp.list(['orange', 'white']), context), 0),
                                    op.read('tags')
                                ];
                                return [4 /*yield*/, client.operate(key, ops, {})];
                            case 2:
                                result = _a.sent();
                                (0, chai_1.expect)(result.bins).to.eql({ tags: { a: 'blue', nested: { e: 'pink', g: 'black' } } });
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
        describe('removeByValueRange', function () {
            it('removes map item by value range', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, ops, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow' } })];
                            case 1:
                                key = _a.sent();
                                ops = [
                                    exp.operations.write('tags', exp.maps.removeByValueRange(exp.binMap('tags'), exp.str('green'), exp.str('blue')), 0),
                                    op.read('tags')
                                ];
                                return [4 /*yield*/, client.operate(key, ops, {})];
                            case 2:
                                result = _a.sent();
                                (0, chai_1.expect)(result.bins).to.eql({ tags: { b: 'green', c: 'yellow' } });
                                return [2 /*return*/];
                        }
                    });
                });
            });
            it('removes map item by value range in a cdt context', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, context, ops, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: { a: 'blue', nested: { d: 'orange', e: 'pink', f: 'white', g: 'black' } } })];
                            case 1:
                                key = _a.sent();
                                context = new Context().addMapKey('nested');
                                ops = [
                                    exp.operations.write('tags', exp.maps.removeByValueRange(exp.binMap('tags'), exp.str('pink'), exp.str('black'), context), 0),
                                    op.read('tags')
                                ];
                                return [4 /*yield*/, client.operate(key, ops, {})];
                            case 2:
                                result = _a.sent();
                                (0, chai_1.expect)(result.bins).to.eql({ tags: { a: 'blue', nested: { e: 'pink', f: 'white' } } });
                                return [2 /*return*/];
                        }
                    });
                });
            });
            it('removes inverted map item by value range', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, ops, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow' } })];
                            case 1:
                                key = _a.sent();
                                ops = [
                                    exp.operations.write('tags', exp.maps.removeByValueRange(exp.binMap('tags'), exp.str('green'), exp.str('blue'), null, maps.returnType.INVERTED), 0),
                                    op.read('tags')
                                ];
                                return [4 /*yield*/, client.operate(key, ops, {})];
                            case 2:
                                result = _a.sent();
                                (0, chai_1.expect)(result.bins).to.eql({ tags: { a: 'blue' } });
                                return [2 /*return*/];
                        }
                    });
                });
            });
            it('removes inverted map item by value range in a cdt context', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, context, ops, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: { a: 'blue', nested: { d: 'orange', e: 'pink', f: 'white', g: 'black' } } })];
                            case 1:
                                key = _a.sent();
                                context = new Context().addMapKey('nested');
                                ops = [
                                    exp.operations.write('tags', exp.maps.removeByValueRange(exp.binMap('tags'), exp.str('pink'), exp.str('black'), context, maps.returnType.INVERTED), 0),
                                    op.read('tags')
                                ];
                                return [4 /*yield*/, client.operate(key, ops, {})];
                            case 2:
                                result = _a.sent();
                                (0, chai_1.expect)(result.bins).to.eql({ tags: { a: 'blue', nested: { d: 'orange', g: 'black' } } });
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
        describe('removeByValueRelRankRangeToEnd', function () {
            it('removes map item by value relative rank range to end', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, ops, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: { a: 'yellow', b: 'green', c: 'blue' } })];
                            case 1:
                                key = _a.sent();
                                ops = [
                                    exp.operations.write('tags', exp.maps.removeByValueRelRankRangeToEnd(exp.binMap('tags'), exp.int(1), exp.str('blue')), 0),
                                    op.read('tags')
                                ];
                                return [4 /*yield*/, client.operate(key, ops, {})];
                            case 2:
                                result = _a.sent();
                                (0, chai_1.expect)(result.bins).to.eql({ tags: { c: 'blue' } });
                                return [2 /*return*/];
                        }
                    });
                });
            });
            it('removes map item by value relative rank range to end in a cdt context', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, context, ops, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: { a: 'blue', nested: { d: 'orange', e: 'pink', f: 'white', g: 'black' } } })];
                            case 1:
                                key = _a.sent();
                                context = new Context().addMapKey('nested');
                                ops = [
                                    exp.operations.write('tags', exp.maps.removeByValueRelRankRangeToEnd(exp.binMap('tags'), exp.int(1), exp.str('orange'), context), 0),
                                    op.read('tags')
                                ];
                                return [4 /*yield*/, client.operate(key, ops, {})];
                            case 2:
                                result = _a.sent();
                                (0, chai_1.expect)(result.bins).to.eql({ tags: { a: 'blue', nested: { d: 'orange', g: 'black' } } });
                                return [2 /*return*/];
                        }
                    });
                });
            });
            it('removes inverted map item by value relative rank range to end', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, ops, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: { a: 'yellow', b: 'green', c: 'blue' } })];
                            case 1:
                                key = _a.sent();
                                ops = [
                                    exp.operations.write('tags', exp.maps.removeByValueRelRankRangeToEnd(exp.binMap('tags'), exp.int(1), exp.str('blue'), null, maps.returnType.INVERTED), 0),
                                    op.read('tags')
                                ];
                                return [4 /*yield*/, client.operate(key, ops, {})];
                            case 2:
                                result = _a.sent();
                                (0, chai_1.expect)(result.bins).to.eql({ tags: { a: 'yellow', b: 'green' } });
                                return [2 /*return*/];
                        }
                    });
                });
            });
            it('removes inverted map item by value relative rank range to end in a cdt context', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, context, ops, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: { a: 'blue', nested: { d: 'orange', e: 'pink', f: 'white', g: 'black' } } })];
                            case 1:
                                key = _a.sent();
                                context = new Context().addMapKey('nested');
                                ops = [
                                    exp.operations.write('tags', exp.maps.removeByValueRelRankRangeToEnd(exp.binMap('tags'), exp.int(1), exp.str('black'), context, maps.returnType.INVERTED), 0),
                                    op.read('tags')
                                ];
                                return [4 /*yield*/, client.operate(key, ops, {})];
                            case 2:
                                result = _a.sent();
                                (0, chai_1.expect)(result.bins).to.eql({ tags: { a: 'blue', nested: { d: 'orange', e: 'pink', f: 'white' } } });
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
        describe('removeByValueRelRankRange', function () {
            it('removes map item by value relative rank range', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, ops, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: { a: 'yellow', b: 'green', c: 'blue' } })];
                            case 1:
                                key = _a.sent();
                                ops = [
                                    exp.operations.write('tags', exp.maps.removeByValueRelRankRange(exp.binMap('tags'), exp.int(1), exp.int(-1), exp.str('green')), 0),
                                    op.read('tags')
                                ];
                                return [4 /*yield*/, client.operate(key, ops, {})];
                            case 2:
                                result = _a.sent();
                                (0, chai_1.expect)(result.bins).to.eql({ tags: { a: 'yellow', b: 'green' } });
                                return [2 /*return*/];
                        }
                    });
                });
            });
            it('removes map item by value relative rank range in a cdt context', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, context, ops, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: { a: 'blue', nested: { d: 'orange', e: 'pink', f: 'white', g: 'black' } } })];
                            case 1:
                                key = _a.sent();
                                context = new Context().addMapKey('nested');
                                ops = [
                                    exp.operations.write('tags', exp.maps.removeByValueRelRankRange(exp.binMap('tags'), exp.int(1), exp.int(-1), exp.str('pink'), context), 0),
                                    op.read('tags')
                                ];
                                return [4 /*yield*/, client.operate(key, ops, {})];
                            case 2:
                                result = _a.sent();
                                (0, chai_1.expect)(result.bins).to.eql({ tags: { a: 'blue', nested: { e: 'pink', f: 'white', g: 'black' } } });
                                return [2 /*return*/];
                        }
                    });
                });
            });
            it('removes inverted map item by value relative rank range', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, ops, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: { a: 'yellow', b: 'green', c: 'blue' } })];
                            case 1:
                                key = _a.sent();
                                ops = [
                                    exp.operations.write('tags', exp.maps.removeByValueRelRankRange(exp.binMap('tags'), exp.int(1), exp.int(-1), exp.str('green'), null, maps.returnType.INVERTED), 0),
                                    op.read('tags')
                                ];
                                return [4 /*yield*/, client.operate(key, ops, {})];
                            case 2:
                                result = _a.sent();
                                (0, chai_1.expect)(result.bins).to.eql({ tags: { c: 'blue' } });
                                return [2 /*return*/];
                        }
                    });
                });
            });
            it('removes inverted map item by value relative rank range in a cdt context', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, context, ops, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: { a: 'blue', nested: { d: 'orange', e: 'pink', f: 'white', g: 'black' } } })];
                            case 1:
                                key = _a.sent();
                                context = new Context().addMapKey('nested');
                                ops = [
                                    exp.operations.write('tags', exp.maps.removeByValueRelRankRange(exp.binMap('tags'), exp.int(1), exp.int(-1), exp.str('pink'), context, maps.returnType.INVERTED), 0),
                                    op.read('tags')
                                ];
                                return [4 /*yield*/, client.operate(key, ops, {})];
                            case 2:
                                result = _a.sent();
                                (0, chai_1.expect)(result.bins).to.eql({ tags: { a: 'blue', nested: { d: 'orange' } } });
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
        describe('removeByIndex', function () {
            it('removes a map item by index', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, ops, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow' } })];
                            case 1:
                                key = _a.sent();
                                ops = [
                                    exp.operations.write('tags', exp.maps.removeByIndex(exp.binMap('tags'), exp.int(1)), 0),
                                    op.read('tags')
                                ];
                                return [4 /*yield*/, client.operate(key, ops, {})];
                            case 2:
                                result = _a.sent();
                                return [4 /*yield*/, client.get(key)];
                            case 3:
                                result = _a.sent();
                                (0, chai_1.expect)(result.bins).to.eql({ tags: { a: 'blue', c: 'yellow' } });
                                return [2 /*return*/];
                        }
                    });
                });
            });
            it('removes a map item by index in a cdt context in a cdt context', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, context, ops, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: { a: 'blue', nested: { d: 'orange', e: 'pink', f: 'white', g: 'black' } } })];
                            case 1:
                                key = _a.sent();
                                context = new Context().addMapKey('nested');
                                ops = [
                                    exp.operations.write('tags', exp.maps.removeByIndex(exp.binMap('tags'), exp.int(1), context), 0),
                                    op.read('tags')
                                ];
                                return [4 /*yield*/, client.operate(key, ops, {})];
                            case 2:
                                result = _a.sent();
                                return [4 /*yield*/, client.get(key)];
                            case 3:
                                result = _a.sent();
                                (0, chai_1.expect)(result.bins).to.eql({ tags: { a: 'blue', nested: { d: 'orange', f: 'white', g: 'black' } } });
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
        describe('removeByIndexRangeToEnd', function () {
            it('removes a map item by index range to end', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, ops, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow' } })];
                            case 1:
                                key = _a.sent();
                                ops = [
                                    exp.operations.write('tags', exp.maps.removeByIndexRangeToEnd(exp.binMap('tags'), exp.int(1)), 0),
                                    op.read('tags')
                                ];
                                return [4 /*yield*/, client.operate(key, ops, {})];
                            case 2:
                                result = _a.sent();
                                (0, chai_1.expect)(result.bins).to.eql({ tags: { a: 'blue' } });
                                return [2 /*return*/];
                        }
                    });
                });
            });
            it('removes a map item by index range to end in a cdt context in a cdt context', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, context, ops, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: { a: 'blue', nested: { d: 'orange', e: 'pink', f: 'white', g: 'black' } } })];
                            case 1:
                                key = _a.sent();
                                context = new Context().addMapKey('nested');
                                ops = [
                                    exp.operations.write('tags', exp.maps.removeByIndexRangeToEnd(exp.binMap('tags'), exp.int(1), context), 0),
                                    op.read('tags')
                                ];
                                return [4 /*yield*/, client.operate(key, ops, {})];
                            case 2:
                                result = _a.sent();
                                (0, chai_1.expect)(result.bins).to.eql({ tags: { a: 'blue', nested: { d: 'orange' } } });
                                return [2 /*return*/];
                        }
                    });
                });
            });
            it('removes an inverted map item by index range to end', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, ops, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow' } })];
                            case 1:
                                key = _a.sent();
                                ops = [
                                    exp.operations.write('tags', exp.maps.removeByIndexRangeToEnd(exp.binMap('tags'), exp.int(1), null, maps.returnType.INVERTED), 0),
                                    op.read('tags')
                                ];
                                return [4 /*yield*/, client.operate(key, ops, {})];
                            case 2:
                                result = _a.sent();
                                (0, chai_1.expect)(result.bins).to.eql({ tags: { b: 'green', c: 'yellow' } });
                                return [2 /*return*/];
                        }
                    });
                });
            });
            it('removes an inverted map item by index range to end in a cdt context', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, context, ops, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: { a: 'blue', nested: { d: 'orange', e: 'pink', f: 'white', g: 'black' } } })];
                            case 1:
                                key = _a.sent();
                                context = new Context().addMapKey('nested');
                                ops = [
                                    exp.operations.write('tags', exp.maps.removeByIndexRangeToEnd(exp.binMap('tags'), exp.int(1), context, maps.returnType.INVERTED), 0),
                                    op.read('tags')
                                ];
                                return [4 /*yield*/, client.operate(key, ops, {})];
                            case 2:
                                result = _a.sent();
                                (0, chai_1.expect)(result.bins).to.eql({ tags: { a: 'blue', nested: { e: 'pink', f: 'white', g: 'black' } } });
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
        describe('removeByIndexRange', function () {
            it('removes a map item by index range', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, ops, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow' } })];
                            case 1:
                                key = _a.sent();
                                ops = [
                                    exp.operations.write('tags', exp.maps.removeByIndexRange(exp.binMap('tags'), exp.int(2), exp.int(0)), 0),
                                    op.read('tags')
                                ];
                                return [4 /*yield*/, client.operate(key, ops, {})];
                            case 2:
                                result = _a.sent();
                                (0, chai_1.expect)(result.bins).to.eql({ tags: { c: 'yellow' } });
                                return [2 /*return*/];
                        }
                    });
                });
            });
            it('removes a map item by index range in a cdt context', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, context, ops, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: { a: 'blue', nested: { d: 'orange', e: 'pink', f: 'white', g: 'black' } } })];
                            case 1:
                                key = _a.sent();
                                context = new Context().addMapKey('nested');
                                ops = [
                                    exp.operations.write('tags', exp.maps.removeByIndexRange(exp.binMap('tags'), exp.int(2), exp.int(0), context), 0),
                                    op.read('tags')
                                ];
                                return [4 /*yield*/, client.operate(key, ops, {})];
                            case 2:
                                result = _a.sent();
                                (0, chai_1.expect)(result.bins).to.eql({ tags: { a: 'blue', nested: { f: 'white', g: 'black' } } });
                                return [2 /*return*/];
                        }
                    });
                });
            });
            it('removes a inverted map item by index range', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, ops, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow' } })];
                            case 1:
                                key = _a.sent();
                                ops = [
                                    exp.operations.write('tags', exp.maps.removeByIndexRange(exp.binMap('tags'), exp.int(2), exp.int(0), null, maps.returnType.INVERTED), 0),
                                    op.read('tags')
                                ];
                                return [4 /*yield*/, client.operate(key, ops, {})];
                            case 2:
                                result = _a.sent();
                                (0, chai_1.expect)(result.bins).to.eql({ tags: { a: 'blue', b: 'green' } });
                                return [2 /*return*/];
                        }
                    });
                });
            });
            it('removes a inverted map item by index range in a cdt context', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, context, ops, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: { a: 'blue', nested: { d: 'orange', e: 'pink', f: 'white', g: 'black' } } })];
                            case 1:
                                key = _a.sent();
                                context = new Context().addMapKey('nested');
                                ops = [
                                    exp.operations.write('tags', exp.maps.removeByIndexRange(exp.binMap('tags'), exp.int(2), exp.int(0), context, maps.returnType.INVERTED), 0),
                                    op.read('tags')
                                ];
                                return [4 /*yield*/, client.operate(key, ops, {})];
                            case 2:
                                result = _a.sent();
                                (0, chai_1.expect)(result.bins).to.eql({ tags: { a: 'blue', nested: { d: 'orange', e: 'pink' } } });
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
        describe('removeByRank', function () {
            it('removes a map item by rank', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, ops, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: { a: 'yellow', b: 'green', c: 'blue' } })];
                            case 1:
                                key = _a.sent();
                                ops = [
                                    exp.operations.write('tags', exp.maps.removeByRank(exp.binMap('tags'), exp.int(2)), 0),
                                    op.read('tags')
                                ];
                                return [4 /*yield*/, client.operate(key, ops, {})];
                            case 2:
                                result = _a.sent();
                                (0, chai_1.expect)(result.bins).to.eql({ tags: { b: 'green', c: 'blue' } });
                                return [2 /*return*/];
                        }
                    });
                });
            });
            it('removes a map item by rank in a cdt context', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, context, ops, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: { a: 'blue', nested: { d: 'orange', e: 'pink', f: 'white', g: 'black' } } })];
                            case 1:
                                key = _a.sent();
                                context = new Context().addMapKey('nested');
                                ops = [
                                    exp.operations.write('tags', exp.maps.removeByRank(exp.binMap('tags'), exp.int(2), context), 0),
                                    op.read('tags')
                                ];
                                return [4 /*yield*/, client.operate(key, ops, {})];
                            case 2:
                                result = _a.sent();
                                (0, chai_1.expect)(result.bins).to.eql({ tags: { a: 'blue', nested: { d: 'orange', f: 'white', g: 'black' } } });
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
        describe('removeByRankRangeToEnd', function () {
            it('removes a map item by rank range to end', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, ops, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: { a: 'yellow', b: 'green', c: 'blue' } })];
                            case 1:
                                key = _a.sent();
                                ops = [
                                    exp.operations.write('tags', exp.maps.removeByRankRangeToEnd(exp.binMap('tags'), exp.int(1)), 0),
                                    op.read('tags')
                                ];
                                return [4 /*yield*/, client.operate(key, ops, {})];
                            case 2:
                                result = _a.sent();
                                (0, chai_1.expect)(result.bins).to.eql({ tags: { c: 'blue' } });
                                return [2 /*return*/];
                        }
                    });
                });
            });
            it('removes a map item by rank range to end in a cdt context', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, context, ops, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: { a: 'blue', nested: { d: 'orange', e: 'pink', f: 'white', g: 'black' } } })];
                            case 1:
                                key = _a.sent();
                                context = new Context().addMapKey('nested');
                                ops = [
                                    exp.operations.write('tags', exp.maps.removeByRankRangeToEnd(exp.binMap('tags'), exp.int(1), context), 0),
                                    op.read('tags')
                                ];
                                return [4 /*yield*/, client.operate(key, ops, {})];
                            case 2:
                                result = _a.sent();
                                (0, chai_1.expect)(result.bins).to.eql({ tags: { a: 'blue', nested: { g: 'black' } } });
                                return [2 /*return*/];
                        }
                    });
                });
            });
            it('removes an inverted map item by rank range to end', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, ops, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: { a: 'yellow', b: 'green', c: 'blue' } })];
                            case 1:
                                key = _a.sent();
                                ops = [
                                    exp.operations.write('tags', exp.maps.removeByRankRangeToEnd(exp.binMap('tags'), exp.int(1), null, maps.returnType.INVERTED), 0),
                                    op.read('tags')
                                ];
                                return [4 /*yield*/, client.operate(key, ops, {})];
                            case 2:
                                result = _a.sent();
                                (0, chai_1.expect)(result.bins).to.eql({ tags: { a: 'yellow', b: 'green' } });
                                return [2 /*return*/];
                        }
                    });
                });
            });
            it('removes an inverted map item by rank range to end in a cdt context', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, context, ops, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: { a: 'blue', nested: { d: 'orange', e: 'pink', f: 'white', g: 'black' } } })];
                            case 1:
                                key = _a.sent();
                                context = new Context().addMapKey('nested');
                                ops = [
                                    exp.operations.write('tags', exp.maps.removeByRankRangeToEnd(exp.binMap('tags'), exp.int(1), context, maps.returnType.INVERTED), 0),
                                    op.read('tags')
                                ];
                                return [4 /*yield*/, client.operate(key, ops, {})];
                            case 2:
                                result = _a.sent();
                                (0, chai_1.expect)(result.bins).to.eql({ tags: { a: 'blue', nested: { d: 'orange', e: 'pink', f: 'white' } } });
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
        describe('removeByRankRange', function () {
            it('removes a map item by rank range', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, ops, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: { a: 'yellow', b: 'green', c: 'blue' } })];
                            case 1:
                                key = _a.sent();
                                ops = [
                                    exp.operations.write('tags', exp.maps.removeByRankRange(exp.binMap('tags'), exp.int(2), exp.int(0)), 0),
                                    op.read('tags')
                                ];
                                return [4 /*yield*/, client.operate(key, ops, {})];
                            case 2:
                                result = _a.sent();
                                (0, chai_1.expect)(result.bins).to.eql({ tags: { a: 'yellow' } });
                                return [2 /*return*/];
                        }
                    });
                });
            });
            it('removes a map item by rank range in a cdt context', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, context, ops, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: { a: 'blue', nested: { d: 'orange', e: 'pink', f: 'white', g: 'black' } } })];
                            case 1:
                                key = _a.sent();
                                context = new Context().addMapKey('nested');
                                ops = [
                                    exp.operations.write('tags', exp.maps.removeByRankRange(exp.binMap('tags'), exp.int(2), exp.int(0), context), 0),
                                    op.read('tags')
                                ];
                                return [4 /*yield*/, client.operate(key, ops, {})];
                            case 2:
                                result = _a.sent();
                                (0, chai_1.expect)(result.bins).to.eql({ tags: { a: 'blue', nested: { e: 'pink', f: 'white' } } });
                                return [2 /*return*/];
                        }
                    });
                });
            });
            it('removes an inverted map item by rank range', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, ops, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: { a: 'yellow', b: 'green', c: 'blue' } })];
                            case 1:
                                key = _a.sent();
                                ops = [
                                    exp.operations.write('tags', exp.maps.removeByRankRange(exp.binMap('tags'), exp.int(2), exp.int(0), null, maps.returnType.INVERTED), 0),
                                    op.read('tags')
                                ];
                                return [4 /*yield*/, client.operate(key, ops, {})];
                            case 2:
                                result = _a.sent();
                                (0, chai_1.expect)(result.bins).to.eql({ tags: { b: 'green', c: 'blue' } });
                                return [2 /*return*/];
                        }
                    });
                });
            });
            it('removes an inverted map item by rank range in a cdt context', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, context, ops, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: { a: 'blue', nested: { d: 'orange', e: 'pink', f: 'white', g: 'black' } } })];
                            case 1:
                                key = _a.sent();
                                context = new Context().addMapKey('nested');
                                ops = [
                                    exp.operations.write('tags', exp.maps.removeByRankRange(exp.binMap('tags'), exp.int(2), exp.int(0), context, maps.returnType.INVERTED), 0),
                                    op.read('tags')
                                ];
                                return [4 /*yield*/, client.operate(key, ops, {})];
                            case 2:
                                result = _a.sent();
                                (0, chai_1.expect)(result.bins).to.eql({ tags: { a: 'blue', nested: { d: 'orange', g: 'black' } } });
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
        describe('getByIndex', function () {
            it('selects item identified by index', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, ops;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow' } })];
                            case 1:
                                key = _a.sent();
                                ops = [
                                    exp.operations.read(tempBin, exp.maps.getByIndex(exp.binMap('tags'), exp.int(2), exp.type.INT, maps.returnType.COUNT), 0),
                                    op.read('tags')
                                ];
                                return [4 /*yield*/, client.operate(key, ops, {})];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, testNoMatch(key, exp.eq(exp.maps.getByIndex(exp.binMap('tags'), exp.int(2), exp.type.INT, maps.returnType.COUNT), exp.int(0)))];
                            case 3:
                                _a.sent();
                                return [4 /*yield*/, testMatch(key, exp.eq(exp.maps.getByIndex(exp.binMap('tags'), exp.int(2), exp.type.INT, maps.returnType.COUNT), exp.int(1)))];
                            case 4:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                });
            });
            it('selects item identified by index inside nested map', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, context;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: { a: 'blue', nested: { d: 'orange', e: 'pink', f: 'white', g: 'black' } } })];
                            case 1:
                                key = _a.sent();
                                context = new Context().addMapKey('nested');
                                orderByKey('tags', key);
                                orderByKey('tags', key, context);
                                return [4 /*yield*/, testNoMatch(key, exp.eq(exp.maps.getByIndex(exp.binMap('tags'), exp.int(2), exp.type.AUTO, maps.returnType.COUNT, context), exp.int(0)))];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, testMatch(key, exp.eq(exp.maps.getByIndex(exp.binMap('tags'), exp.int(3), exp.type.AUTO, maps.returnType.COUNT, context), exp.int(1)))];
                            case 3:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
        describe('getByIndexRange', function () {
            it('selects "count" map items starting at specified index', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow' } })];
                            case 1:
                                key = _a.sent();
                                return [4 /*yield*/, testNoMatch(key, exp.eq(exp.maps.getByIndexRange(exp.binMap('tags'), exp.int(5), exp.int(0), maps.returnType.COUNT), exp.int(0)))];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, testMatch(key, exp.eq(exp.maps.getByIndexRange(exp.binMap('tags'), exp.int(5), exp.int(0), maps.returnType.COUNT), exp.int(3)))];
                            case 3:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                });
            });
            it('selects "count" map items starting at specified nested index', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, context;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: { a: 'blue', nested: { d: 'orange', e: 'pink', f: 'white', g: 'black' } } })];
                            case 1:
                                key = _a.sent();
                                context = new Context().addMapKey('nested');
                                orderByKey('tags', key);
                                orderByKey('tags', key, context);
                                return [4 /*yield*/, testNoMatch(key, exp.eq(exp.maps.getByIndexRange(exp.binMap('tags'), exp.int(6), exp.int(0), maps.returnType.COUNT, context), exp.int(0)))];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, testMatch(key, exp.eq(exp.maps.getByIndexRange(exp.binMap('tags'), exp.int(6), exp.int(0), maps.returnType.COUNT, context), exp.int(4)))];
                            case 3:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
        describe('getByIndexRangeToEnd', function () {
            it('selects map items starting at specified index to the end of the map', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow' } })];
                            case 1:
                                key = _a.sent();
                                return [4 /*yield*/, testNoMatch(key, exp.eq(exp.maps.getByIndexRangeToEnd(exp.binMap('tags'), exp.int(0), maps.returnType.COUNT), exp.int(0)))];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, testMatch(key, exp.eq(exp.maps.getByIndexRangeToEnd(exp.binMap('tags'), exp.int(0), maps.returnType.COUNT), exp.int(3)))];
                            case 3:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                });
            });
            it('selects map items starting at specified index to the end of the map', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, context;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: { a: 'blue', nested: { d: 'orange', e: 'pink', f: 'white', g: 'black' } } })];
                            case 1:
                                key = _a.sent();
                                context = new Context().addMapKey('nested');
                                orderByKey('tags', key);
                                orderByKey('tags', key, context);
                                return [4 /*yield*/, testNoMatch(key, exp.eq(exp.maps.getByIndexRangeToEnd(exp.binMap('tags'), exp.int(0), maps.returnType.COUNT, context), exp.int(0)))];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, testMatch(key, exp.eq(exp.maps.getByIndexRangeToEnd(exp.binMap('tags'), exp.int(0), maps.returnType.COUNT, context), exp.int(4)))];
                            case 3:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
        describe('getByKey', function () {
            it('matches the count of the matched map values', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow' } })];
                            case 1:
                                key = _a.sent();
                                return [4 /*yield*/, testNoMatch(key, exp.eq(exp.maps.getByKey(exp.binMap('tags'), exp.str('a'), exp.type.AUTO, maps.returnType.COUNT), exp.int(2)))];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, testMatch(key, exp.eq(exp.maps.getByKey(exp.binMap('tags'), exp.str('a'), exp.type.AUTO, maps.returnType.COUNT), exp.int(1)))];
                            case 3:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                });
            });
            it('matches the count of the matched map values of a nested map', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, context;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow', nested: { d: 'orange', e: 'pink', f: 'white', g: 'black' } } })];
                            case 1:
                                key = _a.sent();
                                context = new Context().addMapKey('nested');
                                return [4 /*yield*/, testNoMatch(key, exp.eq(exp.maps.getByKey(exp.binMap('tags'), exp.str('d'), exp.type.AUTO, maps.returnType.COUNT, context), exp.int(2)))];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, testMatch(key, exp.eq(exp.maps.getByKey(exp.binMap('tags'), exp.str('d'), exp.type.AUTO, maps.returnType.COUNT, context), exp.int(1)))];
                            case 3:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
        describe('getByKeyList', function () {
            it('matches the count of the matched map values', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow' } })];
                            case 1:
                                key = _a.sent();
                                return [4 /*yield*/, testNoMatch(key, exp.eq(exp.maps.getByKeyList(exp.binMap('tags'), exp.list(['a', 'b']), maps.returnType.COUNT), exp.int(1)))];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, testMatch(key, exp.eq(exp.maps.getByKeyList(exp.binMap('tags'), exp.list(['a', 'b']), maps.returnType.COUNT), exp.int(2)))];
                            case 3:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                });
            });
            it('matches the count of the matched map values of a nested map', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, context;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow', nested: { d: 'orange', e: 'pink', f: 'white', g: 'black' } } })];
                            case 1:
                                key = _a.sent();
                                context = new Context().addMapKey('nested');
                                return [4 /*yield*/, testNoMatch(key, exp.eq(exp.maps.getByKeyList(exp.binMap('tags'), exp.list(['d', 'e']), maps.returnType.COUNT, context), exp.int(1)))];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, testMatch(key, exp.eq(exp.maps.getByKeyList(exp.binMap('tags'), exp.list(['d', 'e']), maps.returnType.COUNT, context), exp.int(2)))];
                            case 3:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
        describe('getByKeyRange', function () {
            it('matches the count of the matched map values', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow' } })];
                            case 1:
                                key = _a.sent();
                                return [4 /*yield*/, testNoMatch(key, exp.eq(exp.maps.getByKeyRange(exp.binMap('tags'), exp.str('c'), exp.str('a'), maps.returnType.COUNT), exp.int(3)))];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, testMatch(key, exp.eq(exp.maps.getByKeyRange(exp.binMap('tags'), exp.str('c'), exp.str('a'), maps.returnType.COUNT), exp.int(2)))];
                            case 3:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                });
            });
            it('matches the count of the matched map values of a nested map', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, context;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow', nested: { d: 'orange', e: 'pink', f: 'white', g: 'black' } } })];
                            case 1:
                                key = _a.sent();
                                context = new Context().addMapKey('nested');
                                return [4 /*yield*/, testNoMatch(key, exp.eq(exp.maps.getByKeyRange(exp.binMap('tags'), exp.str('g'), exp.str('d'), maps.returnType.COUNT, context), exp.int(4)))];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, testMatch(key, exp.eq(exp.maps.getByKeyRange(exp.binMap('tags'), exp.str('g'), exp.str('d'), maps.returnType.COUNT, context), exp.int(3)))];
                            case 3:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
        describe('getByKeyRelIndexRange', function () {
            it('matches the count of the matched map values', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: { a: 'blue', b: 'green', d: 'yellow' } })];
                            case 1:
                                key = _a.sent();
                                return [4 /*yield*/, testNoMatch(key, exp.eq(exp.maps.getByKeyRelIndexRange(exp.binMap('tags'), exp.int(3), exp.int(0), exp.str('b'), maps.returnType.COUNT), exp.int(1)))];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, testMatch(key, exp.eq(exp.maps.getByKeyRelIndexRange(exp.binMap('tags'), exp.int(3), exp.int(0), exp.str('b'), maps.returnType.COUNT), exp.int(2)))];
                            case 3:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                });
            });
            it('matches the count of the matched map values of a nested map', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, context;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow', nested: { d: 'orange', e: 'pink', g: 'white', h: 'black' } } })];
                            case 1:
                                key = _a.sent();
                                context = new Context().addMapKey('nested');
                                return [4 /*yield*/, testNoMatch(key, exp.eq(exp.maps.getByKeyRelIndexRange(exp.binMap('tags'), exp.int(3), exp.int(0), exp.str('g'), maps.returnType.COUNT, context), exp.int(1)))];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, testMatch(key, exp.eq(exp.maps.getByKeyRelIndexRange(exp.binMap('tags'), exp.int(3), exp.int(0), exp.str('g'), maps.returnType.COUNT, context), exp.int(2)))];
                            case 3:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
        describe('getByKeyRelIndexRangeToEnd', function () {
            it('matches the count of the matched map values', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: { a: 'blue', b: 'green', d: 'yellow' } })];
                            case 1:
                                key = _a.sent();
                                return [4 /*yield*/, testNoMatch(key, exp.eq(exp.maps.getByKeyRelIndexRangeToEnd(exp.binMap('tags'), exp.int(0), exp.str('b'), maps.returnType.COUNT), exp.int(1)))];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, testMatch(key, exp.eq(exp.maps.getByKeyRelIndexRangeToEnd(exp.binMap('tags'), exp.int(0), exp.str('b'), maps.returnType.COUNT), exp.int(2)))];
                            case 3:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                });
            });
            it('matches the count of the matched map values of a nested map', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, context;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow', nested: { d: 'orange', e: 'pink', g: 'white', h: 'black' } } })];
                            case 1:
                                key = _a.sent();
                                context = new Context().addMapKey('nested');
                                return [4 /*yield*/, testNoMatch(key, exp.eq(exp.maps.getByKeyRelIndexRangeToEnd(exp.binMap('tags'), exp.int(0), exp.str('e'), maps.returnType.COUNT, context), exp.int(2)))];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, testMatch(key, exp.eq(exp.maps.getByKeyRelIndexRangeToEnd(exp.binMap('tags'), exp.int(0), exp.str('e'), maps.returnType.COUNT, context), exp.int(3)))];
                            case 3:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
        describe('getByRank', function () {
            it('selects map item identified by rank', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, ops;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: { a: 'blue', b: 'green', d: 5, c: 'yellow' } })];
                            case 1:
                                key = _a.sent();
                                ops = [
                                    exp.operations.read(tempBin, exp.maps.getByRank(exp.binMap('tags'), exp.int(0), exp.type.INT, maps.returnType.COUNT), 0),
                                    op.read('tags')
                                ];
                                return [4 /*yield*/, client.operate(key, ops, {})];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, testNoMatch(key, exp.eq(exp.maps.getByRank(exp.binMap('tags'), exp.int(0), exp.type.INT, maps.returnType.COUNT), exp.int(0)))];
                            case 3:
                                _a.sent();
                                return [4 /*yield*/, testMatch(key, exp.eq(exp.maps.getByRank(exp.binMap('tags'), exp.int(0), exp.type.INT, maps.returnType.COUNT), exp.int(1)))];
                            case 4:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                });
            });
            it('selects map item identified by rank within a nested map', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, context, ops;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: { a: 'blue', b: 'green', d: 5, c: 'yellow', nested: { d: 'orange', e: 'pink', f: 'white', g: 'black' } } })];
                            case 1:
                                key = _a.sent();
                                context = new Context().addMapKey('nested');
                                ops = [
                                    exp.operations.read(tempBin, exp.maps.getByRank(exp.binMap('tags'), exp.int(0), exp.type.INT, maps.returnType.COUNT), 0),
                                    op.read('tags')
                                ];
                                return [4 /*yield*/, client.operate(key, ops, {})];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, testNoMatch(key, exp.eq(exp.maps.getByRank(exp.binMap('tags'), exp.int(0), exp.type.INT, maps.returnType.COUNT, context), exp.int(0)))];
                            case 3:
                                _a.sent();
                                return [4 /*yield*/, testMatch(key, exp.eq(exp.maps.getByRank(exp.binMap('tags'), exp.int(0), exp.type.INT, maps.returnType.COUNT, context), exp.int(1)))];
                            case 4:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
        describe('getByRankRange', function () {
            it('selects "count" map items starting at specified rank', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow' } })];
                            case 1:
                                key = _a.sent();
                                return [4 /*yield*/, testNoMatch(key, exp.eq(exp.maps.getByRankRange(exp.binMap('tags'), exp.int(4), exp.int(0), maps.returnType.COUNT), exp.int(0)))];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, testMatch(key, exp.eq(exp.maps.getByRankRange(exp.binMap('tags'), exp.int(4), exp.int(0), maps.returnType.COUNT), exp.int(3)))];
                            case 3:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                });
            });
            it('selects "count" map items starting at specified rank in nested context', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, context;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow', nested: { d: 'orange', e: 'pink', f: 'white', g: 'black' } } })];
                            case 1:
                                key = _a.sent();
                                context = new Context().addMapKey('nested');
                                return [4 /*yield*/, testNoMatch(key, exp.eq(exp.maps.getByRankRange(exp.binMap('tags'), exp.int(5), exp.int(0), maps.returnType.COUNT, context), exp.int(0)))];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, testMatch(key, exp.eq(exp.maps.getByRankRange(exp.binMap('tags'), exp.int(5), exp.int(0), maps.returnType.COUNT, context), exp.int(4)))];
                            case 3:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
        describe('getByRankRangeToEnd', function () {
            it('selects map items starting at specified rank to the last ranked item', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow' } })];
                            case 1:
                                key = _a.sent();
                                return [4 /*yield*/, testNoMatch(key, exp.eq(exp.maps.getByRankRangeToEnd(exp.binMap('tags'), exp.int(0), maps.returnType.COUNT), exp.int(0)))];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, testMatch(key, exp.eq(exp.maps.getByRankRangeToEnd(exp.binMap('tags'), exp.int(0), maps.returnType.COUNT), exp.int(3)))];
                            case 3:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                });
            });
            it('selects map items starting at specified rank to the last ranked item in a nested context', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, context;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow', nested: { d: 'orange', e: 'pink', f: 'white', g: 'black' } } })];
                            case 1:
                                key = _a.sent();
                                context = new Context().addMapKey('nested');
                                return [4 /*yield*/, testNoMatch(key, exp.eq(exp.maps.getByRankRangeToEnd(exp.binMap('tags'), exp.int(0), maps.returnType.COUNT, context), exp.int(0)))];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, testMatch(key, exp.eq(exp.maps.getByRankRangeToEnd(exp.binMap('tags'), exp.int(0), maps.returnType.COUNT, context), exp.int(4)))];
                            case 3:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
    });
    describe('getByValue', function () {
        it('matches the count of the matched map values', function () {
            return __awaiter(this, void 0, void 0, function () {
                var key;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow' } })];
                        case 1:
                            key = _a.sent();
                            return [4 /*yield*/, testNoMatch(key, exp.eq(exp.maps.getByValue(exp.binMap('tags'), exp.str('green'), maps.returnType.COUNT), exp.int(2)))];
                        case 2:
                            _a.sent();
                            return [4 /*yield*/, testMatch(key, exp.eq(exp.maps.getByValue(exp.binMap('tags'), exp.str('green'), maps.returnType.COUNT), exp.int(1)))];
                        case 3:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        });
        it('matches the count of the matched map values of a nested map', function () {
            return __awaiter(this, void 0, void 0, function () {
                var key, context;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow', nested: { d: 'orange', e: 'pink', f: 'white', g: 'black' } } })];
                        case 1:
                            key = _a.sent();
                            context = new Context().addMapKey('nested');
                            return [4 /*yield*/, testNoMatch(key, exp.eq(exp.maps.getByValue(exp.binMap('tags'), exp.str('orange'), maps.returnType.COUNT, context), exp.int(2)))];
                        case 2:
                            _a.sent();
                            return [4 /*yield*/, testMatch(key, exp.eq(exp.maps.getByValue(exp.binMap('tags'), exp.str('orange'), maps.returnType.COUNT, context), exp.int(1)))];
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
                        case 0: return [4 /*yield*/, createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow' } })];
                        case 1:
                            key = _a.sent();
                            return [4 /*yield*/, testNoMatch(key, exp.eq(exp.maps.getByValueList(exp.binMap('tags'), exp.list(['green', 'yellow']), maps.returnType.COUNT), exp.int(3)))];
                        case 2:
                            _a.sent();
                            return [4 /*yield*/, testMatch(key, exp.eq(exp.maps.getByValueList(exp.binMap('tags'), exp.list(['green', 'yellow']), maps.returnType.COUNT), exp.int(2)))];
                        case 3:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        });
        it('matches the count of the matched values', function () {
            return __awaiter(this, void 0, void 0, function () {
                var key, context;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow', nested: { d: 'orange', e: 'pink', f: 'white', g: 'black' } } })];
                        case 1:
                            key = _a.sent();
                            context = new Context().addMapKey('nested');
                            return [4 /*yield*/, testNoMatch(key, exp.eq(exp.maps.getByValueList(exp.binMap('tags'), exp.list(['orange', 'white']), maps.returnType.COUNT, context), exp.int(3)))];
                        case 2:
                            _a.sent();
                            return [4 /*yield*/, testMatch(key, exp.eq(exp.maps.getByValueList(exp.binMap('tags'), exp.list(['orange', 'white']), maps.returnType.COUNT, context), exp.int(2)))];
                        case 3:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        });
    });
    describe('getByValueRange', function () {
        it('matches the count of the matched range of map values', function () {
            return __awaiter(this, void 0, void 0, function () {
                var key;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow' } })];
                        case 1:
                            key = _a.sent();
                            return [4 /*yield*/, testNoMatch(key, exp.eq(exp.maps.getByValueRange(exp.binMap('tags'), exp.str('yellow'), exp.str('blue'), maps.returnType.COUNT), exp.int(3)))];
                        case 2:
                            _a.sent();
                            return [4 /*yield*/, testMatch(key, exp.eq(exp.maps.getByValueRange(exp.binMap('tags'), exp.str('yellow'), exp.str('blue'), maps.returnType.COUNT), exp.int(2)))];
                        case 3:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        });
        it('matches the count of the matched range of map values in a nested context', function () {
            return __awaiter(this, void 0, void 0, function () {
                var key, context;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow', nested: { d: 'orange', e: 'pink', f: 'white', g: 'black' } } })];
                        case 1:
                            key = _a.sent();
                            context = new Context().addMapKey('nested');
                            return [4 /*yield*/, testNoMatch(key, exp.eq(exp.maps.getByValueRange(exp.binMap('tags'), exp.str('white'), exp.str('black'), maps.returnType.COUNT, context), exp.int(4)))];
                        case 2:
                            _a.sent();
                            return [4 /*yield*/, testMatch(key, exp.eq(exp.maps.getByValueRange(exp.binMap('tags'), exp.str('white'), exp.str('black'), maps.returnType.COUNT, context), exp.int(3)))];
                        case 3:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        });
    });
    describe('getByValueRelRankRange', function () {
        it('selects map items nearest to value and greater by relative rank with a count limit', function () {
            return __awaiter(this, void 0, void 0, function () {
                var key;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow' } })];
                        case 1:
                            key = _a.sent();
                            return [4 /*yield*/, testNoMatch(key, exp.eq(exp.maps.getByValueRelRankRange(exp.binMap('tags'), exp.int(2), exp.int(0), exp.str('yellow'), maps.returnType.COUNT), exp.int(0)))];
                        case 2:
                            _a.sent();
                            return [4 /*yield*/, testMatch(key, exp.eq(exp.maps.getByValueRelRankRange(exp.binMap('tags'), exp.int(2), exp.int(0), exp.str('yellow'), maps.returnType.COUNT), exp.int(1)))];
                        case 3:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        });
        it('selects map items nearest to value and greater by relative rank with a count limit in a nested context', function () {
            return __awaiter(this, void 0, void 0, function () {
                var key, context;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow', nested: { d: 'orange', e: 'pink', f: 'white', g: 'black' } } })];
                        case 1:
                            key = _a.sent();
                            context = new Context().addMapKey('nested');
                            return [4 /*yield*/, testNoMatch(key, exp.eq(exp.maps.getByValueRelRankRange(exp.binMap('tags'), exp.int(2), exp.int(0), exp.str('pink'), maps.returnType.COUNT, context), exp.int(0)))];
                        case 2:
                            _a.sent();
                            return [4 /*yield*/, testMatch(key, exp.eq(exp.maps.getByValueRelRankRange(exp.binMap('tags'), exp.int(2), exp.int(0), exp.str('pink'), maps.returnType.COUNT, context), exp.int(2)))];
                        case 3:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        });
    });
    describe('getByValueRelRankRangeToEnd', function () {
        it('selects map items nearest to value and greater by relative rank', function () {
            return __awaiter(this, void 0, void 0, function () {
                var key;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow' } })];
                        case 1:
                            key = _a.sent();
                            return [4 /*yield*/, testNoMatch(key, exp.eq(exp.maps.getByValueRelRankRangeToEnd(exp.binMap('tags'), exp.int(0), exp.str('yellow'), maps.returnType.COUNT), exp.int(0)))];
                        case 2:
                            _a.sent();
                            return [4 /*yield*/, testMatch(key, exp.eq(exp.maps.getByValueRelRankRangeToEnd(exp.binMap('tags'), exp.int(0), exp.str('yellow'), maps.returnType.COUNT), exp.int(1)))];
                        case 3:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        });
        it('selects map items nearest to value and greater by relative rank in a nested context', function () {
            return __awaiter(this, void 0, void 0, function () {
                var key, context;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow', nested: { d: 'orange', e: 'pink', f: 'white', g: 'black' } } })];
                        case 1:
                            key = _a.sent();
                            context = new Context().addMapKey('nested');
                            return [4 /*yield*/, testNoMatch(key, exp.eq(exp.maps.getByValueRelRankRangeToEnd(exp.binMap('tags'), exp.int(0), exp.str('orange'), maps.returnType.COUNT, context), exp.int(0)))];
                        case 2:
                            _a.sent();
                            return [4 /*yield*/, testMatch(key, exp.eq(exp.maps.getByValueRelRankRangeToEnd(exp.binMap('tags'), exp.int(0), exp.str('orange'), maps.returnType.COUNT, context), exp.int(3)))];
                        case 3:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        });
    });
    describe('putItems', function () {
        it('writes map values to a specified map', function () {
            return __awaiter(this, void 0, void 0, function () {
                var key, ops, result;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, createRecord({ map: { c: 1, b: 2, a: 3 }, map2: { f: 1, e: 2, d: 3 } })];
                        case 1:
                            key = _a.sent();
                            ops = [
                                exp.operations.write('map', exp.maps.putItems(exp.binMap('map'), exp.binMap('map2')), 0),
                                op.read('map')
                            ];
                            return [4 /*yield*/, client.operate(key, ops, {})];
                        case 2:
                            result = _a.sent();
                            (0, chai_1.expect)(result.bins.map).to.eql({ a: 3, b: 2, c: 1, d: 3, e: 2, f: 1 });
                            return [2 /*return*/];
                    }
                });
            });
        });
        it('writes map values from exp.map expression to specified map', function () {
            return __awaiter(this, void 0, void 0, function () {
                var key, ops, result;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, createRecord({ map: { c: 1, b: 2, a: 3 } })];
                        case 1:
                            key = _a.sent();
                            ops = [
                                exp.operations.write('map', exp.maps.putItems(exp.binMap('map'), exp.map({ f: 1, e: 2, d: 3 })), 0),
                                op.read('map')
                            ];
                            return [4 /*yield*/, client.operate(key, ops, {})];
                        case 2:
                            result = _a.sent();
                            (0, chai_1.expect)(result.bins.map).to.eql({ a: 3, b: 2, c: 1, d: 3, e: 2, f: 1 });
                            return [2 /*return*/];
                    }
                });
            });
        });
        it('writes map values originating from nested map to a specified map', function () {
            return __awaiter(this, void 0, void 0, function () {
                var key, context, ops, result;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, createRecord({ map: { c: 1, b: 2, a: 3, nested: { g: 4 } }, map2: { f: 1, e: 2, d: 3 } })];
                        case 1:
                            key = _a.sent();
                            context = new Context().addMapKey('nested');
                            ops = [
                                exp.operations.write('map', exp.maps.putItems(exp.binMap('map'), exp.binMap('map2'), null, context), 0),
                                op.read('map')
                            ];
                            return [4 /*yield*/, client.operate(key, ops, {})];
                        case 2:
                            result = _a.sent();
                            (0, chai_1.expect)(result.bins.map.nested).to.eql({ d: 3, e: 2, f: 1, g: 4 });
                            return [2 /*return*/];
                    }
                });
            });
        });
    });
    describe('size', function () {
        it('returns the map size', function () {
            return __awaiter(this, void 0, void 0, function () {
                var key;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, createRecord({ map: { john: 42, malcom: 73, susan: 27 } })];
                        case 1:
                            key = _a.sent();
                            return [4 /*yield*/, testNoMatch(key, exp.eq(exp.maps.size(exp.binMap('map')), exp.int(2)))];
                        case 2:
                            _a.sent();
                            return [4 /*yield*/, testMatch(key, exp.eq(exp.maps.size(exp.binMap('map')), exp.int(3)))];
                        case 3:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        });
        it('returns the map size from a nested map', function () {
            return __awaiter(this, void 0, void 0, function () {
                var key, context;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, createRecord({ map: { john: 42, malcom: 73, susan: 27, nested: { d: 'orange', e: 'pink', f: 'white', g: 'black' } } })];
                        case 1:
                            key = _a.sent();
                            context = new Context().addMapKey('nested');
                            return [4 /*yield*/, testNoMatch(key, exp.eq(exp.maps.size(exp.binMap('map'), context), exp.int(2)))];
                        case 2:
                            _a.sent();
                            return [4 /*yield*/, testMatch(key, exp.eq(exp.maps.size(exp.binMap('map'), context), exp.int(4)))];
                        case 3:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        });
    });
});
