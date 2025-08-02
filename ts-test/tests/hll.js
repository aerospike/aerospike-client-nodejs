// *****************************************************************************
// Copyright 2020-2023 Aerospike, Inc.
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
var hll = aerospike_1.default.hll;
var status = aerospike_1.default.status;
var _a = require('./util/statefulAsyncTest'), assertError = _a.assertError, assertRecordEql = _a.assertRecordEql, assertResultEql = _a.assertResultEql, assertResultSatisfy = _a.assertResultSatisfy, cleanup = _a.cleanup, createRecord = _a.createRecord, expectError = _a.expectError, initState = _a.initState, operate = _a.operate;
var isDouble = function (number) { return typeof number === 'number' && parseInt(number, 10) !== number; };
describe('client.operate() - HyperLogLog operations', function () {
    helper.skipUnlessVersion('>= 4.9.0', this);
    // HLL object representing the set ('jaguar', 'leopard', 'lion', 'tiger')
    // with an index bit size of 8, and minhash bit size of 0.
    var hllCats = Buffer.from([0, 8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 16, 0, 0, 0, 0,
        0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    describe('hll.init', function () {
        it('initializes a HLL bin value', function () {
            return initState()
                .then(createRecord({ foo: 'bar' }))
                .then(operate([
                hll.init('hll', 10),
                hll.describe('hll')
            ]))
                .then(assertResultEql({ hll: [10, 0] }))
                .then(cleanup());
        });
        it('initializes a HLL bin value with minhash bits', function () {
            return initState()
                .then(createRecord({ foo: 'bar' }))
                .then(operate([
                hll.init('hll', 10, 6),
                hll.describe('hll')
            ]))
                .then(assertResultEql({ hll: [10, 6] }))
                .then(cleanup());
        });
        it('re-initializes an existing HLL bin', function () {
            return initState()
                .then(createRecord({ foo: 'bar' }))
                .then(operate(hll.add('hll', ['tiger', 'leopard'], 10)))
                .then(operate([
                hll.init('hll', 12, 4),
                hll.describe('hll')
            ]))
                .then(assertResultEql({ hll: [12, 4] }))
                .then(cleanup());
        });
        context('with HLL policy', function () {
            context('with create-only write flag', function () {
                var policy = {
                    writeFlags: hll.writeFlags.CREATE_ONLY
                };
                it('returns an error if the bin already exists', function () {
                    return initState()
                        .then(createRecord({ foo: 'bar' }))
                        .then(operate(hll.add('hll', ['tiger'], 8)))
                        .then(expectError())
                        .then(operate(hll.init('hll', 10).withPolicy(policy)))
                        .then(assertError(status.ERR_BIN_EXISTS))
                        .then(cleanup());
                });
                context('with no-fail write flag', function () {
                    var policy = {
                        writeFlags: hll.writeFlags.CREATE_ONLY | hll.writeFlags.NO_FAIL
                    };
                    it('does not re-initialize the bin', function () {
                        return initState()
                            .then(createRecord({ foo: 'bar' }))
                            .then(operate(hll.add('hll', ['tiger', 'cheetah'], 8)))
                            .then(operate(hll.init('hll', 12).withPolicy(policy)))
                            .then(operate(hll.getCount('hll')))
                            .then(assertResultEql({ hll: 2 }))
                            .then(cleanup());
                    });
                });
            });
            context('with update-only write flag', function () {
                var policy = {
                    writeFlags: hll.writeFlags.UPDATE_ONLY
                };
                it('returns an error if the bin does not yet exist', function () {
                    return initState()
                        .then(createRecord({ foo: 'bar' }))
                        .then(expectError())
                        .then(operate(hll.init('hll', 10, 6).withPolicy(policy)))
                        .then(assertError(status.ERR_BIN_NOT_FOUND))
                        .then(cleanup());
                });
                context('with no-fail write flag', function () {
                    var policy = {
                        writeFlags: hll.writeFlags.UPDATE_ONLY | hll.writeFlags.NO_FAIL
                    };
                    it('does not initialize the bin', function () {
                        return initState()
                            .then(createRecord({ foo: 'bar' }))
                            .then(operate(hll.init('hll', 10, 6).withPolicy(policy)))
                            .then(assertRecordEql({ foo: 'bar' }))
                            .then(cleanup());
                    });
                });
            });
        });
    });
    describe('hll.add', function () {
        it('initializes a new HLL value if it does not exist', function () {
            return initState()
                .then(createRecord({ foo: 'bar' }))
                .then(operate(hll.add('hll', ['jaguar', 'tiger', 'tiger', 'leopard', 'lion', 'jaguar'], 8)))
                .then(assertResultEql({ hll: 4 }))
                .then(assertRecordEql({ hll: hllCats, foo: 'bar' }))
                .then(cleanup());
        });
        it('returns an error if the bin is of wrong type', function () {
            return initState()
                .then(createRecord({ hll: 'not a HLL set' }))
                .then(expectError())
                .then(operate(hll.add('hll', ['jaguar', 'tiger', 'tiger', 'leopard', 'lion', 'jaguar'], 8)))
                .then(assertError(status.ERR_BIN_INCOMPATIBLE_TYPE))
                .then(cleanup());
        });
        context('with HLL policy', function () {
            context('with create-only write flag', function () {
                var policy = {
                    writeFlags: hll.writeFlags.CREATE_ONLY
                };
                it('returns an error if bin already exist', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            return [2 /*return*/, initState()
                                    .then(createRecord({ foo: 'bar' }))
                                    .then(operate(hll.init('hll', 12)))
                                    .then(expectError())
                                    .then(operate(hll.add('hll', ['tiger', 'tiger', 'leopard'], 8).withPolicy(policy)))
                                    .then(assertError(status.ERR_BIN_EXISTS))
                                    .then(cleanup())];
                        });
                    });
                });
                context('with no-fail write flag', function () {
                    var policy = {
                        writeFlags: hll.writeFlags.CREATE_ONLY | hll.writeFlags.NO_FAIL
                    };
                    it('does not update the bin if it already exists', function () {
                        return __awaiter(this, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                return [2 /*return*/, initState()
                                        .then(createRecord({ foo: 'bar' }))
                                        .then(operate(hll.add('hll', ['tiger', 'lion'], 8)))
                                        .then(operate(hll.add('hll', ['tiger', 'leopard', 'cheetah'], 8).withPolicy(policy)))
                                        .then(operate(hll.getCount('hll')))
                                        .then(assertResultEql({ hll: 2 }))
                                        .then(cleanup())];
                            });
                        });
                    });
                });
            });
        });
    });
    describe('hll.setUnion', function () {
        it('sets a union of the HLL objects with the HLL bin', function () {
            return initState()
                .then(createRecord({ foo: 'bar' }))
                .then(operate([
                hll.add('hll', ['tiger', 'lynx', 'cheetah', 'tiger'], 8),
                hll.setUnion('hll', [hllCats]),
                hll.getCount('hll')
            ]))
                .then(assertResultEql({ hll: 6 }))
                .then(cleanup());
        });
        it('returns an error if the index bit count does not match', function () {
            return initState()
                .then(createRecord({ foo: 'bar' }))
                .then(expectError())
                .then(operate([
                hll.add('hll', ['tiger', 'lynx', 'cheetah', 'tiger'], 12),
                hll.setUnion('hll', [hllCats]) // index bit size = 8
            ]))
                .then(assertError(status.ERR_OP_NOT_APPLICABLE))
                .then(cleanup());
        });
        context('with HLL policy', function () {
            context('with create-only write flag', function () {
                var policy = {
                    writeFlags: hll.writeFlags.CREATE_ONLY
                };
                it('returns an error if the bin already exists', function () {
                    return initState()
                        .then(createRecord({ foo: 'bar' }))
                        .then(expectError())
                        .then(operate([
                        hll.add('hll', ['tiger', 'lynx', 'cheetah', 'tiger'], 8),
                        hll.setUnion('hll', [hllCats]).withPolicy(policy)
                    ]))
                        .then(assertError(status.ERR_BIN_EXISTS))
                        .then(cleanup());
                });
                context('with no-fail write flag', function () {
                    var policy = {
                        writeFlags: hll.writeFlags.CREATE_ONLY | hll.writeFlags.NO_FAIL
                    };
                    it('does not update the bin', function () {
                        return initState()
                            .then(createRecord({ foo: 'bar' }))
                            .then(operate([
                            hll.add('hll', ['tiger'], 8),
                            hll.setUnion('hll', [hllCats]).withPolicy(policy),
                            hll.getCount('hll')
                        ]))
                            .then(assertResultEql({ hll: 1 }))
                            .then(cleanup());
                    });
                });
            });
            context('with update-only write flag', function () {
                var policy = {
                    writeFlags: hll.writeFlags.UPDATE_ONLY
                };
                it('returns an error if the bin does not exist', function () {
                    return initState()
                        .then(createRecord({ foo: 'bar' }))
                        .then(expectError())
                        .then(operate(hll.setUnion('hll', [hllCats]).withPolicy(policy)))
                        .then(assertError(status.ERR_BIN_NOT_FOUND))
                        .then(cleanup());
                });
                context('with no-fail write flag', function () {
                    var policy = {
                        writeFlags: hll.writeFlags.UPDATE_ONLY | hll.writeFlags.NO_FAIL
                    };
                    it('does not create the bin', function () {
                        return initState()
                            .then(createRecord({ foo: 'bar' }))
                            .then(operate(hll.setUnion('hll', [hllCats]).withPolicy(policy)))
                            .then(assertRecordEql({ foo: 'bar' }))
                            .then(cleanup());
                    });
                });
            });
            context('with allow-fold write flag', function () {
                var policy = {
                    writeFlags: hll.writeFlags.ALLOW_FOLD
                };
                it('folds the result to the lowest index bit size', function () {
                    return initState()
                        .then(createRecord({ foo: 'bar' }))
                        .then(operate([
                        hll.add('hll', ['tiger', 'lynx', 'cheetah', 'tiger'], 12),
                        hll.setUnion('hll', [hllCats]).withPolicy(policy), // index bit size = 8
                        hll.describe('hll')
                    ]))
                        .then(assertResultEql({ hll: [8, 0] }))
                        .then(cleanup());
                });
            });
        });
    });
    describe('hll.refreshCount', function () {
        it('updates and then returns the cached count', function () {
            return initState()
                .then(createRecord({ foo: 'bar' }))
                .then(operate([
                hll.add('hll', ['tiger', 'lynx', 'cheetah', 'tiger'], 8),
                hll.add('hll', ['lion', 'tiger', 'puma', 'puma']),
                hll.fold('hll', 6),
                hll.refreshCount('hll')
            ]))
                .then(assertResultEql({ hll: 5 }))
                .then(cleanup());
        });
    });
    describe('hll.fold', function () {
        it('folds the index bit count to the specified value', function () {
            return initState()
                .then(createRecord({ foo: 'bar' }))
                .then(operate([
                hll.init('hll', 16),
                hll.fold('hll', 8),
                hll.describe('hll')
            ]))
                .then(assertResultEql({ hll: [8, 0] }))
                .then(cleanup());
        });
        it('returns an error if the minhash count is not zero', function () {
            return initState()
                .then(createRecord({ foo: 'bar' }))
                .then(expectError())
                .then(operate([
                hll.init('hll', 16, 8),
                hll.fold('hll', 8)
            ]))
                .then(assertError(status.ERR_OP_NOT_APPLICABLE))
                .then(cleanup());
        });
    });
    describe('hll.getCount', function () {
        it('returns the estimated number of elements in the bin', function () {
            return initState()
                .then(createRecord({ foo: 'bar' }))
                .then(operate([
                hll.add('hll', ['leopard', 'tiger', 'tiger', 'jaguar'], 8),
                hll.getCount('hll')
            ]))
                .then(assertResultEql({ hll: 3 }))
                .then(cleanup());
        });
    });
    describe('hll.getUnion', function () {
        it('returns the union of the HLL objects with the HLL bin', function () {
            return initState()
                .then(createRecord({ foo: 'bar' }))
                .then(operate([
                hll.add('hll', ['leopard', 'lynx', 'tiger', 'tiger', 'cheetah', 'lynx'], 8),
                hll.getUnion('hll', [hllCats])
            ]))
                .then(assertResultSatisfy(function (_a) {
                var hll = _a.hll;
                return Buffer.isBuffer(hll);
            }))
                .then(cleanup());
        });
    });
    describe('hll.getUnionCount', function () {
        it('returns the element count of the union of the HLL objects with the HLL bin', function () {
            return initState()
                .then(createRecord({ foo: 'bar' }))
                .then(operate([
                hll.add('hll', ['leopard', 'lynx', 'tiger', 'tiger', 'cheetah', 'lynx'], 8),
                hll.getUnionCount('hll', [hllCats])
            ]))
                .then(assertResultEql(({ hll: 6 })))
                .then(cleanup());
        });
    });
    describe('hll.getIntersectCount', function () {
        it('returns the element count of the intersection of the HLL objects with the HLL bin', function () {
            return initState()
                .then(createRecord({ foo: 'bar' }))
                .then(operate([
                hll.add('hll', ['leopard', 'lynx', 'tiger', 'tiger', 'cheetah', 'lynx'], 8),
                hll.getIntersectCount('hll', [hllCats])
            ]))
                .then(assertResultEql(({ hll: 2 })))
                .then(cleanup());
        });
    });
    describe('hll.getSimilarity', function () {
        it('returns the similarity of the HLL objects', function () {
            return initState()
                .then(createRecord({ foo: 'bar' }))
                .then(operate([
                hll.add('hll', ['leopard', 'lynx', 'tiger', 'tiger', 'cheetah', 'lynx'], 8),
                hll.getSimilarity('hll', [hllCats])
            ]))
                .then(assertResultSatisfy(function (_a) {
                var hll = _a.hll;
                return isDouble(hll);
            }))
                .then(cleanup());
        });
    });
    describe('hll.describe', function () {
        it('returns the index and minhash bit counts', function () {
            return initState()
                .then(createRecord({ foo: 'bar' }))
                .then(operate([
                hll.init('hll', 16, 5),
                hll.describe('hll')
            ]))
                .then(assertResultEql({ hll: [16, 5] }))
                .then(cleanup());
        });
        it('returns the index count, with minhash zero', function () {
            return initState()
                .then(createRecord({ foo: 'bar' }))
                .then(operate([
                hll.init('hll', 16),
                hll.describe('hll')
            ]))
                .then(assertResultEql({ hll: [16, 0] }))
                .then(cleanup());
        });
    });
});
