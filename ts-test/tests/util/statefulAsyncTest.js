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
exports.initState = initState;
exports.expectError = expectError;
exports.createRecord = createRecord;
exports.operate = operate;
exports.assertResultEql = assertResultEql;
exports.assertResultSatisfy = assertResultSatisfy;
exports.assertRecordEql = assertRecordEql;
exports.assertError = assertError;
exports.cleanup = cleanup;
/* global expect */
var aerospike_1 = require("aerospike");
var AerospikeError = aerospike_1.default.AerospikeError;
var helper = require("../test_helper");
var chai_1 = require("chai");
var State = /** @class */ (function () {
    function State() {
        this._expectError = false;
        this.error = null;
    }
    State.prototype.set = function (name, promise) {
        var _this = this;
        if (this._expectError) {
            return promise.catch(function (error) {
                _this.error = error;
                return _this;
            });
        }
        else {
            return promise.then(function (value) {
                _this[name] = value;
                return _this;
            });
        }
    };
    State.prototype.setExpectError = function () {
        this._expectError = true;
        return this;
    };
    return State;
}());
function initState() {
    return Promise.resolve(new State());
}
function expectError() {
    return function (state) { return state.setExpectError(); };
}
function createRecord(bins) {
    return function (state) {
        var key = helper.keygen.string(helper.namespace, helper.set, {})();
        var meta = { ttl: 600 };
        var policy = new aerospike_1.default.WritePolicy({
            exists: aerospike_1.default.policy.exists.CREATE_OR_REPLACE
        });
        return state.set('key', helper.client.put(key, bins, meta, policy));
    };
}
function operate(ops) {
    return function (state) {
        return state.set('result', helper.client.operate(state.key, Array.isArray(ops) ? ops : [ops]));
    };
}
function assertResultEql(expected) {
    return function (state) {
        (0, chai_1.expect)(state.result.bins).to.eql(expected, 'result of operation does not match expectation');
        return state;
    };
}
function assertResultSatisfy(matcher) {
    return function (state) {
        (0, chai_1.expect)(state.result.bins).to.satisfy(matcher, 'result of operation does not satisfy expectation');
        return state;
    };
}
function assertRecordEql(expected) {
    return function (state) {
        return helper.client.get(state.key).then(function (record) {
            return (0, chai_1.expect)(record.bins).to.eql(expected, 'after operation, record bins do not match expectations');
        }).then(function () { return state; });
    };
}
function assertError(code) {
    return function (state) {
        (0, chai_1.expect)(state.error, "expected operation to raise exception with error code ".concat(code))
            .to.be.instanceof(AerospikeError)
            .with.property('code', code);
        return state;
    };
}
function cleanup() {
    return function (state) {
        helper.client.remove(state.key);
    };
}
