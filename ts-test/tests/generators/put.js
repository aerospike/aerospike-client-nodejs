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
Object.defineProperty(exports, "__esModule", { value: true });
exports.put = put;
var p_throttle_1 = require("p-throttle");
var aerospike_1 = require("aerospike");
var Record = aerospike_1.default.Record;
var helper = require("../test_helper");
function createRecords(putCall, generator, recordsToCreate, maxConcurrent, callback) {
    var currentRecordNo = 0;
    var inFlight = 0;
    var creator = function (record, err) {
        if (err) {
            console.error('ERROR: %s [%d] in %s at %s:%d\n%s', err.message, err.code, err.func, err.file, err.line, err.stack);
            throw err;
        }
        if (record) {
            if (typeof callback === 'function') {
                callback(record);
            }
            inFlight--;
        }
        currentRecordNo++;
        if (currentRecordNo <= recordsToCreate && inFlight < maxConcurrent) {
            record = new Record(generator.key(), generator.bins(), generator.metadata());
            var putCb = creator.bind(this, record);
            var policy = generator.policy();
            var meta = { ttl: record.ttl, gen: record.gen };
            putCall(record.key, record.bins, meta, policy, putCb);
            inFlight++;
        }
        else if (currentRecordNo > recordsToCreate && inFlight === 0) {
            if (typeof callback === 'function') {
                callback(null);
            }
        }
    };
    for (var i = 0; i < Math.min(maxConcurrent, recordsToCreate); i++) {
        creator(null, null);
    }
}
function put(n, options, callback) {
    var policy = options.policy || new aerospike_1.default.WritePolicy({
        totalTimeout: 1000,
        exists: aerospike_1.default.policy.exists.CREATE_OR_REPLACE
    });
    var generator = {
        key: options.keygen,
        bins: options.recgen,
        metadata: options.metagen,
        policy: function () { return policy; }
    };
    var putCall = helper.client.put.bind(helper.client);
    if (options.throttle) {
        var _a = options.throttle, limit = _a.limit, interval = _a.interval;
        putCall = (0, p_throttle_1.default)(putCall, limit, interval);
    }
    if (callback) {
        createRecords(putCall, generator, n, 200, callback);
    }
    else {
        return new Promise(function (resolve, reject) {
            var records = [];
            createRecords(putCall, generator, n, 200, function (record) {
                if (record) {
                    records.push(record);
                }
                else {
                    resolve(records);
                }
            });
        });
    }
}
