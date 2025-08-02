// *****************************************************************************
// Copyright 2021-2023 Aerospike, Inc.
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
var op = aerospike_1.default.operations;
var maps = aerospike_1.default.maps;
var GeoJSON = aerospike_1.default.GeoJSON;
var FILTERED_OUT = aerospike_1.default.status.FILTERED_OUT;
var helper = require("./test_helper");
var keygen = helper.keygen;
var tempBin = 'ExpVar';
describe('Aerospike.exp', function () {
    helper.skipUnlessVersion('>= 5.0.0', this);
    var client = helper.client;
    var orderMap = function (key, binName, order, ctx) {
        var policy = new aerospike_1.default.MapPolicy({ order: order });
        var setMapPolicy = aerospike_1.default.maps.setPolicy(binName, policy);
        if (ctx)
            setMapPolicy.withContext(ctx);
        return client.operate(key, [setMapPolicy]);
    };
    var orderByKey = function (key, binName, ctx) { return orderMap(key, binName, aerospike_1.default.maps.order.KEY_ORDERED, ctx); };
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
    describe('comparison expressions', function () {
        describe('eq on int bin', function () {
            it('evaluates to true if an integer bin equals the given value', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ intVal: 42 })];
                            case 1:
                                key = _a.sent();
                                return [4 /*yield*/, testNoMatch(key, exp.eq(exp.binInt('intVal'), exp.int(37)))];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, testMatch(key, exp.eq(exp.binInt('intVal'), exp.int(42)))];
                            case 3:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
        describe('eq on bool bin', function () {
            it('evaluates to true if an integer bin equals the given value', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ boolVal: true })];
                            case 1:
                                key = _a.sent();
                                return [4 /*yield*/, testNoMatch(key, exp.eq(exp.binBool('boolVal'), exp.bool(false)))];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, testMatch(key, exp.eq(exp.binBool('boolVal'), exp.bool(true)))];
                            case 3:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
        describe('eq on map bin', function () {
            helper.skipUnlessVersion('>= 6.3.0', this);
            it('evaluates to true if a map bin matches a value', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ map: { c: 1, b: 2, a: 3 } })];
                            case 1:
                                key = _a.sent();
                                return [4 /*yield*/, orderByKey(key, 'map')];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, testNoMatch(key, exp.eq(exp.map({ d: 4, e: 5 }), exp.binMap('map')))];
                            case 3:
                                _a.sent();
                                return [4 /*yield*/, testMatch(key, exp.eq(exp.map({ c: 1, b: 2, a: 3 }), exp.binMap('map')))];
                            case 4:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                });
            });
            it('evaluates to true if a map bin matches a map bin', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ map: { c: 1, b: 2, a: 3 }, map2: { c: 1, b: 2, a: 3 }, map3: { c: 1, b: 2 } })];
                            case 1:
                                key = _a.sent();
                                return [4 /*yield*/, orderByKey(key, 'map')];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, testNoMatch(key, exp.eq(exp.binMap('map'), exp.binMap('map3')))];
                            case 3:
                                _a.sent();
                                return [4 /*yield*/, testMatch(key, exp.eq(exp.binMap('map'), exp.binMap('map2')))];
                            case 4:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
        describe('eq on list bin', function () {
            helper.skipUnlessVersion('>= 6.3.0', this);
            it('evaluates to true if a list bin matches a value', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ list: [4, 2, 0] })];
                            case 1:
                                key = _a.sent();
                                return [4 /*yield*/, orderByKey(key, 'map')];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, testNoMatch(key, exp.eq(exp.list([0, 2, 4]), exp.binList('list')))];
                            case 3:
                                _a.sent();
                                return [4 /*yield*/, testMatch(key, exp.eq(exp.list([4, 2, 0]), exp.binList('list')))];
                            case 4:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                });
            });
            it('evaluates to true if a list bin matches a list bin', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ list: [4, 2, 0], list2: [4, 2, 0], list3: [4, 2] })];
                            case 1:
                                key = _a.sent();
                                return [4 /*yield*/, orderByKey(key, 'map')];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, testNoMatch(key, exp.eq(exp.binList('list'), exp.binList('list3')))];
                            case 3:
                                _a.sent();
                                return [4 /*yield*/, testMatch(key, exp.eq(exp.binList('list'), exp.binList('list2')))];
                            case 4:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
        describe('eq on blob bin', function () {
            it('evaluates to true if a blob bin matches a value', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ blob: Buffer.from([1, 2, 3]) })];
                            case 1:
                                key = _a.sent();
                                return [4 /*yield*/, testNoMatch(key, exp.eq(exp.binBlob('blob'), exp.bytes(Buffer.from([4, 5, 6]))))];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, testMatch(key, exp.eq(exp.binBlob('blob'), exp.bytes(Buffer.from([1, 2, 3]))))];
                            case 3:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
        describe('ne on int bin', function () {
            it('evaluates to true if an integer bin does not equal the given value', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ intVal: 42 })];
                            case 1:
                                key = _a.sent();
                                return [4 /*yield*/, testNoMatch(key, exp.ne(exp.binInt('intVal'), exp.int(42)))];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, testMatch(key, exp.ne(exp.binInt('intVal'), exp.int(37)))];
                            case 3:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
        describe('gt on float bin', function () {
            it('evaluates to true if a float bin value is greater than the given value', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ pi: Math.PI })];
                            case 1:
                                key = _a.sent();
                                return [4 /*yield*/, testNoMatch(key, exp.gt(exp.binFloat('pi'), exp.float(4.5678)))];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, testMatch(key, exp.gt(exp.binFloat('pi'), exp.float(1.2345)))];
                            case 3:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
        describe('regex - regular expression comparisons', function () {
            it('matches a string value with a regular expression', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ title: 'Star Wars' })];
                            case 1:
                                key = _a.sent();
                                return [4 /*yield*/, testNoMatch(key, exp.cmpRegex(0, 'Treck$', exp.binStr('title')))];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, testMatch(key, exp.cmpRegex(0, '^Star', exp.binStr('title')))];
                            case 3:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                });
            });
            it('matches a string value with a regular expression - case insensitive', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ title: 'Star Wars' })];
                            case 1:
                                key = _a.sent();
                                return [4 /*yield*/, testNoMatch(key, exp.cmpRegex(aerospike_1.default.regex.ICASE, 'trEcK$', exp.binStr('title')))];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, testMatch(key, exp.cmpRegex(aerospike_1.default.regex.ICASE, '^sTaR', exp.binStr('title')))];
                            case 3:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
        describe('geo - geospatial comparisons', function () {
            it('matches if the point is contained within the region', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, circle1, circle2;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ location: new GeoJSON.Point(103.913, 1.308) })];
                            case 1:
                                key = _a.sent();
                                circle1 = new GeoJSON.Circle(9.78, 53.55, 50000);
                                circle2 = new GeoJSON.Circle(103.875, 1.297, 10000);
                                return [4 /*yield*/, testNoMatch(key, exp.cmpGeo(exp.binGeo('location'), exp.geo(circle1)))];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, testMatch(key, exp.cmpGeo(exp.binGeo('location'), exp.geo(circle2)))];
                            case 3:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                });
            });
            it('matches if the region contains the point', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, circle1, circle2;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ location: new GeoJSON.Point(103.913, 1.308) })];
                            case 1:
                                key = _a.sent();
                                circle1 = new GeoJSON.Circle(9.78, 53.55, 50000);
                                circle2 = new GeoJSON.Circle(103.875, 1.297, 10000);
                                return [4 /*yield*/, testNoMatch(key, exp.cmpGeo(exp.geo(circle1), exp.binGeo('location')))];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, testMatch(key, exp.cmpGeo(exp.geo(circle2), exp.binGeo('location')))];
                            case 3:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
    });
    describe('binExists', function () {
        it('evaluates to true if the bin with the given name exists', function () {
            return __awaiter(this, void 0, void 0, function () {
                var key;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, createRecord({ foo: 'bar' })];
                        case 1:
                            key = _a.sent();
                            return [4 /*yield*/, testNoMatch(key, exp.binExists('fox'))];
                        case 2:
                            _a.sent();
                            return [4 /*yield*/, testMatch(key, exp.binExists('foo'))];
                        case 3:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        });
    });
    describe('ttl', function () {
        helper.skipUnlessSupportsTtl(this);
        it('evaluates to true if the record ttl matches expectations', function () {
            return __awaiter(this, void 0, void 0, function () {
                var key;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, createRecord({ foo: 'bar' }, { ttl: 1000 })];
                        case 1:
                            key = _a.sent();
                            return [4 /*yield*/, testNoMatch(key, exp.eq(exp.ttl(), exp.int(0)))];
                        case 2:
                            _a.sent();
                            return [4 /*yield*/, testMatch(key, exp.gt(exp.ttl(), exp.int(0)))];
                        case 3:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        });
    });
    describe('voidTime', function () {
        helper.skipUnlessSupportsTtl(this);
        it('evaluates to true if the record void time matches expectations', function () {
            return __awaiter(this, void 0, void 0, function () {
                var key, now;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, createRecord({ foo: 'bar' }, { ttl: 1000 })];
                        case 1:
                            key = _a.sent();
                            now = Date.now() * 1000000 // nanoseconds
                            ;
                            return [4 /*yield*/, testNoMatch(key, exp.lt(exp.voidTime(), exp.int(now)))];
                        case 2:
                            _a.sent();
                            return [4 /*yield*/, testMatch(key, exp.gt(exp.voidTime(), exp.int(now)))];
                        case 3:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        });
    });
    describe('not', function () {
        it('evaluates to true if the expression evaluates to false', function () {
            return __awaiter(this, void 0, void 0, function () {
                var key;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, createRecord({ a: 1, b: 2, c: 3 })];
                        case 1:
                            key = _a.sent();
                            return [4 /*yield*/, testNoMatch(key, exp.not(exp.binExists('a')))];
                        case 2:
                            _a.sent();
                            return [4 /*yield*/, testMatch(key, exp.not(exp.binExists('d')))];
                        case 3:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        });
    });
    describe('and', function () {
        it('evaluates to true if all expressions evaluate to true', function () {
            return __awaiter(this, void 0, void 0, function () {
                var key;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, createRecord({ a: 1, b: 2, c: 3 })];
                        case 1:
                            key = _a.sent();
                            return [4 /*yield*/, testNoMatch(key, exp.and(exp.binExists('a'), exp.binExists('d')))];
                        case 2:
                            _a.sent();
                            return [4 /*yield*/, testMatch(key, exp.and(exp.binExists('a'), exp.binExists('b')))];
                        case 3:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        });
    });
    describe('or', function () {
        it('evaluates to true if any expression evaluates to true', function () {
            return __awaiter(this, void 0, void 0, function () {
                var key;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, createRecord({ a: 1, b: 2, c: 3 })];
                        case 1:
                            key = _a.sent();
                            return [4 /*yield*/, testNoMatch(key, exp.or(exp.binExists('d'), exp.binExists('e')))];
                        case 2:
                            _a.sent();
                            return [4 /*yield*/, testMatch(key, exp.or(exp.binExists('a'), exp.binExists('d')))];
                        case 3:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        });
    });
    describe('nil', function () {
        it('evaluates to true if any expression evaluates to true', function () {
            return __awaiter(this, void 0, void 0, function () {
                var key;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow' } })];
                        case 1:
                            key = _a.sent();
                            return [4 /*yield*/, testNoMatch(key, exp.eq(exp.maps.getByValueRange(exp.binMap('tags'), exp.str('green'), exp.nil(), maps.returnType.COUNT), exp.int(2)))];
                        case 2:
                            _a.sent();
                            return [4 /*yield*/, testMatch(key, exp.eq(exp.maps.getByValueRange(exp.binMap('tags'), exp.str('green'), exp.nil(), maps.returnType.COUNT), exp.int(1)))];
                        case 3:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        });
    });
    describe('inf', function () {
        it('evaluates to true if any expression evaluates to true', function () {
            return __awaiter(this, void 0, void 0, function () {
                var key;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow' } })];
                        case 1:
                            key = _a.sent();
                            return [4 /*yield*/, testNoMatch(key, exp.eq(exp.maps.getByValueRange(exp.binMap('tags'), exp.inf(), exp.str('green'), maps.returnType.COUNT), exp.int(1)))];
                        case 2:
                            _a.sent();
                            return [4 /*yield*/, testMatch(key, exp.eq(exp.maps.getByValueRange(exp.binMap('tags'), exp.inf(), exp.str('green'), maps.returnType.COUNT), exp.int(2)))];
                        case 3:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        });
    });
    describe('recordSize', function () {
        helper.skipUnlessVersion('>= 7.0.0', this);
        it('evaluates to true if any expression evaluates to true', function () {
            return __awaiter(this, void 0, void 0, function () {
                var key;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow' } })];
                        case 1:
                            key = _a.sent();
                            return [4 /*yield*/, testNoMatch(key, exp.eq(exp.recordSize(), exp.int(1)))];
                        case 2:
                            _a.sent();
                            return [4 /*yield*/, testMatch(key, exp.gt(exp.recordSize(), exp.int(64)))];
                        case 3:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        });
        it('evaluates to true if any expression evaluates to true', function () {
            return __awaiter(this, void 0, void 0, function () {
                var key;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, createRecord({ tags: { a: '123456789', b: 'green', c: 'yellow' } })];
                        case 1:
                            key = _a.sent();
                            return [4 /*yield*/, testNoMatch(key, exp.eq(exp.recordSize(), exp.int(1)))];
                        case 2:
                            _a.sent();
                            return [4 /*yield*/, testMatch(key, exp.gt(exp.recordSize(), exp.int(64)))];
                        case 3:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        });
    });
    describe('wildcard', function () {
        it('evaluates to true if any expression evaluates to true', function () {
            return __awaiter(this, void 0, void 0, function () {
                var key;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow' } })];
                        case 1:
                            key = _a.sent();
                            return [4 /*yield*/, testNoMatch(key, exp.eq(exp.maps.getByValueRange(exp.binMap('tags'), exp.inf(), exp.wildcard(), maps.returnType.COUNT), exp.int(2)))];
                        case 2:
                            _a.sent();
                            return [4 /*yield*/, testMatch(key, exp.eq(exp.maps.getByValueRange(exp.binMap('tags'), exp.inf(), exp.wildcard(), maps.returnType.COUNT), exp.int(3)))];
                        case 3:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        });
    });
    describe('expWriteFlags', function () {
        it('write flags have correct value', function () {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    (0, chai_1.expect)(exp.expWriteFlags).to.have.property('DEFAULT', 0);
                    (0, chai_1.expect)(exp.expWriteFlags).to.have.property('CREATE_ONLY', 1);
                    (0, chai_1.expect)(exp.expWriteFlags).to.have.property('UPDATE_ONLY', 2);
                    (0, chai_1.expect)(exp.expWriteFlags).to.have.property('ALLOW_DELETE', 4);
                    (0, chai_1.expect)(exp.expWriteFlags).to.have.property('POLICY_NO_FAIL', 8);
                    (0, chai_1.expect)(exp.expWriteFlags).to.have.property('EVAL_NO_FAIL', 16);
                    return [2 /*return*/];
                });
            });
        });
    });
    describe('expReadFlags', function () {
        it('read flags have correct value', function () {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    (0, chai_1.expect)(exp.expReadFlags).to.have.property('DEFAULT', 0);
                    (0, chai_1.expect)(exp.expReadFlags).to.have.property('EVAL_NO_FAIL', 16);
                    return [2 /*return*/];
                });
            });
        });
    });
    describe('arithmetic expressions', function () {
        describe('int bin add expression', function () {
            it('evaluates exp_read op to true if temp bin equals the sum of bin and given value', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, ops, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ intVal: 2 })];
                            case 1:
                                key = _a.sent();
                                ops = [
                                    exp.operations.read(tempBin, exp.add(exp.binInt('intVal'), exp.binInt('intVal')), exp.expWriteFlags.DEFAULT),
                                    op.read('intVal')
                                ];
                                return [4 /*yield*/, client.operate(key, ops, {})
                                    // console.log(result)
                                ];
                            case 2:
                                result = _a.sent();
                                // console.log(result)
                                (0, chai_1.expect)(result.bins.intVal).to.eql(2);
                                (0, chai_1.expect)(result.bins.ExpVar).to.eql(4);
                                return [2 /*return*/];
                        }
                    });
                });
            });
            it('evaluates exp_write op to true if bin equals the sum of bin and given value', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, ops, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ intVal: 2 })];
                            case 1:
                                key = _a.sent();
                                ops = [
                                    exp.operations.write('intVal', exp.add(exp.binInt('intVal'), exp.binInt('intVal')), exp.expWriteFlags.DEFAULT),
                                    op.read('intVal')
                                ];
                                return [4 /*yield*/, client.operate(key, ops, {})
                                    // console.log(result)
                                ];
                            case 2:
                                result = _a.sent();
                                // console.log(result)
                                (0, chai_1.expect)(result.bins.intVal).to.eql(4);
                                return [2 /*return*/];
                        }
                    });
                });
            });
            it('evaluates exp_read op to true if temp bin equals the sum of bin and given value', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, ops, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, createRecord({ intVal: 2 })];
                            case 1:
                                key = _a.sent();
                                ops = [
                                    exp.operations.read(tempBin, exp.add(exp.binInt('intVal'), exp.binInt('intVal')), exp.expWriteFlags.DEFAULT),
                                    op.read('intVal')
                                ];
                                return [4 /*yield*/, client.operate(key, ops, {})
                                    // console.log(result)
                                ];
                            case 2:
                                result = _a.sent();
                                // console.log(result)
                                (0, chai_1.expect)(result.bins.intVal).to.eql(2);
                                (0, chai_1.expect)(result.bins.ExpVar).to.eql(4);
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
    });
});
