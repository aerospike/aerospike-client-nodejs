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
var chai_1 = require("chai");
var helper = require("./test_helper");
var keygen = helper.keygen;
var metagen = helper.metagen;
var recgen = helper.recgen;
var valgen = helper.valgen;
var status = aerospike_1.default.status;
var AerospikeError = aerospike_1.default.AerospikeError;
var Double = aerospike_1.default.Double;
var GeoJSON = aerospike_1.default.GeoJSON;
describe('client.put()', function () {
    var client = helper.client;
    it('should write and validate records', function (done) {
        var meta = { ttl: 1000 };
        var putAndGet = function (key, bins, cb) {
            client.put(key, bins, meta, function (err) {
                if (err)
                    throw err;
                client.get(key, function (err, record) {
                    if (err)
                        throw err;
                    (0, chai_1.expect)(bins).to.eql(record === null || record === void 0 ? void 0 : record.bins);
                    cb();
                });
            });
        };
        var kgen = keygen.string(helper.namespace, helper.set, {
            prefix: 'test/put/putAndGet/',
            random: false
        });
        var rgen = recgen.record({ i: valgen.integer(), s: valgen.string(), b: valgen.bytes() });
        var total = 50;
        var count = 0;
        for (var i = 0; i < total; i++) {
            putAndGet(kgen(), rgen(), function () {
                count++;
                if (count === total) {
                    done();
                }
            });
        }
    });
    context('records with various key types', function () {
        it('should write a record w/ string key', function (done) {
            var key = keygen.string(helper.namespace, helper.set, { prefix: 'test/put/' })();
            var record = recgen.record({ i: valgen.integer(), s: valgen.string() })();
            client.put(key, record, function (err) {
                if (err)
                    throw err;
                client.remove(key, function (err) {
                    if (err)
                        throw err;
                    done();
                });
            });
        });
        it('should write a record w/ integer key', function (done) {
            var key = keygen.integer(helper.namespace, helper.set)();
            var record = recgen.record({ i: valgen.integer(), s: valgen.string() })();
            client.put(key, record, function (err) {
                if (err)
                    throw err;
                client.remove(key, function (err) {
                    if (err)
                        throw err;
                    done();
                });
            });
        });
        context('BigInt keys', function () {
            it('should write a record w/ BigInt key', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, record, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                key = new aerospike_1.default.Key(helper.namespace, helper.set, Math.pow(BigInt(2), BigInt(63)) - BigInt(1));
                                record = recgen.record({ i: valgen.integer(), s: valgen.string() })();
                                return [4 /*yield*/, client.put(key, record)];
                            case 1:
                                _a.sent();
                                return [4 /*yield*/, client.get(key)];
                            case 2:
                                result = _a.sent();
                                (0, chai_1.expect)(result.bins).to.eql(record);
                                return [4 /*yield*/, client.remove(key)];
                            case 3:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
        it('should write a record w/ byte array key', function (done) {
            var key = keygen.bytes(helper.namespace, helper.set)();
            var record = recgen.record({ i: valgen.integer(), s: valgen.string() })();
            client.put(key, record, function (err) {
                if (err)
                    throw err;
                client.remove(key, function (err) {
                    if (err)
                        throw err;
                    done();
                });
            });
        });
    });
    context('bins with various data types', function () {
        var meta = { ttl: 600 };
        var policy = new aerospike_1.default.WritePolicy({
            exists: aerospike_1.default.policy.exists.CREATE_OR_REPLACE
        });
        function putGetVerify(bins, expected, done) {
            var key = keygen.string(helper.namespace, helper.set, { prefix: 'test/put/' })();
            client.put(key, bins, meta, policy, function (err) {
                if (err)
                    throw err;
                client.get(key, function (err, record) {
                    if (err)
                        throw err;
                    (0, chai_1.expect)(record === null || record === void 0 ? void 0 : record.bins).to.eql(expected);
                    client.remove(key, done);
                });
            });
        }
        it('writes bin with string values and reads it back', function (done) {
            var record = { string: 'hello world' };
            var expected = { string: 'hello world' };
            putGetVerify(record, expected, done);
        });
        it('writes bin with integer values and reads it back', function (done) {
            var record = { low: Number.MIN_SAFE_INTEGER, high: Number.MAX_SAFE_INTEGER };
            var expected = { low: -9007199254740991, high: 9007199254740991 };
            putGetVerify(record, expected, done);
        });
        it('writes bin with Buffer value and reads it back', function (done) {
            var record = { buffer: Buffer.from([0x61, 0x65, 0x72, 0x6f, 0x73, 0x70, 0x69, 0x6b, 0x65]) };
            var expected = { buffer: Buffer.from([0x61, 0x65, 0x72, 0x6f, 0x73, 0x70, 0x69, 0x6b, 0x65]) };
            putGetVerify(record, expected, done);
        });
        it('writes bin with float value as double and reads it back', function (done) {
            var record = { double: 3.141592653589793 };
            var expected = { double: 3.141592653589793 };
            putGetVerify(record, expected, done);
        });
        it('writes bin with Double value as double and reads it back', function (done) {
            var record = { double: new Double(3.141592653589793) };
            var expected = { double: 3.141592653589793 };
            putGetVerify(record, expected, done);
        });
        it('writes bin with GeoJSON value and reads it back as string', function (done) {
            var record = { geo: new GeoJSON.Point(103.8, 1.283) };
            var expected = { geo: '{"type":"Point","coordinates":[103.8,1.283]}' };
            putGetVerify(record, expected, done);
        });
        it('writes bin with array value as list and reads it back', function (done) {
            var record = {
                list: [
                    1,
                    'foo',
                    1.23,
                    new Double(3.14),
                    Buffer.from('bar'),
                    new GeoJSON.Point(103.8, 1.283),
                    [1, 2, 3],
                    { a: 1, b: 2 },
                    false
                ]
            };
            var expected = {
                list: [
                    1,
                    'foo',
                    1.23,
                    3.14,
                    Buffer.from('bar'),
                    '{"type":"Point","coordinates":[103.8,1.283]}',
                    [1, 2, 3],
                    { a: 1, b: 2 },
                    false
                ]
            };
            putGetVerify(record, expected, done);
        });
        it('writes bin with object value as map and reads it back', function (done) {
            var record = {
                map: {
                    a: 1,
                    b: 'foo',
                    c: 1.23,
                    d: new Double(3.14),
                    e: Buffer.from('bar'),
                    f: new GeoJSON.Point(103.8, 1.283),
                    g: [1, 2, 3],
                    h: { a: 1, b: 2 },
                    i: true
                }
            };
            var expected = {
                map: {
                    a: 1,
                    b: 'foo',
                    c: 1.23,
                    d: 3.14,
                    e: Buffer.from('bar'),
                    f: '{"type":"Point","coordinates":[103.8,1.283]}',
                    g: [1, 2, 3],
                    h: { a: 1, b: 2 },
                    i: true
                }
            };
            putGetVerify(record, expected, done);
        });
        it('writes bin with Map value as map and reads it back as an ordered object', function (done) {
            var record = {
                map: new Map([['g', [1, 2, 3]], ['h', { a: 1, b: 2 }], ['j', new Map([['b', 'foo'], ['a', 1]])],
                    ['d', new Double(3.14)], ['e', Buffer.from('bar')], ['f', new GeoJSON.Point(103.8, 1.283)],
                    ['a', 1], ['b', 'foo'], ['c', 1.23]])
            };
            var expected = {
                map: {
                    a: 1,
                    b: 'foo',
                    c: 1.23,
                    d: 3.14,
                    e: Buffer.from('bar'),
                    f: '{"type":"Point","coordinates":[103.8,1.283]}',
                    g: [1, 2, 3],
                    h: { a: 1, b: 2 },
                    j: { a: 1, b: 'foo' }
                }
            };
            putGetVerify(record, expected, done);
        });
        it('writes bin with the Bin class and reads it back as an object', function (done) {
            var record = new aerospike_1.default.Bin('map', {
                g: [1, 2, 3],
                h: { a: 1, b: 2 },
                j: new Map([['b', 'foo'], ['a', 1]]),
                e: Buffer.from('bar'),
                f: '{"type":"Point","coordinates":[103.8,1.283]}',
                a: 1,
                b: 'foo',
                c: 1.23,
                d: 3.14
            });
            var expected = {
                map: {
                    a: 1,
                    b: 'foo',
                    c: 1.23,
                    d: 3.14,
                    e: Buffer.from('bar'),
                    f: '{"type":"Point","coordinates":[103.8,1.283]}',
                    g: [1, 2, 3],
                    h: { a: 1, b: 2 },
                    j: { a: 1, b: 'foo' }
                }
            };
            putGetVerify(record, expected, done);
        });
        context('BigInt values', function () {
            it('writes bin with BigInt value and reads it back as a Number', function (done) {
                var record = { bigint: BigInt(42) };
                var expected = { bigint: 42 };
                putGetVerify(record, expected, done);
            });
            it('writes bin with BigInt value outside safe Number range', function (done) {
                var tooLargeForNumber = BigInt(Number.MAX_SAFE_INTEGER) + BigInt(2);
                var record = { bigint: tooLargeForNumber };
                var expected = { bigint: tooLargeForNumber };
                putGetVerify(record, expected, done);
            });
        });
        context('Boolean values', function () {
            helper.skipUnlessVersion('>= 5.6.0', this);
            it('writes bin with boolean value and reads it back', function (done) {
                var record = { bool: true, bool2: false };
                var expected = { bool: true, bool2: false };
                putGetVerify(record, expected, done);
            });
        });
        context('invalid bin values', function () {
            it('should fail with a parameter error when trying to write an undefined bin value', function (done) {
                var key = keygen.string(helper.namespace, helper.set, { prefix: 'test/put/' })();
                var record = { valid: 123, invalid: undefined };
                client.put(key, record, function (err) {
                    (0, chai_1.expect)(err === null || err === void 0 ? void 0 : err.code).to.equal(status.ERR_PARAM);
                    client.remove(key, function (err) {
                        (0, chai_1.expect)(err === null || err === void 0 ? void 0 : err.code).to.equal(status.ERR_RECORD_NOT_FOUND);
                        done();
                    });
                });
            });
        });
    });
    context('bin names', function () {
        helper.skipUnlessVersion('>= 4.2.0', this);
        it('should write a bin with a name of max. length 15', function () {
            var key = keygen.string(helper.namespace, helper.set, { prefix: 'test/put/' })();
            var bins = { 'bin-name-len-15': 'bin name with 15 chars' };
            return client.put(key, bins)
                .then(function () { return client.get(key); })
                .then(function (record) {
                (0, chai_1.expect)(record.bins).to.eql({
                    'bin-name-len-15': 'bin name with 15 chars'
                });
            }).then(function () { return client.remove(key); });
        });
        it('should return a parameter error when bin length exceeds 15 chars', function () {
            var key = keygen.string(helper.namespace, helper.set, { prefix: 'test/put/' })();
            var bins = { 'bin-name-size-16': 'bin name with 16 chars' };
            return client.put(key, bins)
                .then(function () { return 'no error'; })
                .catch(function (error) { return error; })
                .then(function (error) {
                (0, chai_1.expect)(error).to.be.instanceof(AerospikeError)
                    .that.has.property('code', aerospike_1.default.status.ERR_REQUEST_INVALID);
            });
        });
    });
    it('should delete a bin when writing null to it', function () {
        return __awaiter(this, void 0, void 0, function () {
            var key, record, update, result, expected;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        key = keygen.string(helper.namespace, helper.set, { prefix: 'test/put/' })();
                        record = { bin1: 123, bin2: 456 };
                        return [4 /*yield*/, client.put(key, record)];
                    case 1:
                        _a.sent();
                        update = { bin1: null };
                        return [4 /*yield*/, client.put(key, update)];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, client.get(key)];
                    case 3:
                        result = _a.sent();
                        expected = { bin2: 456 };
                        (0, chai_1.expect)(result.bins).to.eql(expected);
                        return [4 /*yield*/, client.remove(key)];
                    case 4:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    });
    it('should write, read, write, and check gen', function (done) {
        var kgen = keygen.string(helper.namespace, helper.set, { prefix: 'test/put/' });
        var mgen = metagen.constant({ ttl: 1000 });
        var rgen = recgen.record({ i: valgen.integer(), s: valgen.string() });
        var key = kgen();
        var meta = mgen(key);
        var bins = rgen(key, meta);
        // write the record then check
        client.put(key, bins, meta, function (err, key1) {
            if (err)
                throw err;
            (0, chai_1.expect)(key1).to.eql(key);
            client.get(key1, function (err, record2) {
                if (err)
                    throw err;
                (0, chai_1.expect)(record2 === null || record2 === void 0 ? void 0 : record2.key).to.eql(key);
                (0, chai_1.expect)(record2 === null || record2 === void 0 ? void 0 : record2.bins).to.eql(bins);
                record2.bins.i = record2.bins.i + 1;
                client.put(record2 === null || record2 === void 0 ? void 0 : record2.key, record2 === null || record2 === void 0 ? void 0 : record2.bins, meta, function (err, key3) {
                    if (err)
                        throw err;
                    (0, chai_1.expect)(key3).to.eql(key);
                    client.get(key3, function (err, record4) {
                        if (err)
                            throw err;
                        (0, chai_1.expect)(record4 === null || record4 === void 0 ? void 0 : record4.key).to.eql(key);
                        (0, chai_1.expect)(record4 === null || record4 === void 0 ? void 0 : record4.bins).to.eql(record2 === null || record2 === void 0 ? void 0 : record2.bins);
                        (0, chai_1.expect)(record4 === null || record4 === void 0 ? void 0 : record4.gen).to.equal((record2 === null || record2 === void 0 ? void 0 : record2.gen) + 1);
                        client.remove(key, function (err) {
                            if (err)
                                throw err;
                            done();
                        });
                    });
                });
            });
        });
    });
    it('should write, read, remove, read, write, and check gen', function (done) {
        var kgen = keygen.string(helper.namespace, helper.set, { prefix: 'test/put/' });
        var mgen = metagen.constant({ ttl: 1000 });
        var rgen = recgen.record({ i: valgen.integer(), s: valgen.string() });
        var key = kgen();
        var meta = mgen(key);
        var bins = rgen(key, meta);
        // write the record then check
        client.put(key, bins, meta, function (err, key1) {
            if (err)
                throw err;
            (0, chai_1.expect)(key1).to.eql(key);
            client.get(key1, function (err, record2) {
                if (err)
                    throw err;
                (0, chai_1.expect)(record2 === null || record2 === void 0 ? void 0 : record2.key).to.eql(key);
                (0, chai_1.expect)(record2 === null || record2 === void 0 ? void 0 : record2.bins).to.eql(bins);
                client.remove(record2 === null || record2 === void 0 ? void 0 : record2.key, function (err, key3) {
                    if (err)
                        throw err;
                    (0, chai_1.expect)(key3).to.eql(key);
                    client.get(key3, function (err, record4) {
                        (0, chai_1.expect)(err === null || err === void 0 ? void 0 : err.code).to.eql(status.ERR_RECORD_NOT_FOUND);
                        client.put(record4 === null || record4 === void 0 ? void 0 : record4.key, bins, meta, function (err, key5) {
                            if (err)
                                throw err;
                            (0, chai_1.expect)(key5).to.eql(key);
                            client.get(key5, function (err, record6) {
                                if (err)
                                    throw err;
                                (0, chai_1.expect)(record6 === null || record6 === void 0 ? void 0 : record6.key).to.eql(key);
                                (0, chai_1.expect)(record6 === null || record6 === void 0 ? void 0 : record6.bins).to.eql(bins);
                                (0, chai_1.expect)(record6 === null || record6 === void 0 ? void 0 : record6.gen).to.eql(1);
                                client.remove(record6 === null || record6 === void 0 ? void 0 : record6.key, function (err) {
                                    if (err)
                                        throw err;
                                    done();
                                });
                            });
                        });
                    });
                });
            });
        });
    });
    /*
    it('should fail with a parameter error if gen is invalid', function (done) {
      const key = keygen.string(helper.namespace, helper.set, { prefix: 'test/put/' })()
      const bins = recgen.record({ i: valgen.integer(), s: valgen.string() })()
      const meta = {
        gen: 'generation1'
      }
  
      client.put(key, bins, meta, (error: any) => {
        expect(error).to.be.instanceof(AerospikeError).with.property('code', status.ERR_PARAM)
        done()
      })
    })
    */
    /*
    it('should fail with a parameter error if ttl is invalid', function (done) {
      const key = keygen.string(helper.namespace, helper.set, { prefix: 'test/put/' })()
      const bins = recgen.record({ i: valgen.integer(), s: valgen.string() })()
      const meta = {
        ttl: 'time-to-live'
      }
  
      client.put(key, bins, meta, (error: any) => {
        expect(error).to.be.instanceof(AerospikeError).with.property('code', status.ERR_PARAM)
        done()
      })
    })
    */
    it('should write null for bins with empty list and map', function (done) {
        // generators
        var kgen = keygen.string(helper.namespace, helper.set, { prefix: 'test/put/' });
        var mgen = metagen.constant({ ttl: 1000 });
        var rgen = recgen.record({
            l: valgen.constant([1, 2, 3]),
            le: valgen.constant([]),
            m: valgen.constant({ a: 1, b: 2 }),
            me: valgen.constant({})
        });
        // values
        var key = kgen();
        var meta = mgen(key);
        var bins = rgen(key, meta);
        // write the record then check
        client.put(key, bins, meta, function (err, key1) {
            if (err)
                throw err;
            (0, chai_1.expect)(key1).to.eql(key);
            client.get(key1, function (err, record2) {
                if (err)
                    throw err;
                (0, chai_1.expect)(record2 === null || record2 === void 0 ? void 0 : record2.key).to.eql(key);
                (0, chai_1.expect)(record2 === null || record2 === void 0 ? void 0 : record2.bins).to.eql(bins);
                client.remove(key, function (err) {
                    if (err)
                        throw err;
                    done();
                });
            });
        });
    });
    it('should write a key without set name', function (done) {
        var noSet = null;
        var key = keygen.string(helper.namespace, noSet, { prefix: 'test/put/' })();
        var record = { bin1: 123, bin2: 456 };
        client.put(key, record, function (err) {
            if (err)
                throw err;
            client.remove(key, function (err) {
                if (err)
                    throw err;
                done();
            });
        });
    });
    it('should write a map with undefined entry and verify the record', function (done) {
        var key = keygen.string(helper.namespace, helper.set, { prefix: 'test/put/' })();
        var record = {
            list: [1, 2, 3, undefined],
            map: { a: 1, b: 2, c: undefined }
        };
        client.put(key, record, function (err) {
            if (err)
                throw err;
            client.get(key, function (err, record) {
                if (err)
                    throw err;
                (0, chai_1.expect)(record === null || record === void 0 ? void 0 : record.bins.map).to.eql({ a: 1, b: 2, c: null });
                (0, chai_1.expect)(record === null || record === void 0 ? void 0 : record.bins.list).to.eql([1, 2, 3, null]);
                client.remove(key, function (err) {
                    if (err)
                        throw err;
                    done();
                });
            });
        });
    });
    context('exists policy', function () {
        context('policy.exists.UPDATE', function () {
            it('does not create a key that does not exist yet', function () {
                var key = keygen.integer(helper.namespace, helper.set)();
                var policy = new aerospike_1.default.policy.WritePolicy({
                    exists: aerospike_1.default.policy.exists.UPDATE
                });
                return client.put(key, { i: 49 }, {}, policy)
                    .catch(function (error) { return (0, chai_1.expect)(error).to.be.instanceof(AerospikeError).with.property('code', status.ERR_RECORD_NOT_FOUND); })
                    .then(function () { return client.exists(key); })
                    .then(function (exists) { return (0, chai_1.expect)(exists).to.be.false; });
            });
        });
        context('policy.exists.CREATE', function () {
            it('does not update a record if it already exists', function () {
                var key = keygen.integer(helper.namespace, helper.set)();
                var policy = new aerospike_1.default.policy.WritePolicy({
                    exists: aerospike_1.default.policy.exists.CREATE
                });
                return client.put(key, { i: 49 }, {}, policy)
                    .then(function () { return client.put(key, { i: 50 }, {}, policy); })
                    .catch(function (error) { return (0, chai_1.expect)(error).to.be.instanceof(AerospikeError).with.property('code', status.ERR_RECORD_EXISTS); })
                    .then(function () { return client.get(key); })
                    .then(function (record) { return (0, chai_1.expect)(record.bins.i).to.equal(49); });
            });
        });
    });
    context('onLockingOnly policy', function () {
        helper.skipUnlessVersionAndEnterprise('>= 8.0.0', this);
        context('it triggers already locked', function () {
            it('does not create a key that does not exist yet', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, mrt, policy, error_1, exists;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                key = keygen.integer(helper.namespace, helper.set)();
                                mrt = new aerospike_1.default.Transaction();
                                policy = new aerospike_1.default.policy.WritePolicy({
                                    onLockingOnly: true,
                                    txn: mrt
                                });
                                return [4 /*yield*/, client.put(key, { i: 49 }, {}, policy)];
                            case 1:
                                _a.sent();
                                _a.label = 2;
                            case 2:
                                _a.trys.push([2, 4, , 6]);
                                return [4 /*yield*/, client.put(key, { i: 49 }, {}, policy)];
                            case 3:
                                _a.sent();
                                chai_1.assert.fail('An error should have been caught');
                                return [3 /*break*/, 6];
                            case 4:
                                error_1 = _a.sent();
                                (0, chai_1.expect)(error_1).to.be.instanceof(AerospikeError).with.property('code', status.MRT_ALREADY_LOCKED);
                                return [4 /*yield*/, client.exists(key)];
                            case 5:
                                exists = _a.sent();
                                (0, chai_1.expect)(exists).to.be.false;
                                return [3 /*break*/, 6];
                            case 6: return [2 /*return*/];
                        }
                    });
                });
            });
        });
    });
    context('gen policy', function () {
        it('updates record if generation matches', function () {
            var key = keygen.integer(helper.namespace, helper.set)();
            var policy = new aerospike_1.default.WritePolicy({
                gen: aerospike_1.default.policy.gen.EQ
            });
            return client.put(key, { i: 1 })
                .then(function () { return client.get(key); })
                .then(function (record) { return (0, chai_1.expect)(record.gen).to.equal(1); })
                .then(function () { return client.put(key, { i: 2 }, { gen: 1 }, policy); })
                .then(function () { return client.get(key); })
                .then(function (record) {
                (0, chai_1.expect)(record.bins).to.eql({ i: 2 });
                (0, chai_1.expect)(record.gen).to.equal(2);
            })
                .then(function () { return client.remove(key); });
        });
        it('does not update record if generation does not match', function () {
            var key = keygen.integer(helper.namespace, helper.set)();
            var policy = new aerospike_1.default.WritePolicy({
                gen: aerospike_1.default.policy.gen.EQ
            });
            return client.put(key, { i: 1 })
                .then(function () { return client.get(key); })
                .then(function (record) { return (0, chai_1.expect)(record.gen).to.equal(1); })
                .then(function () { return client.put(key, { i: 2 }, { gen: 99 }, policy); })
                .catch(function (err) { return (0, chai_1.expect)(err.code).to.equal(status.ERR_RECORD_GENERATION); })
                .then(function () { return client.get(key); })
                .then(function (record) {
                (0, chai_1.expect)(record.bins).to.eql({ i: 1 });
                (0, chai_1.expect)(record.gen).to.equal(1);
            })
                .then(function () { return client.remove(key); });
        });
    });
});
