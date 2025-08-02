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
// ****************************************************************************
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
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.cluster = exports.index = exports.udf = exports.config = exports.client = exports.util = exports.putgen = exports.valgen = exports.recgen = exports.metagen = exports.keygen = exports.set = exports.namespace = exports.options = void 0;
exports.runInNewProcess = runInNewProcess;
exports.skip = skip;
exports.skipIf = skipIf;
exports.skipUnless = skipUnless;
exports.skipUnlessSupportsFeature = skipUnlessSupportsFeature;
exports.skipUnlessEnterprise = skipUnlessEnterprise;
exports.skipUnlessVersion = skipUnlessVersion;
exports.skipUnlessVersionAndEnterprise = skipUnlessVersionAndEnterprise;
exports.skipUnlessVersionAndCommunity = skipUnlessVersionAndCommunity;
exports.skipUnlessSupportsTtl = skipUnlessSupportsTtl;
exports.skipUnlessXDR = skipUnlessXDR;
exports.skipUnlessAdvancedMetrics = skipUnlessAdvancedMetrics;
exports.skipUnlessDynamicConfig = skipUnlessDynamicConfig;
exports.skipUnlessMRT = skipUnlessMRT;
exports.skipUnlessPreferRack = skipUnlessPreferRack;
exports.skipUnlessMetricsKeyBusy = skipUnlessMetricsKeyBusy;
var aerospike_1 = require("aerospike");
var options_1 = require("./util/options");
exports.options = options_1.default;
var semver = require("semver");
var path = require("path");
var run_in_new_process_1 = require("./util/run_in_new_process");
var chai = require("chai");
var expect = chai.expect;
global.expect = expect;
exports.namespace = options_1.default.namespace;
exports.set = options_1.default.set;
var keygen = require("./generators/key");
exports.keygen = keygen;
var metagen = require("./generators/metadata");
exports.metagen = metagen;
var recgen = require("./generators/record");
exports.recgen = recgen;
var valgen = require("./generators/value");
exports.valgen = valgen;
var putgen = require("./generators/put");
exports.putgen = putgen;
var util = require("./util");
exports.util = util;
var testConfigs = options_1.default.getConfig();
var config = testConfigs.config;
exports.config = config;
var helper_client_exists = testConfigs.omitHelperClient;
var client;
exports.client = client = aerospike_1.default.client(config);
aerospike_1.default.setDefaultLogging((_a = config.log) !== null && _a !== void 0 ? _a : {});
var UDFHelper = /** @class */ (function () {
    function UDFHelper(client) {
        this.client = client;
    }
    UDFHelper.prototype.register = function (filename) {
        var script = path.join(__dirname, filename);
        return this.client.udfRegister(script)
            .then(function (job) { return job.wait(50); });
    };
    UDFHelper.prototype.remove = function (filename) {
        return this.client.udfRemove(filename)
            .then(function (job) { return job.wait(50); })
            .catch(function (error) {
            if (error.code !== aerospike_1.default.status.ERR_UDF) {
                return Promise.reject(error);
            }
        });
    };
    return UDFHelper;
}());
var IndexHelper = /** @class */ (function () {
    function IndexHelper(client) {
        this.client = client;
    }
    IndexHelper.prototype.create = function (indexName, setName, binName, dataType, indexType, context) {
        return __awaiter(this, void 0, void 0, function () {
            var index;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        index = {
                            ns: options_1.default.namespace,
                            set: setName,
                            bin: binName,
                            index: indexName,
                            type: indexType || aerospike_1.default.indexType.DEFAULT,
                            datatype: dataType,
                            context: context
                        };
                        return [4 /*yield*/, this.createIndex(index, false)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    IndexHelper.prototype.createExprIndex = function (indexName, setName, exp, dataType, indexType, context) {
        return __awaiter(this, void 0, void 0, function () {
            var index;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        index = {
                            ns: options_1.default.namespace,
                            set: setName,
                            exp: exp,
                            index: indexName,
                            type: indexType || aerospike_1.default.indexType.DEFAULT,
                            datatype: dataType,
                        };
                        return [4 /*yield*/, this.createIndex(index, true)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    IndexHelper.prototype.createIndex = function (index, has_exp) {
        return __awaiter(this, void 0, void 0, function () {
            var retries, attempt, job, error_1, e;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        retries = 3;
                        attempt = 0;
                        _a.label = 1;
                    case 1:
                        if (!(attempt < retries)) return [3 /*break*/, 10];
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 8, , 9]);
                        job = void 0;
                        if (!has_exp) return [3 /*break*/, 4];
                        return [4 /*yield*/, this.client.createExprIndex(index)];
                    case 3:
                        job = _a.sent();
                        return [3 /*break*/, 6];
                    case 4: return [4 /*yield*/, this.client.createIndex(index)];
                    case 5:
                        job = _a.sent();
                        _a.label = 6;
                    case 6: return [4 /*yield*/, job.wait()];
                    case 7:
                        _a.sent();
                        return [2 /*return*/];
                    case 8:
                        error_1 = _a.sent();
                        if (error_1.code === aerospike_1.default.status.ERR_INDEX_FOUND) {
                            return [2 /*return*/];
                        }
                        if (attempt === retries - 1) {
                            e = new Error('IndexHelper.remove function failed with the following error: ');
                            e.cause = error_1;
                            throw e;
                        }
                        return [3 /*break*/, 9];
                    case 9:
                        attempt++;
                        return [3 /*break*/, 1];
                    case 10: return [2 /*return*/];
                }
            });
        });
    };
    IndexHelper.prototype.remove = function (indexName) {
        return __awaiter(this, void 0, void 0, function () {
            var error_2, e;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.client.indexRemove(options_1.default.namespace, indexName)];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        error_2 = _a.sent();
                        if (error_2.code === aerospike_1.default.status.ERR_INDEX_NOT_FOUND) {
                            // ignore - index does not exist
                        }
                        else {
                            e = new Error('IndexHelper.remove function failed with the following error: ');
                            e.cause = error_2;
                            throw e;
                        }
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    return IndexHelper;
}());
var ServerInfoHelper = /** @class */ (function () {
    function ServerInfoHelper(client) {
        this.features = new Set();
        this.edition = 'community';
        this.build = '';
        this.namespaceInfo = {};
        this.cluster = [];
        this.client = client;
    }
    ServerInfoHelper.prototype.hasFeature = function (feature) {
        return this.features.has(feature);
    };
    ServerInfoHelper.prototype.isEnterprise = function () {
        return this.edition.match('Enterprise');
    };
    ServerInfoHelper.prototype.isVersionInRange = function (versionRange) {
        var version = process.env.AEROSPIKE_VERSION_OVERRIDE || this.build;
        var semverVersion = semver.coerce(version); // truncate a build number like "4.3.0.2-28-gdd9f506" to just "4.3.0"
        return semver.satisfies(semverVersion, versionRange);
    };
    ServerInfoHelper.prototype.supportsTtl = function () {
        var config = this.namespaceInfo.config;
        return config['nsup-period'] > 0 || config['allow-ttl-without-nsup'] === 'true';
    };
    ServerInfoHelper.prototype.fetchInfo = function () {
        var _this = this;
        return this.client.infoAll('build\nedition\nfeatures')
            .then(function (results) {
            results.forEach(function (response) {
                var info = aerospike_1.default.info.parse(response.info);
                _this.edition = info.edition;
                _this.build = info.build;
                var features = info.features;
                if (Array.isArray(features)) {
                    features.forEach(function (feature) { return _this.features.add(feature); });
                }
            });
        });
    };
    ServerInfoHelper.prototype.fetchNamespaceInfo = function (ns) {
        var _this = this;
        var nsKey = "namespace/".concat(ns);
        var cfgKey = "get-config:context=namespace;id=".concat(ns);
        return this.client.infoAny([nsKey, cfgKey].join('\n'))
            .then(function (results) {
            var info = aerospike_1.default.info.parse(results);
            _this.namespaceInfo = {
                info: info[nsKey],
                config: info[cfgKey],
            };
        });
    };
    ServerInfoHelper.prototype.randomNode = function () {
        var nodes = this.client.getNodes();
        var i = Math.floor(Math.random() * nodes.length);
        return nodes[i];
    };
    return ServerInfoHelper;
}());
var udfHelper = new UDFHelper(client);
var indexHelper = new IndexHelper(client);
var serverInfoHelper = new ServerInfoHelper(client);
exports.udf = udfHelper;
exports.index = indexHelper;
exports.cluster = serverInfoHelper;
function runInNewProcess(fn, data) {
    if (data === undefined) {
        data = null;
    }
    var env = {
        NODE_PATH: path.join(process.cwd(), 'node_modules')
    };
    return (0, run_in_new_process_1.runInNewProcessFn)(fn, env, data);
}
function skip(ctx, message) {
    ctx.beforeEach(function () {
        this.skip(message);
    });
}
function skipIf(ctx, condition, message) {
    ctx.beforeEach(function () {
        var skip = condition;
        if (typeof condition === 'function') {
            skip = condition();
        }
        if (skip) {
            this.skip(message);
        }
    });
}
function skipUnless(ctx, condition, message) {
    if (typeof condition === 'function') {
        skipIf(ctx, function () { return !condition(); }, message);
    }
    else {
        skipIf(ctx, !condition, message);
    }
}
function skipUnlessSupportsFeature(feature, ctx) {
    var _this = this;
    skipUnless(ctx, function () { return _this.cluster.hasFeature(feature); }, "requires server feature \"".concat(feature, "\""));
}
function skipUnlessEnterprise(ctx) {
    var _this = this;
    skipUnless(ctx, function () { return _this.cluster.isEnterprise(); }, 'requires enterprise edition');
}
function skipUnlessVersion(versionRange, ctx) {
    var _this = this;
    skipUnless(ctx, function () { return _this.cluster.isVersionInRange(versionRange); }, "cluster version does not meet requirements: \"".concat(versionRange, "\""));
}
function skipUnlessVersionAndEnterprise(versionRange, ctx) {
    var _this = this;
    skipUnless(ctx, function () {
        return (_this.cluster.isVersionInRange(versionRange) && (_this.cluster.isEnterprise()));
    }, "cluster version does not meet requirements: \"".concat(versionRange, " and/or requires enterprise\""));
}
function skipUnlessVersionAndCommunity(versionRange, ctx) {
    var _this = this;
    skipUnless(ctx, function () {
        return (_this.cluster.isVersionInRange(versionRange) && (!_this.cluster.isEnterprise()));
    }, "cluster version does not meet requirements: \"".concat(versionRange, " and/or requires enterprise\""));
}
function skipUnlessSupportsTtl(ctx) {
    var _this = this;
    skipUnless(ctx, function () { return _this.cluster.supportsTtl(); }, 'test namespace does not support record TTLs');
}
function skipUnlessXDR(ctx) {
    skipUnless(ctx, function () { return options_1.default.testXDR; }, 'XDR tests disabled');
    return options_1.default.testXDR;
}
function skipUnlessAdvancedMetrics(ctx) {
    skipUnless(ctx, function () { return options_1.default.testMetrics; }, 'Advanced metrics tests disabled');
}
function skipUnlessDynamicConfig(ctx) {
    skipUnless(ctx, function () { return options_1.default.testDynamicConfig; }, 'Dynamic config tests disabled');
}
function skipUnlessMRT(ctx) {
    skipUnless(ctx, function () { return options_1.default.testMRT; }, 'MRT tests disabled');
}
function skipUnlessPreferRack(ctx) {
    skipUnless(ctx, function () { return options_1.default.testPreferRack; }, 'Prefer rack tests disabled');
}
function skipUnlessMetricsKeyBusy(ctx) {
    skipUnless(ctx, function () { return options_1.default.testMetricsKeyBusy; }, 'Metrics key busy test disabled');
}
if (process.env.GLOBAL_CLIENT !== 'false') {
    /* global before */
    before(function () {
        if (helper_client_exists) {
            client.connect()
                .then(function () { return serverInfoHelper.fetchInfo(); })
                .then(function () { return serverInfoHelper.fetchNamespaceInfo(options_1.default.namespace); })
                .catch(function (error) {
                console.error('ERROR:', error);
                console.error('CONFIG:', client.config);
                throw error;
            });
        }
    });
    /* global after */
    after(function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!helper_client_exists) return [3 /*break*/, 2];
                        return [4 /*yield*/, client.close()];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2: return [2 /*return*/];
                }
            });
        });
    });
}
