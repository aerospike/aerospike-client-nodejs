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
/* global expect, describe, it, context */
var aerospike_1 = require("aerospike");
var helper = require("./test_helper");
var chai_1 = require("chai");
function getRandomInt(max) {
    return Math.floor(Math.random() * max);
}
function randomString(num) {
    return getRandomInt(num);
}
function wait(ms) {
    return new Promise(function (resolve) { return setTimeout(resolve, ms); });
}
context('admin commands', function () {
    return __awaiter(this, void 0, void 0, function () {
        var client, randomFactor, waitMs, username1, username2, username3, username4, username5, username6, username7, username8, rolename1, rolename2, rolename3, rolename4, rolename5, policy;
        return __generator(this, function (_a) {
            if (!helper.config.user) {
                return [2 /*return*/];
            }
            client = helper.client;
            randomFactor = 1000000;
            waitMs = 100;
            username1 = 'username' + randomString(getRandomInt(randomFactor));
            username2 = 'username' + randomString(getRandomInt(randomFactor));
            username3 = 'username' + randomString(getRandomInt(randomFactor));
            username4 = 'username' + randomString(getRandomInt(randomFactor));
            username5 = 'username' + randomString(getRandomInt(randomFactor));
            username6 = 'username' + randomString(getRandomInt(randomFactor));
            username7 = 'username' + randomString(getRandomInt(randomFactor));
            username8 = 'username' + randomString(getRandomInt(randomFactor));
            rolename1 = 'rolename' + randomString(getRandomInt(randomFactor));
            rolename2 = 'rolename' + randomString(getRandomInt(randomFactor));
            rolename3 = 'rolename' + randomString(getRandomInt(randomFactor));
            rolename4 = 'rolename' + randomString(getRandomInt(randomFactor));
            rolename5 = 'rolename' + randomString(getRandomInt(randomFactor));
            policy = new aerospike_1.default.AdminPolicy({ timeout: 1000 });
            describe('Client#queryRole()', function () {
                it('query role', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var result;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, client.queryRole('user-admin', null)];
                                case 1:
                                    result = _a.sent();
                                    (0, chai_1.expect)(result).to.have.property('name', 'user-admin');
                                    (0, chai_1.expect)(result).to.have.property('readQuota', 0);
                                    (0, chai_1.expect)(result).to.have.property('writeQuota', 0);
                                    (0, chai_1.expect)(result).to.have.property('whitelist').that.deep.equals([]);
                                    (0, chai_1.expect)(result).to.have.property('privileges');
                                    return [2 /*return*/];
                            }
                        });
                    });
                });
                it('with policy', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var result;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, client.queryRole('truncate', policy)];
                                case 1:
                                    result = _a.sent();
                                    (0, chai_1.expect)(result).to.have.property('name', 'truncate');
                                    (0, chai_1.expect)(result).to.have.property('readQuota', 0);
                                    (0, chai_1.expect)(result).to.have.property('writeQuota', 0);
                                    (0, chai_1.expect)(result).to.have.property('whitelist').that.deep.equals([]);
                                    (0, chai_1.expect)(result).to.have.property('privileges');
                                    return [2 /*return*/];
                            }
                        });
                    });
                });
            });
            describe('Client#queryRoles()', function () {
                it('query roles', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var results;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, client.queryRoles(null)];
                                case 1:
                                    results = _a.sent();
                                    (0, chai_1.expect)(results.length).to.be.above(0);
                                    results.forEach(function (result) {
                                        (0, chai_1.expect)(result).to.have.property('name');
                                        (0, chai_1.expect)(result).to.have.property('readQuota', 0);
                                        (0, chai_1.expect)(result).to.have.property('writeQuota', 0);
                                        (0, chai_1.expect)(result).to.have.property('whitelist').that.is.an('array');
                                        (0, chai_1.expect)(result).to.have.property('privileges');
                                    });
                                    return [2 /*return*/];
                            }
                        });
                    });
                });
                it('with policy', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var results;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, client.queryRoles(policy)];
                                case 1:
                                    results = _a.sent();
                                    (0, chai_1.expect)(results.length).to.be.above(0);
                                    results.forEach(function (result) {
                                        (0, chai_1.expect)(result).to.have.property('name');
                                        (0, chai_1.expect)(result).to.have.property('readQuota', 0);
                                        (0, chai_1.expect)(result).to.have.property('writeQuota', 0);
                                        (0, chai_1.expect)(result).to.have.property('whitelist').that.is.an('array');
                                        (0, chai_1.expect)(result).to.have.property('privileges');
                                    });
                                    return [2 /*return*/];
                            }
                        });
                    });
                });
            });
            describe('Client#createRole()', function () {
                it('Creates role', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var result;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, client.createRole(rolename1, [new aerospike_1.default.admin.Privilege(aerospike_1.default.privilegeCode.SINDEX_ADMIN)], null)];
                                case 1:
                                    _a.sent();
                                    return [4 /*yield*/, wait(waitMs)];
                                case 2:
                                    _a.sent();
                                    return [4 /*yield*/, client.queryRole(rolename1, null)];
                                case 3:
                                    result = _a.sent();
                                    (0, chai_1.expect)(result).to.have.property('name', rolename1);
                                    (0, chai_1.expect)(result).to.have.property('readQuota', 0);
                                    (0, chai_1.expect)(result).to.have.property('writeQuota', 0);
                                    (0, chai_1.expect)(result).to.have.property('whitelist').that.deep.equals([]);
                                    (0, chai_1.expect)(result).to.have.property('privileges').that.deep.equals([new aerospike_1.default.admin.Privilege(aerospike_1.default.privilegeCode.SINDEX_ADMIN)]);
                                    return [2 /*return*/];
                            }
                        });
                    });
                });
                it('with admin policy', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var result;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, client.createRole(rolename2, [new aerospike_1.default.admin.Privilege(aerospike_1.default.privilegeCode.READ)], policy)];
                                case 1:
                                    _a.sent();
                                    return [4 /*yield*/, wait(waitMs)];
                                case 2:
                                    _a.sent();
                                    return [4 /*yield*/, client.queryRole(rolename2, null)];
                                case 3:
                                    result = _a.sent();
                                    (0, chai_1.expect)(result).to.have.property('name', rolename2);
                                    (0, chai_1.expect)(result).to.have.property('readQuota', 0);
                                    (0, chai_1.expect)(result).to.have.property('writeQuota', 0);
                                    (0, chai_1.expect)(result).to.have.property('whitelist').that.deep.equals([]);
                                    (0, chai_1.expect)(result).to.have.property('privileges').that.deep.equals([new aerospike_1.default.admin.Privilege(aerospike_1.default.privilegeCode.READ)]);
                                    return [2 /*return*/];
                            }
                        });
                    });
                });
                it('With multiple privilegeCodes', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var result;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, client.createRole(rolename3, [new aerospike_1.default.admin.Privilege(aerospike_1.default.privilegeCode.SINDEX_ADMIN), new aerospike_1.default.admin.Privilege(aerospike_1.default.privilegeCode.READ_WRITE_UDF), new aerospike_1.default.admin.Privilege(aerospike_1.default.privilegeCode.WRITE)], null)];
                                case 1: return [4 /*yield*/, _a.sent()];
                                case 2:
                                    _a.sent();
                                    return [4 /*yield*/, wait(waitMs)];
                                case 3:
                                    _a.sent();
                                    return [4 /*yield*/, client.queryRole(rolename3, null)];
                                case 4:
                                    result = _a.sent();
                                    (0, chai_1.expect)(result).to.have.property('name', rolename3);
                                    (0, chai_1.expect)(result).to.have.property('readQuota', 0);
                                    (0, chai_1.expect)(result).to.have.property('writeQuota', 0);
                                    (0, chai_1.expect)(result).to.have.property('whitelist').that.deep.equals([]);
                                    (0, chai_1.expect)(result).to.have.property('privileges').that.deep.equals([new aerospike_1.default.admin.Privilege(aerospike_1.default.privilegeCode.SINDEX_ADMIN), new aerospike_1.default.admin.Privilege(aerospike_1.default.privilegeCode.READ_WRITE_UDF), new aerospike_1.default.admin.Privilege(aerospike_1.default.privilegeCode.WRITE)]);
                                    return [2 /*return*/];
                            }
                        });
                    });
                });
            });
            describe('Client#grantPrivileges()', function () {
                it('grants privilege to role', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var result;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, client.grantPrivileges(rolename1, [new aerospike_1.default.admin.Privilege(aerospike_1.default.privilegeCode.READ_WRITE)], null)];
                                case 1:
                                    _a.sent();
                                    return [4 /*yield*/, wait(waitMs)];
                                case 2:
                                    _a.sent();
                                    return [4 /*yield*/, client.queryRole(rolename1, null)];
                                case 3:
                                    result = _a.sent();
                                    (0, chai_1.expect)(result).to.have.property('name', rolename1);
                                    (0, chai_1.expect)(result).to.have.property('readQuota', 0);
                                    (0, chai_1.expect)(result).to.have.property('writeQuota', 0);
                                    (0, chai_1.expect)(result).to.have.property('whitelist').that.deep.equals([]);
                                    (0, chai_1.expect)(result).to.have.property('privileges').that.deep.equals([new aerospike_1.default.admin.Privilege(aerospike_1.default.privilegeCode.SINDEX_ADMIN), new aerospike_1.default.admin.Privilege(aerospike_1.default.privilegeCode.READ_WRITE)]);
                                    return [2 /*return*/];
                            }
                        });
                    });
                });
                it('with admin policy', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var result;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, client.grantPrivileges(rolename2, [new aerospike_1.default.admin.Privilege(aerospike_1.default.privilegeCode.TRUNCATE)], policy)];
                                case 1:
                                    _a.sent();
                                    return [4 /*yield*/, wait(waitMs)];
                                case 2:
                                    _a.sent();
                                    return [4 /*yield*/, client.queryRole(rolename2, null)];
                                case 3: return [4 /*yield*/, _a.sent()];
                                case 4:
                                    result = _a.sent();
                                    (0, chai_1.expect)(result).to.have.property('name', rolename2);
                                    (0, chai_1.expect)(result).to.have.property('readQuota', 0);
                                    (0, chai_1.expect)(result).to.have.property('writeQuota', 0);
                                    (0, chai_1.expect)(result).to.have.property('whitelist').that.deep.equals([]);
                                    (0, chai_1.expect)(result).to.have.property('privileges').that.deep.equals([new aerospike_1.default.admin.Privilege(aerospike_1.default.privilegeCode.READ), new aerospike_1.default.admin.Privilege(aerospike_1.default.privilegeCode.TRUNCATE)]);
                                    return [2 /*return*/];
                            }
                        });
                    });
                });
                it('with multiple privileges', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var result, i;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, client.grantPrivileges(rolename3, [new aerospike_1.default.admin.Privilege(aerospike_1.default.privilegeCode.READ), new aerospike_1.default.admin.Privilege(aerospike_1.default.privilegeCode.TRUNCATE)], policy)];
                                case 1:
                                    _a.sent();
                                    return [4 /*yield*/, wait(waitMs)];
                                case 2:
                                    _a.sent();
                                    return [4 /*yield*/, client.queryRole(rolename3, null)];
                                case 3: return [4 /*yield*/, _a.sent()];
                                case 4:
                                    result = _a.sent();
                                    (0, chai_1.expect)(result).to.have.property('name', rolename3);
                                    (0, chai_1.expect)(result).to.have.property('readQuota', 0);
                                    (0, chai_1.expect)(result).to.have.property('writeQuota', 0);
                                    (0, chai_1.expect)(result).to.have.property('whitelist').that.deep.equals([]);
                                    (0, chai_1.expect)(result).to.have.property('privileges').that.is.an('array');
                                    (0, chai_1.expect)(result.privileges).to.have.length(5);
                                    for (i = 0; i < 5; i++) {
                                        (0, chai_1.expect)(result.privileges[i]).to.have.property('code').that.is.a('number');
                                        (0, chai_1.expect)(result.privileges[i]).to.have.property('namespace').that.is.a('string');
                                        (0, chai_1.expect)(result.privileges[i]).to.have.property('set').that.is.a('string');
                                    }
                                    return [2 /*return*/];
                            }
                        });
                    });
                });
            });
            describe('Client#revokePrivileges()', function () {
                it('Revokes privilege from role', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var result;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, client.revokePrivileges(rolename1, [new aerospike_1.default.admin.Privilege(aerospike_1.default.privilegeCode.SINDEX_ADMIN)])];
                                case 1:
                                    _a.sent();
                                    return [4 /*yield*/, wait(waitMs)];
                                case 2:
                                    _a.sent();
                                    return [4 /*yield*/, client.queryRole(rolename1, null)];
                                case 3: return [4 /*yield*/, _a.sent()];
                                case 4:
                                    result = _a.sent();
                                    (0, chai_1.expect)(result).to.have.property('name', rolename1);
                                    (0, chai_1.expect)(result).to.have.property('readQuota', 0);
                                    (0, chai_1.expect)(result).to.have.property('writeQuota', 0);
                                    (0, chai_1.expect)(result).to.have.property('whitelist').that.deep.equals([]);
                                    (0, chai_1.expect)(result).to.have.property('privileges').that.deep.equals([new aerospike_1.default.admin.Privilege(aerospike_1.default.privilegeCode.READ_WRITE)]);
                                    return [2 /*return*/];
                            }
                        });
                    });
                });
                it('With admin policy', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var result;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, client.revokePrivileges(rolename2, [new aerospike_1.default.admin.Privilege(aerospike_1.default.privilegeCode.READ)], policy)];
                                case 1:
                                    _a.sent();
                                    return [4 /*yield*/, wait(waitMs)];
                                case 2:
                                    _a.sent();
                                    return [4 /*yield*/, client.queryRole(rolename2, null)];
                                case 3: return [4 /*yield*/, _a.sent()];
                                case 4:
                                    result = _a.sent();
                                    (0, chai_1.expect)(result).to.have.property('name', rolename2);
                                    (0, chai_1.expect)(result).to.have.property('readQuota', 0);
                                    (0, chai_1.expect)(result).to.have.property('writeQuota', 0);
                                    (0, chai_1.expect)(result).to.have.property('whitelist').that.deep.equals([]);
                                    (0, chai_1.expect)(result).to.have.property('privileges').that.deep.equals([new aerospike_1.default.admin.Privilege(aerospike_1.default.privilegeCode.TRUNCATE)]);
                                    return [2 /*return*/];
                            }
                        });
                    });
                });
                it('With mutliple privileges', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var result;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, client.revokePrivileges(rolename3, [new aerospike_1.default.admin.Privilege(aerospike_1.default.privilegeCode.READ), new aerospike_1.default.admin.Privilege(aerospike_1.default.privilegeCode.TRUNCATE)], policy)];
                                case 1:
                                    _a.sent();
                                    return [4 /*yield*/, wait(waitMs)];
                                case 2:
                                    _a.sent();
                                    return [4 /*yield*/, client.queryRole(rolename3, null)];
                                case 3: return [4 /*yield*/, _a.sent()];
                                case 4:
                                    result = _a.sent();
                                    (0, chai_1.expect)(result).to.have.property('name', rolename3);
                                    (0, chai_1.expect)(result).to.have.property('readQuota', 0);
                                    (0, chai_1.expect)(result).to.have.property('writeQuota', 0);
                                    (0, chai_1.expect)(result).to.have.property('whitelist').that.deep.equals([]);
                                    (0, chai_1.expect)(result).to.have.property('privileges').that.deep.equals([new aerospike_1.default.admin.Privilege(aerospike_1.default.privilegeCode.SINDEX_ADMIN), new aerospike_1.default.admin.Privilege(aerospike_1.default.privilegeCode.READ_WRITE_UDF), new aerospike_1.default.admin.Privilege(aerospike_1.default.privilegeCode.WRITE)]);
                                    return [2 /*return*/];
                            }
                        });
                    });
                });
            });
            describe('Client#queryUser()', function () {
                it('Queries user', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var result;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, client.queryUser('admin', null)];
                                case 1:
                                    result = _a.sent();
                                    (0, chai_1.expect)(result).to.have.property('name', 'admin');
                                    (0, chai_1.expect)(result).to.have.property('readInfo').that.deep.equals([0, 0, 0, 0]);
                                    (0, chai_1.expect)(result).to.have.property('writeInfo').that.deep.equals([0, 0, 0, 0]);
                                    (0, chai_1.expect)(result.connsInUse).to.be.a('number');
                                    (0, chai_1.expect)(result).to.have.property('roles').that.deep.equals(['user-admin']);
                                    return [2 /*return*/];
                            }
                        });
                    });
                });
                it('with policy', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var result;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, client.queryUser('admin', policy)];
                                case 1:
                                    result = _a.sent();
                                    (0, chai_1.expect)(result).to.have.property('name', 'admin');
                                    (0, chai_1.expect)(result).to.have.property('readInfo').that.deep.equals([0, 0, 0, 0]);
                                    (0, chai_1.expect)(result).to.have.property('writeInfo').that.deep.equals([0, 0, 0, 0]);
                                    (0, chai_1.expect)(result.connsInUse).to.be.a('number');
                                    (0, chai_1.expect)(result).to.have.property('roles').that.deep.equals(['user-admin']);
                                    return [2 /*return*/];
                            }
                        });
                    });
                });
            });
            describe('Client#queryUsers()', function () {
                it('Queries users', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var results;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, client.queryUsers(null)];
                                case 1:
                                    results = _a.sent();
                                    results.forEach(function (result) {
                                        (0, chai_1.expect)(result).to.have.property('name').that.is.a('string');
                                        (0, chai_1.expect)(result).to.have.property('readInfo').that.is.an('array');
                                        (0, chai_1.expect)(result).to.have.property('writeInfo').that.is.an('array');
                                        (0, chai_1.expect)(result.connsInUse).to.be.a('number');
                                        (0, chai_1.expect)(result).to.have.property('roles').that.is.an('array');
                                    });
                                    return [2 /*return*/];
                            }
                        });
                    });
                });
                it('With policy', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var results;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, client.queryUsers(policy)];
                                case 1:
                                    results = _a.sent();
                                    results.forEach(function (result) {
                                        (0, chai_1.expect)(result).to.have.property('name').that.is.a('string');
                                        (0, chai_1.expect)(result).to.have.property('readInfo').that.is.an('array');
                                        (0, chai_1.expect)(result).to.have.property('writeInfo').that.is.an('array');
                                        (0, chai_1.expect)(result.connsInUse).to.be.a('number');
                                        (0, chai_1.expect)(result).to.have.property('roles').that.is.an('array');
                                    });
                                    return [2 /*return*/];
                            }
                        });
                    });
                });
            });
            describe('Client#createUser()', function () {
                it('Creates user', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var result;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, client.createUser(username1, 'password')];
                                case 1:
                                    _a.sent();
                                    return [4 /*yield*/, wait(waitMs)];
                                case 2:
                                    _a.sent();
                                    return [4 /*yield*/, client.queryUser(username1, null)];
                                case 3:
                                    result = _a.sent();
                                    (0, chai_1.expect)(result).to.have.property('name', username1);
                                    (0, chai_1.expect)(result).to.have.property('readInfo').that.deep.equals([0, 0, 0, 0]);
                                    (0, chai_1.expect)(result).to.have.property('writeInfo').that.deep.equals([0, 0, 0, 0]);
                                    (0, chai_1.expect)(result.connsInUse).to.be.a('number');
                                    (0, chai_1.expect)(result).to.have.property('roles').that.deep.equals([]);
                                    return [2 /*return*/];
                            }
                        });
                    });
                });
                it('With policy', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var result;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, client.createUser(username2, 'password', null, policy)];
                                case 1:
                                    _a.sent();
                                    return [4 /*yield*/, wait(waitMs)];
                                case 2:
                                    _a.sent();
                                    return [4 /*yield*/, client.queryUser(username2, null)];
                                case 3:
                                    result = _a.sent();
                                    (0, chai_1.expect)(result).to.have.property('name', username2);
                                    (0, chai_1.expect)(result).to.have.property('readInfo').that.deep.equals([0, 0, 0, 0]);
                                    (0, chai_1.expect)(result).to.have.property('writeInfo').that.deep.equals([0, 0, 0, 0]);
                                    (0, chai_1.expect)(result.connsInUse).to.be.a('number');
                                    (0, chai_1.expect)(result).to.have.property('roles').that.deep.equals([]);
                                    return [2 /*return*/];
                            }
                        });
                    });
                });
                it('With role', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var result;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, client.createUser(username3, 'password', [rolename1])];
                                case 1:
                                    _a.sent();
                                    return [4 /*yield*/, wait(waitMs)];
                                case 2:
                                    _a.sent();
                                    return [4 /*yield*/, client.queryUser(username3, null)];
                                case 3:
                                    result = _a.sent();
                                    (0, chai_1.expect)(result).to.have.property('name', username3);
                                    (0, chai_1.expect)(result).to.have.property('readInfo').that.deep.equals([0, 0, 0, 0]);
                                    (0, chai_1.expect)(result).to.have.property('writeInfo').that.deep.equals([0, 0, 0, 0]);
                                    (0, chai_1.expect)(result.connsInUse).to.be.a('number');
                                    (0, chai_1.expect)(result).to.have.property('roles').that.deep.equals([rolename1]);
                                    return [2 /*return*/];
                            }
                        });
                    });
                });
                it('With multiple roles', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var result;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, client.createUser(username4, 'password', [rolename1, rolename2, rolename3])];
                                case 1:
                                    _a.sent();
                                    return [4 /*yield*/, wait(waitMs)];
                                case 2:
                                    _a.sent();
                                    return [4 /*yield*/, client.queryUser(username4, null)];
                                case 3:
                                    result = _a.sent();
                                    (0, chai_1.expect)(result).to.have.property('name', username4);
                                    (0, chai_1.expect)(result).to.have.property('readInfo').that.deep.equals([0, 0, 0, 0]);
                                    (0, chai_1.expect)(result).to.have.property('writeInfo').that.deep.equals([0, 0, 0, 0]);
                                    (0, chai_1.expect)(result).to.have.property('connsInUse', 0);
                                    (0, chai_1.expect)(result).to.have.property('roles').that.has.members([rolename1, rolename2, rolename3]);
                                    return [2 /*return*/];
                            }
                        });
                    });
                });
            });
            describe('Client#createPKIUser()', function () {
                it('Creates user', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var result;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, client.createPKIUser(username5)];
                                case 1:
                                    _a.sent();
                                    return [4 /*yield*/, wait(waitMs)];
                                case 2:
                                    _a.sent();
                                    return [4 /*yield*/, client.queryUser(username5, null)];
                                case 3:
                                    result = _a.sent();
                                    (0, chai_1.expect)(result).to.have.property('name', username5);
                                    (0, chai_1.expect)(result).to.have.property('readInfo').that.deep.equals([0, 0, 0, 0]);
                                    (0, chai_1.expect)(result).to.have.property('writeInfo').that.deep.equals([0, 0, 0, 0]);
                                    (0, chai_1.expect)(result.connsInUse).to.be.a('number');
                                    (0, chai_1.expect)(result).to.have.property('roles').that.deep.equals([]);
                                    return [2 /*return*/];
                            }
                        });
                    });
                });
                it('With policy', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var result;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, client.createPKIUser(username6, null, policy)];
                                case 1:
                                    _a.sent();
                                    return [4 /*yield*/, wait(waitMs)];
                                case 2:
                                    _a.sent();
                                    return [4 /*yield*/, client.queryUser(username6, null)];
                                case 3:
                                    result = _a.sent();
                                    (0, chai_1.expect)(result).to.have.property('name', username6);
                                    (0, chai_1.expect)(result).to.have.property('readInfo').that.deep.equals([0, 0, 0, 0]);
                                    (0, chai_1.expect)(result).to.have.property('writeInfo').that.deep.equals([0, 0, 0, 0]);
                                    (0, chai_1.expect)(result.connsInUse).to.be.a('number');
                                    (0, chai_1.expect)(result).to.have.property('roles').that.deep.equals([]);
                                    return [2 /*return*/];
                            }
                        });
                    });
                });
                it('With role', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var result;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, client.createPKIUser(username7, [rolename1])];
                                case 1:
                                    _a.sent();
                                    return [4 /*yield*/, wait(waitMs)];
                                case 2:
                                    _a.sent();
                                    return [4 /*yield*/, client.queryUser(username7, null)];
                                case 3:
                                    result = _a.sent();
                                    (0, chai_1.expect)(result).to.have.property('name', username7);
                                    (0, chai_1.expect)(result).to.have.property('readInfo').that.deep.equals([0, 0, 0, 0]);
                                    (0, chai_1.expect)(result).to.have.property('writeInfo').that.deep.equals([0, 0, 0, 0]);
                                    (0, chai_1.expect)(result.connsInUse).to.be.a('number');
                                    (0, chai_1.expect)(result).to.have.property('roles').that.deep.equals([rolename1]);
                                    return [2 /*return*/];
                            }
                        });
                    });
                });
                it('With multiple roles', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var result;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, client.createPKIUser(username8, [rolename1, rolename2, rolename3])];
                                case 1:
                                    _a.sent();
                                    return [4 /*yield*/, wait(waitMs)];
                                case 2:
                                    _a.sent();
                                    return [4 /*yield*/, client.queryUser(username8, null)];
                                case 3:
                                    result = _a.sent();
                                    (0, chai_1.expect)(result).to.have.property('name', username8);
                                    (0, chai_1.expect)(result).to.have.property('readInfo').that.deep.equals([0, 0, 0, 0]);
                                    (0, chai_1.expect)(result).to.have.property('writeInfo').that.deep.equals([0, 0, 0, 0]);
                                    (0, chai_1.expect)(result).to.have.property('connsInUse', 0);
                                    (0, chai_1.expect)(result).to.have.property('roles').that.has.members([rolename1, rolename2, rolename3]);
                                    return [2 /*return*/];
                            }
                        });
                    });
                });
            });
            describe('Client#grantRoles()', function () {
                it('grants role to user', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var result;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, client.grantRoles(username1, [rolename1], null)];
                                case 1:
                                    _a.sent();
                                    return [4 /*yield*/, wait(waitMs)];
                                case 2:
                                    _a.sent();
                                    return [4 /*yield*/, client.queryUser(username1, null)];
                                case 3:
                                    result = _a.sent();
                                    (0, chai_1.expect)(result).to.have.property('name', username1);
                                    (0, chai_1.expect)(result).to.have.property('readInfo').that.deep.equals([0, 0, 0, 0]);
                                    (0, chai_1.expect)(result).to.have.property('writeInfo').that.deep.equals([0, 0, 0, 0]);
                                    (0, chai_1.expect)(result.connsInUse).to.be.a('number');
                                    (0, chai_1.expect)(result).to.have.property('roles').that.deep.equals([rolename1]);
                                    return [2 /*return*/];
                            }
                        });
                    });
                });
                it('With policy', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var result;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, client.grantRoles(username2, [rolename2], policy)];
                                case 1:
                                    _a.sent();
                                    return [4 /*yield*/, wait(waitMs)];
                                case 2:
                                    _a.sent();
                                    return [4 /*yield*/, client.queryUser(username2, null)];
                                case 3: return [4 /*yield*/, _a.sent()];
                                case 4:
                                    result = _a.sent();
                                    (0, chai_1.expect)(result).to.have.property('name', username2);
                                    (0, chai_1.expect)(result).to.have.property('readInfo').that.deep.equals([0, 0, 0, 0]);
                                    (0, chai_1.expect)(result).to.have.property('writeInfo').that.deep.equals([0, 0, 0, 0]);
                                    (0, chai_1.expect)(result.connsInUse).to.be.a('number');
                                    (0, chai_1.expect)(result).to.have.property('roles').that.deep.equals([rolename2]);
                                    return [2 /*return*/];
                            }
                        });
                    });
                });
                it('With multiple roles', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var result;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, client.grantRoles(username3, [rolename1, rolename2, rolename3], policy)];
                                case 1:
                                    _a.sent();
                                    return [4 /*yield*/, wait(waitMs)];
                                case 2:
                                    _a.sent();
                                    return [4 /*yield*/, client.queryUser(username3, null)];
                                case 3: return [4 /*yield*/, _a.sent()];
                                case 4:
                                    result = _a.sent();
                                    (0, chai_1.expect)(result).to.have.property('name', username3);
                                    (0, chai_1.expect)(result).to.have.property('readInfo').that.deep.equals([0, 0, 0, 0]);
                                    (0, chai_1.expect)(result).to.have.property('writeInfo').that.deep.equals([0, 0, 0, 0]);
                                    (0, chai_1.expect)(result.connsInUse).to.be.a('number');
                                    (0, chai_1.expect)(result).to.have.property('roles').that.has.members([rolename1, rolename2, rolename3]);
                                    return [2 /*return*/];
                            }
                        });
                    });
                });
            });
            describe('Client#revokeRoles()', function () {
                it('Revokes role from user', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var result;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, client.revokeRoles(username1, [rolename1], null)];
                                case 1:
                                    _a.sent();
                                    return [4 /*yield*/, wait(waitMs)];
                                case 2:
                                    _a.sent();
                                    return [4 /*yield*/, client.queryUser(username1, null)];
                                case 3:
                                    result = _a.sent();
                                    (0, chai_1.expect)(result).to.have.property('name', username1);
                                    (0, chai_1.expect)(result).to.have.property('readInfo').that.deep.equals([0, 0, 0, 0]);
                                    (0, chai_1.expect)(result).to.have.property('writeInfo').that.deep.equals([0, 0, 0, 0]);
                                    (0, chai_1.expect)(result.connsInUse).to.be.a('number');
                                    (0, chai_1.expect)(result).to.have.property('roles').that.deep.equals([]);
                                    return [2 /*return*/];
                            }
                        });
                    });
                });
                it('With policy', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var result;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, client.revokeRoles(username2, [rolename2], policy)];
                                case 1:
                                    _a.sent();
                                    return [4 /*yield*/, wait(waitMs)];
                                case 2:
                                    _a.sent();
                                    return [4 /*yield*/, client.queryUser(username2, null)];
                                case 3:
                                    result = _a.sent();
                                    (0, chai_1.expect)(result).to.have.property('name', username2);
                                    (0, chai_1.expect)(result).to.have.property('readInfo').that.deep.equals([0, 0, 0, 0]);
                                    (0, chai_1.expect)(result).to.have.property('writeInfo').that.deep.equals([0, 0, 0, 0]);
                                    (0, chai_1.expect)(result.connsInUse).to.be.a('number');
                                    (0, chai_1.expect)(result).to.have.property('roles').that.deep.equals([]);
                                    return [2 /*return*/];
                            }
                        });
                    });
                });
                it('With multiple roles', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var result;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, client.revokeRoles(username3, [rolename1, rolename2, rolename3], policy)];
                                case 1:
                                    _a.sent();
                                    return [4 /*yield*/, wait(waitMs)];
                                case 2:
                                    _a.sent();
                                    return [4 /*yield*/, client.queryUser(username3, null)];
                                case 3: return [4 /*yield*/, _a.sent()];
                                case 4:
                                    result = _a.sent();
                                    (0, chai_1.expect)(result).to.have.property('name', username3);
                                    (0, chai_1.expect)(result).to.have.property('readInfo').that.deep.equals([0, 0, 0, 0]);
                                    (0, chai_1.expect)(result).to.have.property('writeInfo').that.deep.equals([0, 0, 0, 0]);
                                    (0, chai_1.expect)(result.connsInUse).to.be.a('number');
                                    (0, chai_1.expect)(result).to.have.property('roles').that.deep.equals([]);
                                    return [2 /*return*/];
                            }
                        });
                    });
                });
            });
            describe('Client#setWhitelist()', function () {
                it('Set whitelist', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var result;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, client.setWhitelist(rolename1, ['192.168.0.0'], null)];
                                case 1:
                                    _a.sent();
                                    return [4 /*yield*/, wait(waitMs)];
                                case 2:
                                    _a.sent();
                                    return [4 /*yield*/, client.queryRole(rolename1, null)];
                                case 3:
                                    result = _a.sent();
                                    (0, chai_1.expect)(result).to.have.property('name', rolename1);
                                    (0, chai_1.expect)(result).to.have.property('readQuota', 0);
                                    (0, chai_1.expect)(result).to.have.property('writeQuota', 0);
                                    (0, chai_1.expect)(result).to.have.property('whitelist').that.deep.equals(['192.168.0.0']);
                                    (0, chai_1.expect)(result).to.have.property('privileges').that.deep.equals([new aerospike_1.default.admin.Privilege(aerospike_1.default.privilegeCode.READ_WRITE)]);
                                    return [2 /*return*/];
                            }
                        });
                    });
                });
                it('With policy', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var result;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, client.setWhitelist(rolename2, ['192.168.0.0'], policy)];
                                case 1:
                                    _a.sent();
                                    return [4 /*yield*/, wait(waitMs)];
                                case 2:
                                    _a.sent();
                                    return [4 /*yield*/, client.queryRole(rolename2, null)];
                                case 3:
                                    result = _a.sent();
                                    (0, chai_1.expect)(result).to.have.property('name', rolename2);
                                    (0, chai_1.expect)(result).to.have.property('readQuota', 0);
                                    (0, chai_1.expect)(result).to.have.property('writeQuota', 0);
                                    (0, chai_1.expect)(result).to.have.property('whitelist').that.deep.equals(['192.168.0.0']);
                                    (0, chai_1.expect)(result).to.have.property('privileges').that.deep.equals([new aerospike_1.default.admin.Privilege(aerospike_1.default.privilegeCode.TRUNCATE)]);
                                    return [2 /*return*/];
                            }
                        });
                    });
                });
                it('With multiple addresses', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var result, i;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, client.setWhitelist(rolename3, ['192.168.0.0', '149.14.182.255'], policy)];
                                case 1:
                                    _a.sent();
                                    return [4 /*yield*/, wait(waitMs)];
                                case 2:
                                    _a.sent();
                                    return [4 /*yield*/, client.queryRole(rolename3, null)];
                                case 3:
                                    result = _a.sent();
                                    (0, chai_1.expect)(result).to.have.property('name', rolename3);
                                    (0, chai_1.expect)(result).to.have.property('readQuota', 0);
                                    (0, chai_1.expect)(result).to.have.property('writeQuota', 0);
                                    (0, chai_1.expect)(result).to.have.property('whitelist').that.deep.equals(['192.168.0.0', '149.14.182.255']);
                                    (0, chai_1.expect)(result).to.have.property('privileges').that.is.an('array');
                                    (0, chai_1.expect)(result.privileges).to.have.length(3);
                                    for (i = 0; i < 3; i++) {
                                        (0, chai_1.expect)(result.privileges[i]).to.have.property('code').that.is.a('number');
                                        (0, chai_1.expect)(result.privileges[i]).to.have.property('namespace').that.is.a('string');
                                        (0, chai_1.expect)(result.privileges[i]).to.have.property('set').that.is.a('string');
                                    }
                                    return [2 /*return*/];
                            }
                        });
                    });
                });
            });
            describe('Client#setQuotas()', function () {
                it('Sets quotas', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var result;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, client.setQuotas(rolename1, 100, 150, null)];
                                case 1:
                                    _a.sent();
                                    return [4 /*yield*/, wait(waitMs)];
                                case 2:
                                    _a.sent();
                                    return [4 /*yield*/, client.queryRole(rolename1, null)];
                                case 3:
                                    result = _a.sent();
                                    (0, chai_1.expect)(result).to.have.property('name', rolename1);
                                    (0, chai_1.expect)(result).to.have.property('readQuota', 100);
                                    (0, chai_1.expect)(result).to.have.property('writeQuota', 150);
                                    (0, chai_1.expect)(result).to.have.property('whitelist').that.deep.equals(['192.168.0.0']);
                                    (0, chai_1.expect)(result).to.have.property('privileges').that.deep.equals([new aerospike_1.default.admin.Privilege(aerospike_1.default.privilegeCode.READ_WRITE)]);
                                    return [2 /*return*/];
                            }
                        });
                    });
                });
                it('With policy', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var result, privilege;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, client.setQuotas(rolename2, 150, 250, policy)];
                                case 1:
                                    _a.sent();
                                    return [4 /*yield*/, wait(waitMs)];
                                case 2:
                                    _a.sent();
                                    return [4 /*yield*/, client.queryRole(rolename2, null)];
                                case 3:
                                    result = _a.sent();
                                    privilege = new aerospike_1.default.admin.Privilege(aerospike_1.default.privilegeCode.TRUNCATE);
                                    (0, chai_1.expect)(result).to.have.property('name', rolename2);
                                    (0, chai_1.expect)(result).to.have.property('readQuota', 150);
                                    (0, chai_1.expect)(result).to.have.property('writeQuota', 250);
                                    (0, chai_1.expect)(result).to.have.property('whitelist').that.deep.equals(['192.168.0.0']);
                                    (0, chai_1.expect)(result).to.have.property('privileges').that.deep.equals([privilege]);
                                    return [2 /*return*/];
                            }
                        });
                    });
                });
            });
            describe('Client#dropRole()', function () {
                it('Drops role', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var error_1;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, client.dropRole(rolename1, null)];
                                case 1:
                                    _a.sent();
                                    return [4 /*yield*/, wait(waitMs)];
                                case 2:
                                    _a.sent();
                                    _a.label = 3;
                                case 3:
                                    _a.trys.push([3, 5, , 6]);
                                    return [4 /*yield*/, client.queryRole(rolename1, policy)
                                        // Should fail, assert failure if error is not returned.
                                    ];
                                case 4:
                                    _a.sent();
                                    // Should fail, assert failure if error is not returned.
                                    (0, chai_1.expect)(1).to.equal(2);
                                    return [3 /*break*/, 6];
                                case 5:
                                    error_1 = _a.sent();
                                    (0, chai_1.expect)(error_1).to.exist.and.have.property('code', aerospike_1.default.status.INVALID_ROLE);
                                    return [3 /*break*/, 6];
                                case 6: return [2 /*return*/];
                            }
                        });
                    });
                });
                it('With policy', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var error_2;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, client.dropRole(rolename2, policy)];
                                case 1:
                                    _a.sent();
                                    return [4 /*yield*/, wait(waitMs)];
                                case 2:
                                    _a.sent();
                                    _a.label = 3;
                                case 3:
                                    _a.trys.push([3, 5, , 6]);
                                    return [4 /*yield*/, client.queryRole(rolename2, policy)
                                        // Should fail, assert failure if error is not returned.
                                    ];
                                case 4:
                                    _a.sent();
                                    // Should fail, assert failure if error is not returned.
                                    (0, chai_1.expect)(1).to.equal(2);
                                    return [3 /*break*/, 6];
                                case 5:
                                    error_2 = _a.sent();
                                    (0, chai_1.expect)(error_2).to.exist.and.have.property('code', aerospike_1.default.status.INVALID_ROLE);
                                    return [3 /*break*/, 6];
                                case 6: return [2 /*return*/];
                            }
                        });
                    });
                });
            });
            describe('Client#setPassword()', function () {
                it('Changes password for user', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var password, config, dummyClient;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    password = 'pass' + randomString(getRandomInt(randomFactor));
                                    return [4 /*yield*/, client.setPassword(username1, password, null)];
                                case 1:
                                    _a.sent();
                                    return [4 /*yield*/, wait(waitMs)];
                                case 2:
                                    _a.sent();
                                    config = {
                                        hosts: helper.config.hosts,
                                        user: username1,
                                        password: password
                                    };
                                    return [4 /*yield*/, aerospike_1.default.connect(config)];
                                case 3:
                                    dummyClient = _a.sent();
                                    return [2 /*return*/, dummyClient.close()];
                            }
                        });
                    });
                });
                it('With policy', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var password, error_3, config, dummyClient;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    password = 'pass' + randomString(getRandomInt(randomFactor));
                                    _a.label = 1;
                                case 1:
                                    _a.trys.push([1, 3, , 4]);
                                    return [4 /*yield*/, client.setPassword(username2, password, policy)];
                                case 2:
                                    _a.sent();
                                    return [3 /*break*/, 4];
                                case 3:
                                    error_3 = _a.sent();
                                    console.log(error_3);
                                    return [3 /*break*/, 4];
                                case 4: return [4 /*yield*/, wait(waitMs)];
                                case 5:
                                    _a.sent();
                                    config = {
                                        hosts: helper.config.hosts,
                                        user: username2,
                                        password: password
                                    };
                                    return [4 /*yield*/, aerospike_1.default.connect(config)];
                                case 6:
                                    dummyClient = _a.sent();
                                    return [2 /*return*/, dummyClient.close()];
                            }
                        });
                    });
                });
            });
            describe('Client#changePassword()', function () {
                it('Changes password for user', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var password, config, dummyClient;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    password = 'pass' + randomString(getRandomInt(randomFactor));
                                    return [4 /*yield*/, client.setPassword(username1, password)];
                                case 1:
                                    _a.sent();
                                    return [4 /*yield*/, client.createRole(rolename4, [new aerospike_1.default.admin.Privilege(aerospike_1.default.privilegeCode.USER_ADMIN)])];
                                case 2:
                                    _a.sent();
                                    return [4 /*yield*/, client.grantRoles(username1, [rolename4])];
                                case 3:
                                    _a.sent();
                                    return [4 /*yield*/, wait(waitMs)];
                                case 4:
                                    _a.sent();
                                    config = {
                                        hosts: helper.config.hosts,
                                        user: username1,
                                        password: password
                                    };
                                    return [4 /*yield*/, aerospike_1.default.connect(config)];
                                case 5:
                                    dummyClient = _a.sent();
                                    password = 'pass' + randomString(getRandomInt(randomFactor));
                                    return [4 /*yield*/, dummyClient.changePassword(username1, password)];
                                case 6:
                                    _a.sent();
                                    return [4 /*yield*/, dummyClient.close()];
                                case 7:
                                    _a.sent();
                                    config = {
                                        hosts: helper.config.hosts,
                                        user: username1,
                                        password: password
                                    };
                                    return [4 /*yield*/, aerospike_1.default.connect(config)];
                                case 8:
                                    dummyClient = _a.sent();
                                    return [4 /*yield*/, dummyClient.close()];
                                case 9:
                                    _a.sent();
                                    return [2 /*return*/];
                            }
                        });
                    });
                });
                it('With policy', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var password, config, dummyClient;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    password = 'pass' + randomString(getRandomInt(randomFactor));
                                    return [4 /*yield*/, client.setPassword(username2, password, null)];
                                case 1:
                                    _a.sent();
                                    return [4 /*yield*/, client.createRole(rolename5, [new aerospike_1.default.admin.Privilege(aerospike_1.default.privilegeCode.USER_ADMIN)])];
                                case 2:
                                    _a.sent();
                                    return [4 /*yield*/, client.grantRoles(username2, [rolename5])];
                                case 3:
                                    _a.sent();
                                    return [4 /*yield*/, wait(waitMs)];
                                case 4:
                                    _a.sent();
                                    config = {
                                        hosts: helper.config.hosts,
                                        user: username2,
                                        password: password
                                    };
                                    return [4 /*yield*/, aerospike_1.default.connect(config)];
                                case 5:
                                    dummyClient = _a.sent();
                                    password = 'pass' + randomString(getRandomInt(randomFactor));
                                    return [4 /*yield*/, dummyClient.changePassword(username2, password, policy)];
                                case 6:
                                    _a.sent();
                                    return [4 /*yield*/, dummyClient.close()];
                                case 7:
                                    _a.sent();
                                    config = {
                                        hosts: helper.config.hosts,
                                        user: username2,
                                        password: password
                                    };
                                    return [4 /*yield*/, aerospike_1.default.connect(config)];
                                case 8:
                                    dummyClient = _a.sent();
                                    return [4 /*yield*/, dummyClient.close()];
                                case 9:
                                    _a.sent();
                                    return [2 /*return*/];
                            }
                        });
                    });
                });
            });
            describe('Client#dropUser()', function () {
                it('Drops user', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var error_4;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, client.dropUser(username1, null)];
                                case 1:
                                    _a.sent();
                                    return [4 /*yield*/, wait(waitMs)];
                                case 2:
                                    _a.sent();
                                    _a.label = 3;
                                case 3:
                                    _a.trys.push([3, 5, , 6]);
                                    return [4 /*yield*/, client.queryUser(username1, policy)
                                        // Should fail, assert failure if error is not returned.
                                    ];
                                case 4:
                                    _a.sent();
                                    // Should fail, assert failure if error is not returned.
                                    (0, chai_1.expect)(1).to.equal(2);
                                    return [3 /*break*/, 6];
                                case 5:
                                    error_4 = _a.sent();
                                    (0, chai_1.expect)(error_4).to.exist.and.have.property('code', aerospike_1.default.status.INVALID_USER);
                                    return [3 /*break*/, 6];
                                case 6: return [2 /*return*/];
                            }
                        });
                    });
                });
                it('With policy', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var error_5;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, client.dropUser(username2, policy)];
                                case 1:
                                    _a.sent();
                                    return [4 /*yield*/, wait(waitMs)];
                                case 2:
                                    _a.sent();
                                    _a.label = 3;
                                case 3:
                                    _a.trys.push([3, 5, , 6]);
                                    return [4 /*yield*/, client.queryUser(username2, policy)
                                        // Should fail, assert failure if error is not returned.
                                    ];
                                case 4:
                                    _a.sent();
                                    // Should fail, assert failure if error is not returned.
                                    (0, chai_1.expect)(1).to.equal(2);
                                    return [3 /*break*/, 6];
                                case 5:
                                    error_5 = _a.sent();
                                    (0, chai_1.expect)(error_5).to.exist.and.have.property('code', aerospike_1.default.status.INVALID_USER);
                                    return [3 /*break*/, 6];
                                case 6: return [2 /*return*/];
                            }
                        });
                    });
                });
            });
            context('Negative tests', function () {
                describe('Client#changePassword()', function () {
                    it('fails with invalid user', function () {
                        return __awaiter(this, void 0, void 0, function () {
                            var error_6;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, 2, , 3]);
                                        return [4 /*yield*/, client.changePassword(7, 'b')
                                            // Should fail, assert failure if error is not returned.
                                        ];
                                    case 1:
                                        _a.sent();
                                        // Should fail, assert failure if error is not returned.
                                        chai_1.assert.fail("AN ERROR SHOULD BE THROWN HERE");
                                        return [3 /*break*/, 3];
                                    case 2:
                                        error_6 = _a.sent();
                                        (0, chai_1.expect)(error_6.message).to.eql("User name must be a string");
                                        (0, chai_1.expect)(error_6 instanceof TypeError).to.eql(true);
                                        return [3 /*break*/, 3];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        });
                    });
                    it('fails with invalid password', function () {
                        return __awaiter(this, void 0, void 0, function () {
                            var error_7;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, 2, , 3]);
                                        return [4 /*yield*/, client.changePassword('a', 11)
                                            // Should fail, assert failure if error is not returned.
                                        ];
                                    case 1:
                                        _a.sent();
                                        // Should fail, assert failure if error is not returned.
                                        chai_1.assert.fail("AN ERROR SHOULD BE THROWN HERE");
                                        return [3 /*break*/, 3];
                                    case 2:
                                        error_7 = _a.sent();
                                        (0, chai_1.expect)(error_7.message).to.eql("Password must be a string");
                                        (0, chai_1.expect)(error_7 instanceof TypeError).to.eql(true);
                                        return [3 /*break*/, 3];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        });
                    });
                    it('fails with invalid policy', function () {
                        return __awaiter(this, void 0, void 0, function () {
                            var error_8;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, 2, , 3]);
                                        return [4 /*yield*/, client.changePassword('a', 'b', 15)
                                            // Should fail, assert failure if error is not returned.
                                        ];
                                    case 1:
                                        _a.sent();
                                        // Should fail, assert failure if error is not returned.
                                        chai_1.assert.fail("AN ERROR SHOULD BE THROWN HERE");
                                        return [3 /*break*/, 3];
                                    case 2:
                                        error_8 = _a.sent();
                                        (0, chai_1.expect)(error_8.message).to.eql("Policy must be an object");
                                        (0, chai_1.expect)(error_8 instanceof TypeError).to.eql(true);
                                        return [3 /*break*/, 3];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        });
                    });
                    it('fails with invalid callback', function () {
                        return __awaiter(this, void 0, void 0, function () {
                            var error_9;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, 2, , 3]);
                                        return [4 /*yield*/, client.changePassword('a', 'b', {}, 19)
                                            // Should fail, assert failure if error is not returned.
                                        ];
                                    case 1:
                                        _a.sent();
                                        // Should fail, assert failure if error is not returned.
                                        chai_1.assert.fail("AN ERROR SHOULD BE THROWN HERE");
                                        return [3 /*break*/, 3];
                                    case 2:
                                        error_9 = _a.sent();
                                        (0, chai_1.expect)(error_9.message).to.eql("this.callback.bind is not a function");
                                        (0, chai_1.expect)(error_9 instanceof TypeError).to.eql(true);
                                        return [3 /*break*/, 3];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        });
                    });
                });
                describe('Client#createUser()', function () {
                    it('fails with invalid user', function () {
                        return __awaiter(this, void 0, void 0, function () {
                            var error_10;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, 2, , 3]);
                                        return [4 /*yield*/, client.createUser(7, 'b')
                                            // Should fail, assert failure if error is not returned.
                                        ];
                                    case 1:
                                        _a.sent();
                                        // Should fail, assert failure if error is not returned.
                                        chai_1.assert.fail("AN ERROR SHOULD BE THROWN HERE");
                                        return [3 /*break*/, 3];
                                    case 2:
                                        error_10 = _a.sent();
                                        (0, chai_1.expect)(error_10.message).to.eql("User name must be a string");
                                        (0, chai_1.expect)(error_10 instanceof TypeError).to.eql(true);
                                        return [3 /*break*/, 3];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        });
                    });
                    it('fails with invalid password', function () {
                        return __awaiter(this, void 0, void 0, function () {
                            var error_11;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, 2, , 3]);
                                        return [4 /*yield*/, client.createUser('a', 11)
                                            // Should fail, assert failure if error is not returned.
                                        ];
                                    case 1:
                                        _a.sent();
                                        // Should fail, assert failure if error is not returned.
                                        chai_1.assert.fail("AN ERROR SHOULD BE THROWN HERE");
                                        return [3 /*break*/, 3];
                                    case 2:
                                        error_11 = _a.sent();
                                        (0, chai_1.expect)(error_11.message).to.eql("Password must be a string");
                                        (0, chai_1.expect)(error_11 instanceof TypeError).to.eql(true);
                                        return [3 /*break*/, 3];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        });
                    });
                    it('fails with invalid roles', function () {
                        return __awaiter(this, void 0, void 0, function () {
                            var error_12;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, 2, , 3]);
                                        return [4 /*yield*/, client.createUser('a', 'b', 15)
                                            // Should fail, assert failure if error is not returned.
                                        ];
                                    case 1:
                                        _a.sent();
                                        // Should fail, assert failure if error is not returned.
                                        chai_1.assert.fail("AN ERROR SHOULD BE THROWN HERE");
                                        return [3 /*break*/, 3];
                                    case 2:
                                        error_12 = _a.sent();
                                        (0, chai_1.expect)(error_12.message).to.eql("roles must be an array");
                                        (0, chai_1.expect)(error_12 instanceof TypeError).to.eql(true);
                                        return [3 /*break*/, 3];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        });
                    });
                    it('fails with roles array with invalid values', function () {
                        return __awaiter(this, void 0, void 0, function () {
                            var error_13;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, 2, , 3]);
                                        return [4 /*yield*/, client.createUser('a', 'b', [15])
                                            // Should fail, assert failure if error is not returned.
                                        ];
                                    case 1:
                                        _a.sent();
                                        // Should fail, assert failure if error is not returned.
                                        chai_1.assert.fail("AN ERROR SHOULD BE THROWN HERE");
                                        return [3 /*break*/, 3];
                                    case 2:
                                        error_13 = _a.sent();
                                        (0, chai_1.expect)(error_13.message).to.eql("Roles object invalid");
                                        (0, chai_1.expect)(error_13.code).to.eql(-2);
                                        return [3 /*break*/, 3];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        });
                    });
                    it('fails with invalid policy', function () {
                        return __awaiter(this, void 0, void 0, function () {
                            var error_14;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, 2, , 3]);
                                        return [4 /*yield*/, client.createUser('a', 'b', [], 19)
                                            // Should fail, assert failure if error is not returned.
                                        ];
                                    case 1:
                                        _a.sent();
                                        // Should fail, assert failure if error is not returned.
                                        chai_1.assert.fail("AN ERROR SHOULD BE THROWN HERE");
                                        return [3 /*break*/, 3];
                                    case 2:
                                        error_14 = _a.sent();
                                        (0, chai_1.expect)(error_14.message).to.eql("Policy must be an object");
                                        (0, chai_1.expect)(error_14 instanceof TypeError).to.eql(true);
                                        return [3 /*break*/, 3];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        });
                    });
                    it('fails with invalid callback', function () {
                        return __awaiter(this, void 0, void 0, function () {
                            var error_15;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, 2, , 3]);
                                        return [4 /*yield*/, client.createUser('a', 'b', [], {}, 26)
                                            // Should fail, assert failure if error is not returned.
                                        ];
                                    case 1:
                                        _a.sent();
                                        // Should fail, assert failure if error is not returned.
                                        chai_1.assert.fail("AN ERROR SHOULD BE THROWN HERE");
                                        return [3 /*break*/, 3];
                                    case 2:
                                        error_15 = _a.sent();
                                        (0, chai_1.expect)(error_15.message).to.eql("this.callback.bind is not a function");
                                        (0, chai_1.expect)(error_15 instanceof TypeError).to.eql(true);
                                        return [3 /*break*/, 3];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        });
                    });
                });
                describe('Client#createPKIUser()', function () {
                    it('fails with invalid user', function () {
                        return __awaiter(this, void 0, void 0, function () {
                            var error_16;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, 2, , 3]);
                                        return [4 /*yield*/, client.createPKIUser(7, [])
                                            // Should fail, assert failure if error is not returned.
                                        ];
                                    case 1:
                                        _a.sent();
                                        // Should fail, assert failure if error is not returned.
                                        chai_1.assert.fail("AN ERROR SHOULD BE THROWN HERE");
                                        return [3 /*break*/, 3];
                                    case 2:
                                        error_16 = _a.sent();
                                        (0, chai_1.expect)(error_16.message).to.eql("User name must be a string");
                                        (0, chai_1.expect)(error_16 instanceof TypeError).to.eql(true);
                                        return [3 /*break*/, 3];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        });
                    });
                    it('fails with invalid roles', function () {
                        return __awaiter(this, void 0, void 0, function () {
                            var error_17;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, 2, , 3]);
                                        return [4 /*yield*/, client.createPKIUser('a', 15)
                                            // Should fail, assert failure if error is not returned.
                                        ];
                                    case 1:
                                        _a.sent();
                                        // Should fail, assert failure if error is not returned.
                                        chai_1.assert.fail("AN ERROR SHOULD BE THROWN HERE");
                                        return [3 /*break*/, 3];
                                    case 2:
                                        error_17 = _a.sent();
                                        (0, chai_1.expect)(error_17.message).to.eql("roles must be an array");
                                        (0, chai_1.expect)(error_17 instanceof TypeError).to.eql(true);
                                        return [3 /*break*/, 3];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        });
                    });
                    it('fails with roles array with invalid values', function () {
                        return __awaiter(this, void 0, void 0, function () {
                            var error_18;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, 2, , 3]);
                                        return [4 /*yield*/, client.createPKIUser('a', [15])
                                            // Should fail, assert failure if error is not returned.
                                        ];
                                    case 1:
                                        _a.sent();
                                        // Should fail, assert failure if error is not returned.
                                        chai_1.assert.fail("AN ERROR SHOULD BE THROWN HERE");
                                        return [3 /*break*/, 3];
                                    case 2:
                                        error_18 = _a.sent();
                                        (0, chai_1.expect)(error_18.message).to.eql("Roles object invalid");
                                        (0, chai_1.expect)(error_18.code).to.eql(-2);
                                        return [3 /*break*/, 3];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        });
                    });
                    it('fails with invalid policy', function () {
                        return __awaiter(this, void 0, void 0, function () {
                            var error_19;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, 2, , 3]);
                                        return [4 /*yield*/, client.createPKIUser('a', [], 45)
                                            // Should fail, assert failure if error is not returned.
                                        ];
                                    case 1:
                                        _a.sent();
                                        // Should fail, assert failure if error is not returned.
                                        chai_1.assert.fail("AN ERROR SHOULD BE THROWN HERE");
                                        return [3 /*break*/, 3];
                                    case 2:
                                        error_19 = _a.sent();
                                        (0, chai_1.expect)(error_19.message).to.eql("Policy must be an object");
                                        (0, chai_1.expect)(error_19 instanceof TypeError).to.eql(true);
                                        return [3 /*break*/, 3];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        });
                    });
                    it('fails with invalid callback', function () {
                        return __awaiter(this, void 0, void 0, function () {
                            var error_20;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, 2, , 3]);
                                        return [4 /*yield*/, client.createPKIUser('a', [], {}, 19)
                                            // Should fail, assert failure if error is not returned.
                                        ];
                                    case 1:
                                        _a.sent();
                                        // Should fail, assert failure if error is not returned.
                                        chai_1.assert.fail("AN ERROR SHOULD BE THROWN HERE");
                                        return [3 /*break*/, 3];
                                    case 2:
                                        error_20 = _a.sent();
                                        (0, chai_1.expect)(error_20.message).to.eql("this.callback.bind is not a function");
                                        (0, chai_1.expect)(error_20 instanceof TypeError).to.eql(true);
                                        return [3 /*break*/, 3];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        });
                    });
                });
                describe('Client#createRole()', function () {
                    it('fails with invalid roleName', function () {
                        return __awaiter(this, void 0, void 0, function () {
                            var error_21;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, 2, , 3]);
                                        return [4 /*yield*/, client.createRole(7, [])
                                            // Should fail, assert failure if error is not returned.
                                        ];
                                    case 1:
                                        _a.sent();
                                        // Should fail, assert failure if error is not returned.
                                        chai_1.assert.fail("AN ERROR SHOULD BE THROWN HERE");
                                        return [3 /*break*/, 3];
                                    case 2:
                                        error_21 = _a.sent();
                                        (0, chai_1.expect)(error_21.message).to.eql("role must be a string");
                                        (0, chai_1.expect)(error_21 instanceof TypeError).to.eql(true);
                                        return [3 /*break*/, 3];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        });
                    });
                    it('fails with invalid privileges array', function () {
                        return __awaiter(this, void 0, void 0, function () {
                            var error_22;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, 2, , 3]);
                                        return [4 /*yield*/, client.createRole('c', 25)
                                            // Should fail, assert failure if error is not returned.
                                        ];
                                    case 1:
                                        _a.sent();
                                        // Should fail, assert failure if error is not returned.
                                        chai_1.assert.fail("AN ERROR SHOULD BE THROWN HERE");
                                        return [3 /*break*/, 3];
                                    case 2:
                                        error_22 = _a.sent();
                                        (0, chai_1.expect)(error_22.message).to.eql("privileges must be an array");
                                        (0, chai_1.expect)(error_22 instanceof TypeError).to.eql(true);
                                        return [3 /*break*/, 3];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        });
                    });
                    it('fails with privileges array with invalid values', function () {
                        return __awaiter(this, void 0, void 0, function () {
                            var error_23;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, 2, , 3]);
                                        return [4 /*yield*/, client.createRole('c', [25])
                                            // Should fail, assert failure if error is not returned.
                                        ];
                                    case 1:
                                        _a.sent();
                                        // Should fail, assert failure if error is not returned.
                                        chai_1.assert.fail("AN ERROR SHOULD BE THROWN HERE");
                                        return [3 /*break*/, 3];
                                    case 2:
                                        error_23 = _a.sent();
                                        (0, chai_1.expect)(error_23.message).to.eql("Privileges array invalid");
                                        (0, chai_1.expect)(error_23.code).to.eql(-2);
                                        return [3 /*break*/, 3];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        });
                    });
                    it('fails with invalid policy', function () {
                        return __awaiter(this, void 0, void 0, function () {
                            var error_24;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, 2, , 3]);
                                        return [4 /*yield*/, client.createRole('c', [], 30)
                                            // Should fail, assert failure if error is not returned.
                                        ];
                                    case 1:
                                        _a.sent();
                                        // Should fail, assert failure if error is not returned.
                                        chai_1.assert.fail("AN ERROR SHOULD BE THROWN HERE");
                                        return [3 /*break*/, 3];
                                    case 2:
                                        error_24 = _a.sent();
                                        (0, chai_1.expect)(error_24.message).to.eql("Policy must be an object");
                                        (0, chai_1.expect)(error_24 instanceof TypeError).to.eql(true);
                                        return [3 /*break*/, 3];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        });
                    });
                    it('fails with invalid whitelist', function () {
                        return __awaiter(this, void 0, void 0, function () {
                            var error_25;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, 2, , 3]);
                                        return [4 /*yield*/, client.createRole('c', [], {}, {})
                                            // Should fail, assert failure if error is not returned.
                                        ];
                                    case 1:
                                        _a.sent();
                                        // Should fail, assert failure if error is not returned.
                                        chai_1.assert.fail("AN ERROR SHOULD BE THROWN HERE");
                                        return [3 /*break*/, 3];
                                    case 2:
                                        error_25 = _a.sent();
                                        (0, chai_1.expect)(error_25.message).to.eql("whitelist must be an array");
                                        (0, chai_1.expect)(error_25 instanceof TypeError).to.eql(true);
                                        return [3 /*break*/, 3];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        });
                    });
                    it('fails with whitelist array with invalid values', function () {
                        return __awaiter(this, void 0, void 0, function () {
                            var error_26;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, 2, , 3]);
                                        return [4 /*yield*/, client.createRole('c', [], {}, [10])
                                            // Should fail, assert failure if error is not returned.
                                        ];
                                    case 1:
                                        _a.sent();
                                        // Should fail, assert failure if error is not returned.
                                        chai_1.assert.fail("AN ERROR SHOULD BE THROWN HERE");
                                        return [3 /*break*/, 3];
                                    case 2:
                                        error_26 = _a.sent();
                                        (0, chai_1.expect)(error_26.message).to.eql("Whitelist array invalid");
                                        (0, chai_1.expect)(error_26.code).to.eql(-2);
                                        return [3 /*break*/, 3];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        });
                    });
                    it('fails with invalid readQuota', function () {
                        return __awaiter(this, void 0, void 0, function () {
                            var error_27;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, 2, , 3]);
                                        return [4 /*yield*/, client.createRole('c', [], {}, [], [])
                                            // Should fail, assert failure if error is not returned.
                                        ];
                                    case 1:
                                        _a.sent();
                                        // Should fail, assert failure if error is not returned.
                                        chai_1.assert.fail("AN ERROR SHOULD BE THROWN HERE");
                                        return [3 /*break*/, 3];
                                    case 2:
                                        error_27 = _a.sent();
                                        (0, chai_1.expect)(error_27.message).to.eql("read quota must be a number");
                                        (0, chai_1.expect)(error_27 instanceof TypeError).to.eql(true);
                                        return [3 /*break*/, 3];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        });
                    });
                    it('fails with invalid writeQuota', function () {
                        return __awaiter(this, void 0, void 0, function () {
                            var error_28;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, 2, , 3]);
                                        return [4 /*yield*/, client.createRole('c', [], {}, [], 19, [])
                                            // Should fail, assert failure if error is not returned.
                                        ];
                                    case 1:
                                        _a.sent();
                                        // Should fail, assert failure if error is not returned.
                                        chai_1.assert.fail("AN ERROR SHOULD BE THROWN HERE");
                                        return [3 /*break*/, 3];
                                    case 2:
                                        error_28 = _a.sent();
                                        (0, chai_1.expect)(error_28.message).to.eql("write quota must be a number");
                                        (0, chai_1.expect)(error_28 instanceof TypeError).to.eql(true);
                                        return [3 /*break*/, 3];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        });
                    });
                    it('fails with invalid callback', function () {
                        return __awaiter(this, void 0, void 0, function () {
                            var error_29;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, 2, , 3]);
                                        return [4 /*yield*/, client.createRole('c', [], {}, [], 19, 20, [])
                                            // Should fail, assert failure if error is not returned.
                                        ];
                                    case 1:
                                        _a.sent();
                                        // Should fail, assert failure if error is not returned.
                                        chai_1.assert.fail("AN ERROR SHOULD BE THROWN HERE");
                                        return [3 /*break*/, 3];
                                    case 2:
                                        error_29 = _a.sent();
                                        (0, chai_1.expect)(error_29.message).to.eql("this.callback.bind is not a function");
                                        (0, chai_1.expect)(error_29 instanceof TypeError).to.eql(true);
                                        return [3 /*break*/, 3];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        });
                    });
                });
                describe('Client#dropRole()', function () {
                    it('fails with invalid role name', function () {
                        return __awaiter(this, void 0, void 0, function () {
                            var error_30;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, 2, , 3]);
                                        return [4 /*yield*/, client.dropRole(7)
                                            // Should fail, assert failure if error is not returned.
                                        ];
                                    case 1:
                                        _a.sent();
                                        // Should fail, assert failure if error is not returned.
                                        chai_1.assert.fail("AN ERROR SHOULD BE THROWN HERE");
                                        return [3 /*break*/, 3];
                                    case 2:
                                        error_30 = _a.sent();
                                        (0, chai_1.expect)(error_30.message).to.eql("role must be a string");
                                        (0, chai_1.expect)(error_30 instanceof TypeError).to.eql(true);
                                        return [3 /*break*/, 3];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        });
                    });
                    it('fails with invalid policy', function () {
                        return __awaiter(this, void 0, void 0, function () {
                            var error_31;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, 2, , 3]);
                                        return [4 /*yield*/, client.dropRole('a', 15)
                                            // Should fail, assert failure if error is not returned.
                                        ];
                                    case 1:
                                        _a.sent();
                                        // Should fail, assert failure if error is not returned.
                                        chai_1.assert.fail("AN ERROR SHOULD BE THROWN HERE");
                                        return [3 /*break*/, 3];
                                    case 2:
                                        error_31 = _a.sent();
                                        (0, chai_1.expect)(error_31.message).to.eql("Policy must be an object");
                                        (0, chai_1.expect)(error_31 instanceof TypeError).to.eql(true);
                                        return [3 /*break*/, 3];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        });
                    });
                    it('fails with invalid callback', function () {
                        return __awaiter(this, void 0, void 0, function () {
                            var error_32;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, 2, , 3]);
                                        return [4 /*yield*/, client.dropRole('a', {}, 19)
                                            // Should fail, assert failure if error is not returned.
                                        ];
                                    case 1:
                                        _a.sent();
                                        // Should fail, assert failure if error is not returned.
                                        chai_1.assert.fail("AN ERROR SHOULD BE THROWN HERE");
                                        return [3 /*break*/, 3];
                                    case 2:
                                        error_32 = _a.sent();
                                        (0, chai_1.expect)(error_32.message).to.eql("this.callback.bind is not a function");
                                        (0, chai_1.expect)(error_32 instanceof TypeError).to.eql(true);
                                        return [3 /*break*/, 3];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        });
                    });
                });
                describe('Client#dropUser()', function () {
                    it('fails with invalid user', function () {
                        return __awaiter(this, void 0, void 0, function () {
                            var error_33;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, 2, , 3]);
                                        return [4 /*yield*/, client.dropUser(7)
                                            // Should fail, assert failure if error is not returned.
                                        ];
                                    case 1:
                                        _a.sent();
                                        // Should fail, assert failure if error is not returned.
                                        chai_1.assert.fail("AN ERROR SHOULD BE THROWN HERE");
                                        return [3 /*break*/, 3];
                                    case 2:
                                        error_33 = _a.sent();
                                        (0, chai_1.expect)(error_33.message).to.eql("User name must be a string");
                                        (0, chai_1.expect)(error_33 instanceof TypeError).to.eql(true);
                                        return [3 /*break*/, 3];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        });
                    });
                    it('fails with invalid policy', function () {
                        return __awaiter(this, void 0, void 0, function () {
                            var error_34;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, 2, , 3]);
                                        return [4 /*yield*/, client.dropUser('a', 15)
                                            // Should fail, assert failure if error is not returned.
                                        ];
                                    case 1:
                                        _a.sent();
                                        // Should fail, assert failure if error is not returned.
                                        chai_1.assert.fail("AN ERROR SHOULD BE THROWN HERE");
                                        return [3 /*break*/, 3];
                                    case 2:
                                        error_34 = _a.sent();
                                        (0, chai_1.expect)(error_34.message).to.eql("Policy must be an object");
                                        (0, chai_1.expect)(error_34 instanceof TypeError).to.eql(true);
                                        return [3 /*break*/, 3];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        });
                    });
                    it('fails with invalid callback', function () {
                        return __awaiter(this, void 0, void 0, function () {
                            var error_35;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, 2, , 3]);
                                        return [4 /*yield*/, client.dropUser('a', {}, 19)
                                            // Should fail, assert failure if error is not returned.
                                        ];
                                    case 1:
                                        _a.sent();
                                        // Should fail, assert failure if error is not returned.
                                        chai_1.assert.fail("AN ERROR SHOULD BE THROWN HERE");
                                        return [3 /*break*/, 3];
                                    case 2:
                                        error_35 = _a.sent();
                                        (0, chai_1.expect)(error_35.message).to.eql("this.callback.bind is not a function");
                                        (0, chai_1.expect)(error_35 instanceof TypeError).to.eql(true);
                                        return [3 /*break*/, 3];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        });
                    });
                });
                describe('Client#grantPrivileges()', function () {
                    it('fails with invalid role name', function () {
                        return __awaiter(this, void 0, void 0, function () {
                            var error_36;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, 2, , 3]);
                                        return [4 /*yield*/, client.grantPrivileges(7, [])
                                            // Should fail, assert failure if error is not returned.
                                        ];
                                    case 1:
                                        _a.sent();
                                        // Should fail, assert failure if error is not returned.
                                        chai_1.assert.fail("AN ERROR SHOULD BE THROWN HERE");
                                        return [3 /*break*/, 3];
                                    case 2:
                                        error_36 = _a.sent();
                                        (0, chai_1.expect)(error_36.message).to.eql("Role must be a string");
                                        (0, chai_1.expect)(error_36 instanceof TypeError).to.eql(true);
                                        return [3 /*break*/, 3];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        });
                    });
                    it('fails with invalid privileges', function () {
                        return __awaiter(this, void 0, void 0, function () {
                            var error_37;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, 2, , 3]);
                                        return [4 /*yield*/, client.grantPrivileges('a', 15)
                                            // Should fail, assert failure if error is not returned.
                                        ];
                                    case 1:
                                        _a.sent();
                                        // Should fail, assert failure if error is not returned.
                                        chai_1.assert.fail("AN ERROR SHOULD BE THROWN HERE");
                                        return [3 /*break*/, 3];
                                    case 2:
                                        error_37 = _a.sent();
                                        (0, chai_1.expect)(error_37.message).to.eql("Privileges must be an array");
                                        (0, chai_1.expect)(error_37 instanceof TypeError).to.eql(true);
                                        return [3 /*break*/, 3];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        });
                    });
                    it('fails with privileges array with invalid values', function () {
                        return __awaiter(this, void 0, void 0, function () {
                            var error_38;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, 2, , 3]);
                                        return [4 /*yield*/, client.grantPrivileges('a', [25])
                                            // Should fail, assert failure if error is not returned.
                                        ];
                                    case 1:
                                        _a.sent();
                                        // Should fail, assert failure if error is not returned.
                                        chai_1.assert.fail("AN ERROR SHOULD BE THROWN HERE");
                                        return [3 /*break*/, 3];
                                    case 2:
                                        error_38 = _a.sent();
                                        (0, chai_1.expect)(error_38.message).to.eql("Privileges array invalid");
                                        (0, chai_1.expect)(error_38.code).to.eql(-2);
                                        return [3 /*break*/, 3];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        });
                    });
                    it('fails with invalid policy', function () {
                        return __awaiter(this, void 0, void 0, function () {
                            var error_39;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, 2, , 3]);
                                        return [4 /*yield*/, client.grantPrivileges('a', [], 14)
                                            // Should fail, assert failure if error is not returned.
                                        ];
                                    case 1:
                                        _a.sent();
                                        // Should fail, assert failure if error is not returned.
                                        chai_1.assert.fail("AN ERROR SHOULD BE THROWN HERE");
                                        return [3 /*break*/, 3];
                                    case 2:
                                        error_39 = _a.sent();
                                        (0, chai_1.expect)(error_39.message).to.eql("Policy must be an object");
                                        (0, chai_1.expect)(error_39 instanceof TypeError).to.eql(true);
                                        return [3 /*break*/, 3];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        });
                    });
                    it('fails with invalid callback', function () {
                        return __awaiter(this, void 0, void 0, function () {
                            var error_40;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, 2, , 3]);
                                        return [4 /*yield*/, client.grantPrivileges('a', [], {}, 'a')
                                            // Should fail, assert failure if error is not returned.
                                        ];
                                    case 1:
                                        _a.sent();
                                        // Should fail, assert failure if error is not returned.
                                        chai_1.assert.fail("AN ERROR SHOULD BE THROWN HERE");
                                        return [3 /*break*/, 3];
                                    case 2:
                                        error_40 = _a.sent();
                                        (0, chai_1.expect)(error_40.message).to.eql("this.callback.bind is not a function");
                                        (0, chai_1.expect)(error_40 instanceof TypeError).to.eql(true);
                                        return [3 /*break*/, 3];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        });
                    });
                });
                describe('Client#grantRoles()', function () {
                    it('fails with invalid role name', function () {
                        return __awaiter(this, void 0, void 0, function () {
                            var error_41;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, 2, , 3]);
                                        return [4 /*yield*/, client.grantRoles(7, [])
                                            // Should fail, assert failure if error is not returned.
                                        ];
                                    case 1:
                                        _a.sent();
                                        // Should fail, assert failure if error is not returned.
                                        chai_1.assert.fail("AN ERROR SHOULD BE THROWN HERE");
                                        return [3 /*break*/, 3];
                                    case 2:
                                        error_41 = _a.sent();
                                        (0, chai_1.expect)(error_41.message).to.eql("User name must be a string");
                                        (0, chai_1.expect)(error_41 instanceof TypeError).to.eql(true);
                                        return [3 /*break*/, 3];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        });
                    });
                    it('fails with invalid privileges', function () {
                        return __awaiter(this, void 0, void 0, function () {
                            var error_42;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, 2, , 3]);
                                        return [4 /*yield*/, client.grantRoles('a', 15)
                                            // Should fail, assert failure if error is not returned.
                                        ];
                                    case 1:
                                        _a.sent();
                                        // Should fail, assert failure if error is not returned.
                                        chai_1.assert.fail("AN ERROR SHOULD BE THROWN HERE");
                                        return [3 /*break*/, 3];
                                    case 2:
                                        error_42 = _a.sent();
                                        (0, chai_1.expect)(error_42.message).to.eql("Roles must be an array");
                                        (0, chai_1.expect)(error_42 instanceof TypeError).to.eql(true);
                                        return [3 /*break*/, 3];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        });
                    });
                    it('fails with invalid policy', function () {
                        return __awaiter(this, void 0, void 0, function () {
                            var error_43;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, 2, , 3]);
                                        return [4 /*yield*/, client.grantRoles('a', [], 14)
                                            // Should fail, assert failure if error is not returned.
                                        ];
                                    case 1:
                                        _a.sent();
                                        // Should fail, assert failure if error is not returned.
                                        chai_1.assert.fail("AN ERROR SHOULD BE THROWN HERE");
                                        return [3 /*break*/, 3];
                                    case 2:
                                        error_43 = _a.sent();
                                        (0, chai_1.expect)(error_43.message).to.eql("Policy must be an object");
                                        (0, chai_1.expect)(error_43 instanceof TypeError).to.eql(true);
                                        return [3 /*break*/, 3];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        });
                    });
                    it('fails with invalid callback', function () {
                        return __awaiter(this, void 0, void 0, function () {
                            var error_44;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, 2, , 3]);
                                        return [4 /*yield*/, client.grantRoles('a', [], {}, 'a')
                                            // Should fail, assert failure if error is not returned.
                                        ];
                                    case 1:
                                        _a.sent();
                                        // Should fail, assert failure if error is not returned.
                                        chai_1.assert.fail("AN ERROR SHOULD BE THROWN HERE");
                                        return [3 /*break*/, 3];
                                    case 2:
                                        error_44 = _a.sent();
                                        (0, chai_1.expect)(error_44.message).to.eql("this.callback.bind is not a function");
                                        (0, chai_1.expect)(error_44 instanceof TypeError).to.eql(true);
                                        return [3 /*break*/, 3];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        });
                    });
                });
                describe('Client#queryRole()', function () {
                    it('fails with invalid role name', function () {
                        return __awaiter(this, void 0, void 0, function () {
                            var error_45;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, 2, , 3]);
                                        return [4 /*yield*/, client.queryRole(7)
                                            // Should fail, assert failure if error is not returned.
                                        ];
                                    case 1:
                                        _a.sent();
                                        // Should fail, assert failure if error is not returned.
                                        chai_1.assert.fail("AN ERROR SHOULD BE THROWN HERE");
                                        return [3 /*break*/, 3];
                                    case 2:
                                        error_45 = _a.sent();
                                        (0, chai_1.expect)(error_45.message).to.eql("Role must be a string");
                                        (0, chai_1.expect)(error_45 instanceof TypeError).to.eql(true);
                                        return [3 /*break*/, 3];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        });
                    });
                    it('fails with invalid policy', function () {
                        return __awaiter(this, void 0, void 0, function () {
                            var error_46;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, 2, , 3]);
                                        return [4 /*yield*/, client.queryRole('a', 14)
                                            // Should fail, assert failure if error is not returned.
                                        ];
                                    case 1:
                                        _a.sent();
                                        // Should fail, assert failure if error is not returned.
                                        chai_1.assert.fail("AN ERROR SHOULD BE THROWN HERE");
                                        return [3 /*break*/, 3];
                                    case 2:
                                        error_46 = _a.sent();
                                        (0, chai_1.expect)(error_46.message).to.eql("Policy must be an object");
                                        (0, chai_1.expect)(error_46 instanceof TypeError).to.eql(true);
                                        return [3 /*break*/, 3];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        });
                    });
                    it('fails with invalid callback', function () {
                        return __awaiter(this, void 0, void 0, function () {
                            var error_47;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, 2, , 3]);
                                        return [4 /*yield*/, client.queryRole('a', {}, 'a')
                                            // Should fail, assert failure if error is not returned.
                                        ];
                                    case 1:
                                        _a.sent();
                                        // Should fail, assert failure if error is not returned.
                                        chai_1.assert.fail("AN ERROR SHOULD BE THROWN HERE");
                                        return [3 /*break*/, 3];
                                    case 2:
                                        error_47 = _a.sent();
                                        (0, chai_1.expect)(error_47.message).to.eql("this.callback.bind is not a function");
                                        (0, chai_1.expect)(error_47 instanceof TypeError).to.eql(true);
                                        return [3 /*break*/, 3];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        });
                    });
                });
                describe('Client#queryRoles()', function () {
                    it('fails with invalid policy', function () {
                        return __awaiter(this, void 0, void 0, function () {
                            var error_48;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, 2, , 3]);
                                        return [4 /*yield*/, client.queryRoles('a')
                                            // Should fail, assert failure if error is not returned.
                                        ];
                                    case 1:
                                        _a.sent();
                                        // Should fail, assert failure if error is not returned.
                                        chai_1.assert.fail("AN ERROR SHOULD BE THROWN HERE");
                                        return [3 /*break*/, 3];
                                    case 2:
                                        error_48 = _a.sent();
                                        (0, chai_1.expect)(error_48.message).to.eql("Policy must be an object");
                                        (0, chai_1.expect)(error_48 instanceof TypeError).to.eql(true);
                                        return [3 /*break*/, 3];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        });
                    });
                    it('fails with invalid callback', function () {
                        return __awaiter(this, void 0, void 0, function () {
                            var error_49;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, 2, , 3]);
                                        return [4 /*yield*/, client.queryRoles({}, 'b')
                                            // Should fail, assert failure if error is not returned.
                                        ];
                                    case 1:
                                        _a.sent();
                                        // Should fail, assert failure if error is not returned.
                                        chai_1.assert.fail("AN ERROR SHOULD BE THROWN HERE");
                                        return [3 /*break*/, 3];
                                    case 2:
                                        error_49 = _a.sent();
                                        (0, chai_1.expect)(error_49.message).to.eql("this.callback.bind is not a function");
                                        (0, chai_1.expect)(error_49 instanceof TypeError).to.eql(true);
                                        return [3 /*break*/, 3];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        });
                    });
                });
                describe('Client#queryUser()', function () {
                    it('fails with invalid user', function () {
                        return __awaiter(this, void 0, void 0, function () {
                            var error_50;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, 2, , 3]);
                                        return [4 /*yield*/, client.queryUser(7)
                                            // Should fail, assert failure if error is not returned.
                                        ];
                                    case 1:
                                        _a.sent();
                                        // Should fail, assert failure if error is not returned.
                                        chai_1.assert.fail("AN ERROR SHOULD BE THROWN HERE");
                                        return [3 /*break*/, 3];
                                    case 2:
                                        error_50 = _a.sent();
                                        (0, chai_1.expect)(error_50.message).to.eql("User must be a string");
                                        (0, chai_1.expect)(error_50 instanceof TypeError).to.eql(true);
                                        return [3 /*break*/, 3];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        });
                    });
                    it('fails with invalid policy', function () {
                        return __awaiter(this, void 0, void 0, function () {
                            var error_51;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, 2, , 3]);
                                        return [4 /*yield*/, client.queryUser('a', 14)
                                            // Should fail, assert failure if error is not returned.
                                        ];
                                    case 1:
                                        _a.sent();
                                        // Should fail, assert failure if error is not returned.
                                        chai_1.assert.fail("AN ERROR SHOULD BE THROWN HERE");
                                        return [3 /*break*/, 3];
                                    case 2:
                                        error_51 = _a.sent();
                                        (0, chai_1.expect)(error_51.message).to.eql("Policy must be an object");
                                        (0, chai_1.expect)(error_51 instanceof TypeError).to.eql(true);
                                        return [3 /*break*/, 3];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        });
                    });
                    it('fails with invalid callback', function () {
                        return __awaiter(this, void 0, void 0, function () {
                            var error_52;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, 2, , 3]);
                                        return [4 /*yield*/, client.queryUser('a', {}, 'a')
                                            // Should fail, assert failure if error is not returned.
                                        ];
                                    case 1:
                                        _a.sent();
                                        // Should fail, assert failure if error is not returned.
                                        chai_1.assert.fail("AN ERROR SHOULD BE THROWN HERE");
                                        return [3 /*break*/, 3];
                                    case 2:
                                        error_52 = _a.sent();
                                        (0, chai_1.expect)(error_52.message).to.eql("this.callback.bind is not a function");
                                        (0, chai_1.expect)(error_52 instanceof TypeError).to.eql(true);
                                        return [3 /*break*/, 3];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        });
                    });
                });
                describe('Client#queryUsers()', function () {
                    it('fails with invalid policy', function () {
                        return __awaiter(this, void 0, void 0, function () {
                            var error_53;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, 2, , 3]);
                                        return [4 /*yield*/, client.queryUsers('a')
                                            // Should fail, assert failure if error is not returned.
                                        ];
                                    case 1:
                                        _a.sent();
                                        // Should fail, assert failure if error is not returned.
                                        chai_1.assert.fail("AN ERROR SHOULD BE THROWN HERE");
                                        return [3 /*break*/, 3];
                                    case 2:
                                        error_53 = _a.sent();
                                        (0, chai_1.expect)(error_53.message).to.eql("Policy must be an object");
                                        (0, chai_1.expect)(error_53 instanceof TypeError).to.eql(true);
                                        return [3 /*break*/, 3];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        });
                    });
                    it('fails with invalid callback', function () {
                        return __awaiter(this, void 0, void 0, function () {
                            var error_54;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, 2, , 3]);
                                        return [4 /*yield*/, client.queryUsers({}, 'b')
                                            // Should fail, assert failure if error is not returned.
                                        ];
                                    case 1:
                                        _a.sent();
                                        // Should fail, assert failure if error is not returned.
                                        chai_1.assert.fail("AN ERROR SHOULD BE THROWN HERE");
                                        return [3 /*break*/, 3];
                                    case 2:
                                        error_54 = _a.sent();
                                        (0, chai_1.expect)(error_54.message).to.eql("this.callback.bind is not a function");
                                        (0, chai_1.expect)(error_54 instanceof TypeError).to.eql(true);
                                        return [3 /*break*/, 3];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        });
                    });
                });
                describe('Client#revokePrivileges()', function () {
                    it('fails with invalid role name', function () {
                        return __awaiter(this, void 0, void 0, function () {
                            var error_55;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, 2, , 3]);
                                        return [4 /*yield*/, client.revokePrivileges(7, [])
                                            // Should fail, assert failure if error is not returned.
                                        ];
                                    case 1:
                                        _a.sent();
                                        // Should fail, assert failure if error is not returned.
                                        chai_1.assert.fail("AN ERROR SHOULD BE THROWN HERE");
                                        return [3 /*break*/, 3];
                                    case 2:
                                        error_55 = _a.sent();
                                        (0, chai_1.expect)(error_55.message).to.eql("Role must be a string");
                                        (0, chai_1.expect)(error_55 instanceof TypeError).to.eql(true);
                                        return [3 /*break*/, 3];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        });
                    });
                    it('fails with invalid privileges', function () {
                        return __awaiter(this, void 0, void 0, function () {
                            var error_56;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, 2, , 3]);
                                        return [4 /*yield*/, client.revokePrivileges('a', 14)
                                            // Should fail, assert failure if error is not returned.
                                        ];
                                    case 1:
                                        _a.sent();
                                        // Should fail, assert failure if error is not returned.
                                        chai_1.assert.fail("AN ERROR SHOULD BE THROWN HERE");
                                        return [3 /*break*/, 3];
                                    case 2:
                                        error_56 = _a.sent();
                                        (0, chai_1.expect)(error_56.message).to.eql("Privileges must be an array");
                                        (0, chai_1.expect)(error_56 instanceof TypeError).to.eql(true);
                                        return [3 /*break*/, 3];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        });
                    });
                    it('fails with invalid policy', function () {
                        return __awaiter(this, void 0, void 0, function () {
                            var error_57;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, 2, , 3]);
                                        return [4 /*yield*/, client.revokePrivileges('a', [], 'b')
                                            // Should fail, assert failure if error is not returned.
                                        ];
                                    case 1:
                                        _a.sent();
                                        // Should fail, assert failure if error is not returned.
                                        chai_1.assert.fail("AN ERROR SHOULD BE THROWN HERE");
                                        return [3 /*break*/, 3];
                                    case 2:
                                        error_57 = _a.sent();
                                        (0, chai_1.expect)(error_57.message).to.eql("Policy must be an object");
                                        (0, chai_1.expect)(error_57 instanceof TypeError).to.eql(true);
                                        return [3 /*break*/, 3];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        });
                    });
                    it('fails with invalid callback', function () {
                        return __awaiter(this, void 0, void 0, function () {
                            var error_58;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, 2, , 3]);
                                        return [4 /*yield*/, client.revokePrivileges('a', [], {}, 'a')
                                            // Should fail, assert failure if error is not returned.
                                        ];
                                    case 1:
                                        _a.sent();
                                        // Should fail, assert failure if error is not returned.
                                        chai_1.assert.fail("AN ERROR SHOULD BE THROWN HERE");
                                        return [3 /*break*/, 3];
                                    case 2:
                                        error_58 = _a.sent();
                                        (0, chai_1.expect)(error_58.message).to.eql("this.callback.bind is not a function");
                                        (0, chai_1.expect)(error_58 instanceof TypeError).to.eql(true);
                                        return [3 /*break*/, 3];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        });
                    });
                });
                describe('Client#revokeRoles()', function () {
                    it('fails with invalid user name', function () {
                        return __awaiter(this, void 0, void 0, function () {
                            var error_59;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, 2, , 3]);
                                        return [4 /*yield*/, client.revokeRoles(7, [])
                                            // Should fail, assert failure if error is not returned.
                                        ];
                                    case 1:
                                        _a.sent();
                                        // Should fail, assert failure if error is not returned.
                                        chai_1.assert.fail("AN ERROR SHOULD BE THROWN HERE");
                                        return [3 /*break*/, 3];
                                    case 2:
                                        error_59 = _a.sent();
                                        (0, chai_1.expect)(error_59.message).to.eql("user name must be a string");
                                        (0, chai_1.expect)(error_59 instanceof TypeError).to.eql(true);
                                        return [3 /*break*/, 3];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        });
                    });
                    it('fails with invalid roles', function () {
                        return __awaiter(this, void 0, void 0, function () {
                            var error_60;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, 2, , 3]);
                                        return [4 /*yield*/, client.revokeRoles('a', 14)
                                            // Should fail, assert failure if error is not returned.
                                        ];
                                    case 1:
                                        _a.sent();
                                        // Should fail, assert failure if error is not returned.
                                        chai_1.assert.fail("AN ERROR SHOULD BE THROWN HERE");
                                        return [3 /*break*/, 3];
                                    case 2:
                                        error_60 = _a.sent();
                                        (0, chai_1.expect)(error_60.message).to.eql("Roles must be an array");
                                        (0, chai_1.expect)(error_60 instanceof TypeError).to.eql(true);
                                        return [3 /*break*/, 3];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        });
                    });
                    it('fails with roles array with invalid values', function () {
                        return __awaiter(this, void 0, void 0, function () {
                            var error_61;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, 2, , 3]);
                                        return [4 /*yield*/, client.revokeRoles('a', [14])
                                            // Should fail, assert failure if error is not returned.
                                        ];
                                    case 1:
                                        _a.sent();
                                        // Should fail, assert failure if error is not returned.
                                        chai_1.assert.fail("AN ERROR SHOULD BE THROWN HERE");
                                        return [3 /*break*/, 3];
                                    case 2:
                                        error_61 = _a.sent();
                                        (0, chai_1.expect)(error_61.message).to.eql("Roles object invalid");
                                        (0, chai_1.expect)(error_61.code).to.eql(-2);
                                        return [3 /*break*/, 3];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        });
                    });
                    it('fails with invalid policy', function () {
                        return __awaiter(this, void 0, void 0, function () {
                            var error_62;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, 2, , 3]);
                                        return [4 /*yield*/, client.revokeRoles('a', [], 'b')
                                            // Should fail, assert failure if error is not returned.
                                        ];
                                    case 1:
                                        _a.sent();
                                        // Should fail, assert failure if error is not returned.
                                        chai_1.assert.fail("AN ERROR SHOULD BE THROWN HERE");
                                        return [3 /*break*/, 3];
                                    case 2:
                                        error_62 = _a.sent();
                                        (0, chai_1.expect)(error_62.message).to.eql("Policy must be an object");
                                        (0, chai_1.expect)(error_62 instanceof TypeError).to.eql(true);
                                        return [3 /*break*/, 3];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        });
                    });
                    it('fails with invalid callback', function () {
                        return __awaiter(this, void 0, void 0, function () {
                            var error_63;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, 2, , 3]);
                                        return [4 /*yield*/, client.revokeRoles('a', [], {}, 'a')
                                            // Should fail, assert failure if error is not returned.
                                        ];
                                    case 1:
                                        _a.sent();
                                        // Should fail, assert failure if error is not returned.
                                        chai_1.assert.fail("AN ERROR SHOULD BE THROWN HERE");
                                        return [3 /*break*/, 3];
                                    case 2:
                                        error_63 = _a.sent();
                                        (0, chai_1.expect)(error_63.message).to.eql("this.callback.bind is not a function");
                                        (0, chai_1.expect)(error_63 instanceof TypeError).to.eql(true);
                                        return [3 /*break*/, 3];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        });
                    });
                });
                describe('Client#setQuotas()', function () {
                    it('fails with invalid user name', function () {
                        return __awaiter(this, void 0, void 0, function () {
                            var error_64;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, 2, , 3]);
                                        return [4 /*yield*/, client.setQuotas(7, 10, 10)
                                            // Should fail, assert failure if error is not returned.
                                        ];
                                    case 1:
                                        _a.sent();
                                        // Should fail, assert failure if error is not returned.
                                        chai_1.assert.fail("AN ERROR SHOULD BE THROWN HERE");
                                        return [3 /*break*/, 3];
                                    case 2:
                                        error_64 = _a.sent();
                                        (0, chai_1.expect)(error_64.message).to.eql("Role must be a string");
                                        (0, chai_1.expect)(error_64 instanceof TypeError).to.eql(true);
                                        return [3 /*break*/, 3];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        });
                    });
                    it('fails with invalid readQuota', function () {
                        return __awaiter(this, void 0, void 0, function () {
                            var error_65;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, 2, , 3]);
                                        return [4 /*yield*/, client.setQuotas('a', [], 20)
                                            // Should fail, assert failure if error is not returned.
                                        ];
                                    case 1:
                                        _a.sent();
                                        // Should fail, assert failure if error is not returned.
                                        chai_1.assert.fail("AN ERROR SHOULD BE THROWN HERE");
                                        return [3 /*break*/, 3];
                                    case 2:
                                        error_65 = _a.sent();
                                        (0, chai_1.expect)(error_65.message).to.eql("read quota must be a number");
                                        (0, chai_1.expect)(error_65 instanceof TypeError).to.eql(true);
                                        return [3 /*break*/, 3];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        });
                    });
                    it('fails with invalid writeQuota', function () {
                        return __awaiter(this, void 0, void 0, function () {
                            var error_66;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, 2, , 3]);
                                        return [4 /*yield*/, client.setQuotas('a', 10, 'b')
                                            // Should fail, assert failure if error is not returned.
                                        ];
                                    case 1:
                                        _a.sent();
                                        // Should fail, assert failure if error is not returned.
                                        chai_1.assert.fail("AN ERROR SHOULD BE THROWN HERE");
                                        return [3 /*break*/, 3];
                                    case 2:
                                        error_66 = _a.sent();
                                        (0, chai_1.expect)(error_66.message).to.eql("write quota must be a number");
                                        (0, chai_1.expect)(error_66 instanceof TypeError).to.eql(true);
                                        return [3 /*break*/, 3];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        });
                    });
                    it('fails with invalid policy', function () {
                        return __awaiter(this, void 0, void 0, function () {
                            var error_67;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, 2, , 3]);
                                        return [4 /*yield*/, client.setQuotas('a', 10, 10, 'b')
                                            // Should fail, assert failure if error is not returned.
                                        ];
                                    case 1:
                                        _a.sent();
                                        // Should fail, assert failure if error is not returned.
                                        chai_1.assert.fail("AN ERROR SHOULD BE THROWN HERE");
                                        return [3 /*break*/, 3];
                                    case 2:
                                        error_67 = _a.sent();
                                        (0, chai_1.expect)(error_67.message).to.eql("Policy must be an object");
                                        (0, chai_1.expect)(error_67 instanceof TypeError).to.eql(true);
                                        return [3 /*break*/, 3];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        });
                    });
                    it('fails with invalid callback', function () {
                        return __awaiter(this, void 0, void 0, function () {
                            var error_68;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, 2, , 3]);
                                        return [4 /*yield*/, client.setQuotas('a', 10, 10, {}, 'b')
                                            // Should fail, assert failure if error is not returned.
                                        ];
                                    case 1:
                                        _a.sent();
                                        // Should fail, assert failure if error is not returned.
                                        chai_1.assert.fail("AN ERROR SHOULD BE THROWN HERE");
                                        return [3 /*break*/, 3];
                                    case 2:
                                        error_68 = _a.sent();
                                        (0, chai_1.expect)(error_68.message).to.eql("this.callback.bind is not a function");
                                        (0, chai_1.expect)(error_68 instanceof TypeError).to.eql(true);
                                        return [3 /*break*/, 3];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        });
                    });
                });
            });
            describe('Client#setWhitelist()', function () {
                it('fails with invalid user name', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var error_69;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    _a.trys.push([0, 2, , 3]);
                                    return [4 /*yield*/, client.setWhitelist(7, [])
                                        // Should fail, assert failure if error is not returned.
                                    ];
                                case 1:
                                    _a.sent();
                                    // Should fail, assert failure if error is not returned.
                                    chai_1.assert.fail("AN ERROR SHOULD BE THROWN HERE");
                                    return [3 /*break*/, 3];
                                case 2:
                                    error_69 = _a.sent();
                                    (0, chai_1.expect)(error_69.message).to.eql("Role must be a string");
                                    (0, chai_1.expect)(error_69 instanceof TypeError).to.eql(true);
                                    return [3 /*break*/, 3];
                                case 3: return [2 /*return*/];
                            }
                        });
                    });
                });
                it('fails with invalid whitelist', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var error_70;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    _a.trys.push([0, 2, , 3]);
                                    return [4 /*yield*/, client.setWhitelist('a', 'b')
                                        // Should fail, assert failure if error is not returned.
                                    ];
                                case 1:
                                    _a.sent();
                                    // Should fail, assert failure if error is not returned.
                                    chai_1.assert.fail("AN ERROR SHOULD BE THROWN HERE");
                                    return [3 /*break*/, 3];
                                case 2:
                                    error_70 = _a.sent();
                                    (0, chai_1.expect)(error_70.message).to.eql("Whitelist must be an array");
                                    (0, chai_1.expect)(error_70 instanceof TypeError).to.eql(true);
                                    return [3 /*break*/, 3];
                                case 3: return [2 /*return*/];
                            }
                        });
                    });
                });
                it('fails with whitelist array with invalid values', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var error_71;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    _a.trys.push([0, 2, , 3]);
                                    return [4 /*yield*/, client.setWhitelist('c', [25])
                                        // Should fail, assert failure if error is not returned.
                                    ];
                                case 1:
                                    _a.sent();
                                    // Should fail, assert failure if error is not returned.
                                    chai_1.assert.fail("AN ERROR SHOULD BE THROWN HERE");
                                    return [3 /*break*/, 3];
                                case 2:
                                    error_71 = _a.sent();
                                    (0, chai_1.expect)(error_71.message).to.eql("Whitelist array invalid");
                                    (0, chai_1.expect)(error_71.code).to.eql(-2);
                                    return [3 /*break*/, 3];
                                case 3: return [2 /*return*/];
                            }
                        });
                    });
                });
                it('fails with invalid policy', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var error_72;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    _a.trys.push([0, 2, , 3]);
                                    return [4 /*yield*/, client.setWhitelist('a', [], 'b')
                                        // Should fail, assert failure if error is not returned.
                                    ];
                                case 1:
                                    _a.sent();
                                    // Should fail, assert failure if error is not returned.
                                    chai_1.assert.fail("AN ERROR SHOULD BE THROWN HERE");
                                    return [3 /*break*/, 3];
                                case 2:
                                    error_72 = _a.sent();
                                    (0, chai_1.expect)(error_72.message).to.eql("Policy must be an object");
                                    (0, chai_1.expect)(error_72 instanceof TypeError).to.eql(true);
                                    return [3 /*break*/, 3];
                                case 3: return [2 /*return*/];
                            }
                        });
                    });
                });
                it('fails with invalid callback', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var error_73;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    _a.trys.push([0, 2, , 3]);
                                    return [4 /*yield*/, client.setWhitelist('a', [], {}, 'b')
                                        // Should fail, assert failure if error is not returned.
                                    ];
                                case 1:
                                    _a.sent();
                                    // Should fail, assert failure if error is not returned.
                                    chai_1.assert.fail("AN ERROR SHOULD BE THROWN HERE");
                                    return [3 /*break*/, 3];
                                case 2:
                                    error_73 = _a.sent();
                                    (0, chai_1.expect)(error_73.message).to.eql("this.callback.bind is not a function");
                                    (0, chai_1.expect)(error_73 instanceof TypeError).to.eql(true);
                                    return [3 /*break*/, 3];
                                case 3: return [2 /*return*/];
                            }
                        });
                    });
                });
            });
            client.dropRole(rolename3, null);
            client.dropUser(username8, policy);
            client.dropUser(username7, policy);
            client.dropUser(username6, policy);
            client.dropUser(username5, policy);
            client.dropUser(username4, policy);
            client.dropUser(username3, policy);
            return [2 /*return*/];
        });
    });
});
