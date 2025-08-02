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
var status = aerospike_1.default.status;
describe('MRT API Tests', function () {
    helper.skipUnlessMRT(this);
    context('Test the MRT specific API', function () {
        var client = helper.client;
        it('Reaps completed transactions', function () {
            return __awaiter(this, void 0, void 0, function () {
                var i, mrt, pool;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            i = 0;
                            _a.label = 1;
                        case 1:
                            if (!(i < 129)) return [3 /*break*/, 4];
                            mrt = new aerospike_1.default.Transaction();
                            return [4 /*yield*/, client.abort(mrt)];
                        case 2:
                            _a.sent();
                            _a.label = 3;
                        case 3:
                            i++;
                            return [3 /*break*/, 1];
                        case 4:
                            pool = aerospike_1._transactionPool;
                            (0, chai_1.expect)(pool.getLength()).to.be.lessThan(10);
                            return [2 /*return*/];
                    }
                });
            });
        });
        it('should initialize a transaction', function () {
            return __awaiter(this, void 0, void 0, function () {
                var mrt, id, timeout, state, inDoubt;
                return __generator(this, function (_a) {
                    mrt = new aerospike_1.default.Transaction();
                    id = mrt.getId();
                    (0, chai_1.expect)(id).to.be.a('number');
                    timeout = mrt.getTimeout();
                    (0, chai_1.expect)(timeout).to.be.a('number');
                    state = mrt.getState();
                    (0, chai_1.expect)(state).to.be.a('number');
                    inDoubt = mrt.getInDoubt();
                    (0, chai_1.expect)(state).to.be.a('number');
                    return [2 /*return*/];
                });
            });
        });
        context('transaction getters', function () {
            it('transaction.getId before and after transaction completion', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var mrt, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                mrt = new aerospike_1.default.Transaction();
                                (0, chai_1.expect)(mrt.getId()).to.be.a('number');
                                return [4 /*yield*/, client.abort(mrt)];
                            case 1:
                                result = _a.sent();
                                (0, chai_1.expect)(mrt.getId()).to.be.a('number');
                                return [2 /*return*/];
                        }
                    });
                });
            });
            it('transaction.getInDoubt before and after transaction completion', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var mrt, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                mrt = new aerospike_1.default.Transaction();
                                (0, chai_1.expect)(mrt.getInDoubt()).to.be.a('boolean');
                                return [4 /*yield*/, client.abort(mrt)];
                            case 1:
                                result = _a.sent();
                                (0, chai_1.expect)(mrt.getInDoubt()).to.be.a('boolean');
                                return [2 /*return*/];
                        }
                    });
                });
            });
            it('transaction.getTimeout before and after transaction completion', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var mrt, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                mrt = new aerospike_1.default.Transaction();
                                (0, chai_1.expect)(mrt.getTimeout()).to.be.a('number');
                                return [4 /*yield*/, client.abort(mrt)];
                            case 1:
                                result = _a.sent();
                                (0, chai_1.expect)(mrt.getTimeout()).to.be.a('number');
                                return [2 /*return*/];
                        }
                    });
                });
            });
            it('transaction.getState before and after transaction completion', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var mrt, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                mrt = new aerospike_1.default.Transaction();
                                (0, chai_1.expect)(mrt.getState()).to.be.a('number');
                                return [4 /*yield*/, client.abort(mrt)];
                            case 1:
                                result = _a.sent();
                                (0, chai_1.expect)(mrt.getState()).to.be.a('number');
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
        context('transaction.abortStatus', function () {
            it('OK', function () {
                return __awaiter(this, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        (0, chai_1.expect)(aerospike_1.default.Transaction.abortStatus.OK).to.equal(0);
                        return [2 /*return*/];
                    });
                });
            });
            it('ALREADY_ABORTED', function () {
                return __awaiter(this, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        (0, chai_1.expect)(aerospike_1.default.Transaction.abortStatus.ALREADY_ABORTED).to.equal(1);
                        return [2 /*return*/];
                    });
                });
            });
            it('ROLL_BACK_ABANDONED', function () {
                return __awaiter(this, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        (0, chai_1.expect)(aerospike_1.default.Transaction.abortStatus.ROLL_BACK_ABANDONED).to.equal(3);
                        return [2 /*return*/];
                    });
                });
            });
            it('CLOSE_ABANDONED', function () {
                return __awaiter(this, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        (0, chai_1.expect)(aerospike_1.default.Transaction.abortStatus.CLOSE_ABANDONED).to.equal(4);
                        return [2 /*return*/];
                    });
                });
            });
        });
        context('transaction.commitStatus', function () {
            it('OK', function () {
                return __awaiter(this, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        (0, chai_1.expect)(aerospike_1.default.Transaction.commitStatus.OK).to.equal(0);
                        return [2 /*return*/];
                    });
                });
            });
            it('ALREADY_COMMITTED', function () {
                return __awaiter(this, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        (0, chai_1.expect)(aerospike_1.default.Transaction.commitStatus.ALREADY_COMMITTED).to.equal(1);
                        return [2 /*return*/];
                    });
                });
            });
            it('VERIFY_FAILED', function () {
                return __awaiter(this, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        (0, chai_1.expect)(aerospike_1.default.Transaction.commitStatus.VERIFY_FAILED).to.equal(3);
                        return [2 /*return*/];
                    });
                });
            });
            it('MARK_ROLL_FORWARD_ABANDONED', function () {
                return __awaiter(this, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        (0, chai_1.expect)(aerospike_1.default.Transaction.commitStatus.MARK_ROLL_FORWARD_ABANDONED).to.equal(4);
                        return [2 /*return*/];
                    });
                });
            });
            it('ROLL_FORWARD_ABANDONED', function () {
                return __awaiter(this, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        (0, chai_1.expect)(aerospike_1.default.Transaction.commitStatus.ROLL_FORWARD_ABANDONED).to.equal(5);
                        return [2 /*return*/];
                    });
                });
            });
            it('CLOSE_ABANDONED', function () {
                return __awaiter(this, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        (0, chai_1.expect)(aerospike_1.default.Transaction.commitStatus.CLOSE_ABANDONED).to.equal(6);
                        return [2 /*return*/];
                    });
                });
            });
        });
        it('should fail with readsCapacity error string', function () {
            (0, chai_1.expect)(function () { return new aerospike_1.default.Transaction("256", 256); }).to.throw('Must specify a number for readsCapacity');
        });
        it('should fail with writesCapacity error string', function () {
            (0, chai_1.expect)(function () { return new aerospike_1.default.Transaction(256, "256"); }).to.throw('Must specify a number for writesCapacity');
        });
        it('should fail with readsCapacity range error string', function () {
            (0, chai_1.expect)(function () { return new aerospike_1.default.Transaction(Math.pow(2, 32), 256); }).to.throw('readsCapacity is out of uint32 range');
        });
        it('should fail with writesCapacity range error string', function () {
            (0, chai_1.expect)(function () { return new aerospike_1.default.Transaction(256, Math.pow(2, 32)); }).to.throw('writesCapacity is out of uint32 range');
        });
        it('should fail with readsCapacity and writesCapacity range error string', function () {
            (0, chai_1.expect)(function () { return new aerospike_1.default.Transaction(Math.pow(2, 32), Math.pow(2, 32)); }).to.throw('both readsCapacity and writesCapacity are out of uint32 range');
        });
        it('Should fail an abort with no arguments', function () {
            return __awaiter(this, void 0, void 0, function () {
                var result, error_1;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, client.abort()];
                        case 1:
                            result = _a.sent();
                            return [3 /*break*/, 3];
                        case 2:
                            error_1 = _a.sent();
                            return [2 /*return*/];
                        case 3:
                            chai_1.assert.fail('An error should have been caught');
                            return [2 /*return*/];
                    }
                });
            });
        });
        it('Should fail an commit with no arguments', function () {
            return __awaiter(this, void 0, void 0, function () {
                var result, error_2;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, client.commit()];
                        case 1:
                            result = _a.sent();
                            return [3 /*break*/, 3];
                        case 2:
                            error_2 = _a.sent();
                            return [2 /*return*/];
                        case 3:
                            chai_1.assert.fail('An error should have been caught');
                            return [2 /*return*/];
                    }
                });
            });
        });
        it('Should fail an abort with incorrect arguments', function () {
            return __awaiter(this, void 0, void 0, function () {
                var result, error_3;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, client.abort("random_string")];
                        case 1:
                            result = _a.sent();
                            return [3 /*break*/, 3];
                        case 2:
                            error_3 = _a.sent();
                            (0, chai_1.expect)(error_3.code).to.eql(aerospike_1.default.status.ERR_CLIENT);
                            return [2 /*return*/];
                        case 3:
                            chai_1.assert.fail('An error should have been caught');
                            return [2 /*return*/];
                    }
                });
            });
        });
        it('Should fail an commit with incorrect arguments', function () {
            return __awaiter(this, void 0, void 0, function () {
                var result, error_4;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, client.commit("random_string")];
                        case 1:
                            result = _a.sent();
                            return [3 /*break*/, 3];
                        case 2:
                            error_4 = _a.sent();
                            (0, chai_1.expect)(error_4.code).to.eql(aerospike_1.default.status.ERR_CLIENT);
                            return [2 /*return*/];
                        case 3:
                            chai_1.assert.fail('An error should have been caught');
                            return [2 /*return*/];
                    }
                });
            });
        });
        it('Hits the capacity limit', function () {
            return __awaiter(this, void 0, void 0, function () {
                var mrt, i;
                return __generator(this, function (_a) {
                    mrt = new aerospike_1.default.Transaction(4096, 4096);
                    try {
                        for (i = 0; i < 150; i++) {
                            new aerospike_1.default.Transaction(4096, 4096);
                        }
                        chai_1.assert.fail('An error should have been caught');
                    }
                    catch (error) {
                        (0, chai_1.expect)(error.message).to.eql("Maximum capacity for Multi-record transactions has been reached. Avoid setting readsCapacity and writesCapacity too high, and abort/commit open transactions so memory can be cleaned up and reused.");
                        mrt.destroyAll();
                    }
                    try {
                        client.abort(mrt);
                        chai_1.assert.fail('An error should have been caught');
                    }
                    catch (error) {
                        (0, chai_1.expect)(error.message).to.eql("The object has been destroyed, please create a new transaction.");
                    }
                    mrt = new aerospike_1.default.Transaction(4096, 4096);
                    return [2 /*return*/];
                });
            });
        });
        it('Expands the pool size', function () {
            return __awaiter(this, void 0, void 0, function () {
                var i, mrt, pool;
                return __generator(this, function (_a) {
                    for (i = 0; i < 150; i++) {
                        mrt = new aerospike_1.default.Transaction();
                    }
                    pool = aerospike_1._transactionPool;
                    pool.tendTransactions();
                    (0, chai_1.expect)(pool.getLength()).to.be.greaterThan(140);
                    (0, chai_1.expect)(pool.getCapacity()).to.eql(256);
                    return [2 /*return*/];
                });
            });
        });
    });
});
