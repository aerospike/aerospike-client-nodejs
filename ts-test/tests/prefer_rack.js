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
var keygen = helper.keygen;
var metagen = helper.metagen;
var recgen = helper.recgen;
var valgen = helper.valgen;
var status = aerospike_1.default.status;
var AerospikeError = aerospike_1.default.AerospikeError;
var Double = aerospike_1.default.Double;
var GeoJSON = aerospike_1.default.GeoJSON;
describe('PREFER_RACK', function () {
    //const client: Cli = helper.client
    helper.skipUnlessPreferRack(this);
    //Aerospike.setDefaultLogging({level: Aerospike.log.TRACE})
    it('should write and validate records', function () {
        return __awaiter(this, void 0, void 0, function () {
            var config, dummyClient, i, key;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        config = new aerospike_1.default.Config({
                            hosts: [
                                { addr: '0.0.0.0', port: 3100 },
                                { addr: '0.0.0.0', port: 3101 },
                                { addr: '0.0.0.0', port: 3102 },
                            ],
                            rackIds: [4, 2, 1],
                            rackAware: true,
                            policies: {
                                write: {
                                    replica: aerospike_1.default.policy.replica.PREFER_RACK,
                                },
                                read: {
                                    replica: aerospike_1.default.policy.replica.PREFER_RACK,
                                }
                            },
                            log: {
                                level: aerospike_1.default.log.TRACE,
                            }
                        });
                        return [4 /*yield*/, aerospike_1.default.connect(config)];
                    case 1:
                        dummyClient = _a.sent();
                        i = 0;
                        _a.label = 2;
                    case 2:
                        if (!(i < 20)) return [3 /*break*/, 6];
                        key = new aerospike_1.default.Key('test', 'demo', i);
                        console.log(key);
                        return [4 /*yield*/, dummyClient.put(key, { a: 1 })];
                    case 3:
                        _a.sent();
                        return [4 /*yield*/, dummyClient.get(key)
                            // This must be verified manually, not yet automated.
                            /* Must add this to C Client code inside as_event.c:
                      
                            cmd->node = as_partition_get_node(cmd->cluster, cmd->ns, cmd->partition, cmd->node,
                                             cmd->replica, cmd->replica_size, &cmd->replica_index);
                            printf("Node=%s\n", as_node_get_address_string(cmd->node));
                            */
                            /* Expected output:
                      
                            Key { ns: 'test', set: 'demo', key: 0, digest: null }
                            Node=172.17.0.3:3101
                            Node=172.17.0.3:3101
                            Key { ns: 'test', set: 'demo', key: 1, digest: null }
                            Node=172.17.0.2:3100
                            Node=172.17.0.3:3101
                            Key { ns: 'test', set: 'demo', key: 2, digest: null }
                            Node=172.17.0.4:3102
                            Node=172.17.0.3:3101
                            
                            Read Node can be any rack, but writes will prefer_rack 2
                            */
                        ];
                    case 4:
                        _a.sent();
                        _a.label = 5;
                    case 5:
                        i++;
                        return [3 /*break*/, 2];
                    case 6: return [4 /*yield*/, dummyClient.close()];
                    case 7:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    });
});
