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
/* eslint-env mocha */
/* global expect */
/* eslint-disable no-unused-expressions */
var aerospike_1 = require("aerospike");
var chai_1 = require("chai");
var helper = require("./test_helper");
var Double = aerospike_1.default.Double;
var GeoJSON = aerospike_1.default.GeoJSON;
var keygen = helper.keygen;
var status = aerospike_1.default.status;
var AerospikeError = aerospike_1.default.AerospikeError;
var op = aerospike_1.default.operations;
context('Operations', function () {
    var client = helper.client;
    var key;
    beforeEach(function () {
        key = keygen.string(helper.namespace, helper.set, { prefix: 'test/operate' })();
        var bins = {
            string: 'abc',
            int: 123,
            double1: 1.23,
            double2: new Double(1.0),
            geo: new GeoJSON({ type: 'Point', coordinates: [103.913, 1.308] }),
            blob: Buffer.from('foo'),
            list: [1, 2, 3],
            map: { a: 1, b: 2, c: 3 }
        };
        var policy = new aerospike_1.default.WritePolicy({
            exists: aerospike_1.default.policy.exists.CREATE_OR_REPLACE
        });
        var meta = { ttl: 60 };
        return client.put(key, bins, meta, policy);
    });
    describe('Client#operate()', function () {
        describe('operations.write()', function () {
            it('writes a new value to a bin', function () {
                var ops = [
                    op.write('string', 'def'),
                    op.write('int', 432),
                    op.write('double1', 2.34),
                    op.write('double2', new Double(2.0)),
                    op.write('geo', new GeoJSON({ type: 'Point', coordinates: [123.456, 1.308] })),
                    op.write('blob', Buffer.from('bar')),
                    op.write('list', [2, 3, 4]),
                    op.write('map', { d: 4, e: 5, f: 6 }),
                    op.write('boolean', true)
                ];
                return client.operate(key, ops)
                    .then(function () { return client.get(key); })
                    .then(function (record) {
                    var _a, _b;
                    (0, chai_1.expect)(record.bins.string).to.equal('def');
                    (0, chai_1.expect)(record.bins.int).to.equal(432);
                    (0, chai_1.expect)(record.bins.double1).to.equal(2.34);
                    (0, chai_1.expect)(record.bins.double2).to.equal(2.0);
                    (0, chai_1.expect)((_b = (_a = new GeoJSON(record.bins.geo)).toJSON) === null || _b === void 0 ? void 0 : _b.call(_a)).to.eql({ type: 'Point', coordinates: [123.456, 1.308] });
                    (0, chai_1.expect)(record.bins.blob).to.eql(Buffer.from('bar'));
                    (0, chai_1.expect)(record.bins.list).to.eql([2, 3, 4]);
                    (0, chai_1.expect)(record.bins.map).to.eql({ d: 4, e: 5, f: 6 });
                    (0, chai_1.expect)(record.bins.boolean).to.eql(true);
                });
            });
            it('deletes a bin by writing null to it', function () {
                var ops = [
                    op.write('string', null)
                ];
                return client.operate(key, ops)
                    .then(function () { return client.get(key); })
                    .then(function (record) {
                    (0, chai_1.expect)(record.bins).to.not.have.key('string');
                });
            });
        });
        describe('operations.add()', function () {
            it('adds an integer value to a bin', function () {
                var ops = [
                    op.add('int', 432)
                ];
                return client.operate(key, ops)
                    .then(function () { return client.get(key); })
                    .then(function (record) {
                    (0, chai_1.expect)(record.bins.int).to.equal(555);
                });
            });
            it('adds a double value to a bin', function () {
                var ops = [
                    op.add('double1', 3.45),
                    op.add('double2', new Double(3.14159))
                ];
                return client.operate(key, ops)
                    .then(function () { return client.get(key); })
                    .then(function (record) {
                    (0, chai_1.expect)(record.bins.double1).to.equal(4.68);
                    (0, chai_1.expect)(record.bins.double2).to.equal(4.14159);
                });
            });
            it('can be called using the "incr" alias', function () {
                var ops = [
                    op.incr('int', 432)
                ];
                return client.operate(key, ops)
                    .then(function () { return client.get(key); })
                    .then(function (record) {
                    (0, chai_1.expect)(record.bins.int).to.equal(555);
                });
            });
            /*
            it('returns a parameter error when trying to add a string value', function () {
              const ops = [
                op.add('int', 'abc')
              ]
      
              return client.operate(key, ops)
                .catch(error => expect(error).to.be.instanceof(AerospikeError).with.property('code', status.ERR_PARAM))
            })
            */
        });
        describe('operations.append()', function () {
            it('appends a string value to a string bin', function () {
                var ops = [
                    op.append('string', 'def')
                ];
                return client.operate(key, ops)
                    .then(function () { return client.get(key); })
                    .then(function (record) {
                    (0, chai_1.expect)(record.bins.string).to.equal('abcdef');
                });
            });
            /*
            it('returns a parameter error when trying to append a numeric value', function () {
              const ops = [
                op.append('string', 123)
              ]
      
              return client.operate(key, ops)
                .catch(error => expect(error).to.be.instanceof(AerospikeError).with.property('code', status.ERR_PARAM))
            })
            */
        });
        describe('operations.prepend()', function () {
            it('prepends a string value to a string bin', function () {
                var ops = [
                    op.prepend('string', 'def')
                ];
                return client.operate(key, ops)
                    .then(function () { return client.get(key); })
                    .then(function (record) {
                    (0, chai_1.expect)(record.bins.string).to.equal('defabc');
                });
            });
            /*
            it('returns a parameter error when trying to prepend a numeric value', function () {
              const ops = [
                op.prepend('string', 123)
              ]
      
              return client.operate(key, ops)
                .catch(error => expect(error).to.be.instanceof(AerospikeError).with.property('code', status.ERR_PARAM))
            })
            */
        });
        describe('operations.touch()', function () {
            // TEST LOGIC
            // 1. Write a record to an aerospike server.
            // 2. Read the record to get the TTL and calculate the difference in
            //    the TTL written and the TTL returned by server.
            // 3. Touch the record with a defined TTL.
            // 4. Read the record and calculate the difference in the TTL between the
            //    touch TTL value and read TTL value.
            // 5. Compare the difference with the earlier difference observed.
            // 6. This is to account for the clock asynchronicity between the
            //    client and the server machines.
            // 7. Server returns the timestamp at which the record expires
            //    according the server clock.
            // 8. The client calculates and returns the TTL based on the returned
            //    timestamp. In case the client and server clocks are not in sync,
            //    the calculated TTL may seem to be inaccurate. Nevertheless, the
            //    server will expire the record at the correct time.
            it('updates the record\'s time-to-live (TTL)', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var key, bins, meta, record, ttlDiff, ops;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                key = keygen.string(helper.namespace, helper.set, { prefix: 'test/operate/ttl' })();
                                bins = { i: 123, s: 'abc' };
                                meta = { ttl: 1000 };
                                return [4 /*yield*/, client.put(key, bins, meta)];
                            case 1:
                                _a.sent();
                                return [4 /*yield*/, client.get(key)];
                            case 2:
                                record = _a.sent();
                                ttlDiff = record.ttl - meta.ttl;
                                ops = [
                                    op.touch(2592000) // 30 days
                                ];
                                return [4 /*yield*/, client.operate(key, ops)];
                            case 3:
                                _a.sent();
                                return [4 /*yield*/, client.get(key)];
                            case 4:
                                record = _a.sent();
                                (0, chai_1.expect)(record.ttl).to.be.above(2592000 + ttlDiff - 10);
                                (0, chai_1.expect)(record.ttl).to.be.below(2592000 + ttlDiff + 10);
                                return [4 /*yield*/, client.remove(key)];
                            case 5:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
        describe('operations.delete()', function () {
            helper.skipUnlessVersion('>= 4.7.0', this);
            it('deletes the record', function () {
                var ops = [op.delete()];
                return client.operate(key, ops)
                    .then(function () { return client.exists(key); })
                    .then(function (exists) { return (0, chai_1.expect)(exists).to.be.false; });
            });
            it('performs an atomic read-and-delete', function () {
                var ops = [
                    op.read('string'),
                    op.delete()
                ];
                return client.operate(key, ops)
                    .then(function (result) { return (0, chai_1.expect)(result.bins.string).to.eq('abc'); })
                    .then(function () { return client.exists(key); })
                    .then(function (exists) { return (0, chai_1.expect)(exists).to.be.false; });
            });
        });
        context('with OperatePolicy', function () {
            context('exists policy', function () {
                context('policy.exists.UPDATE', function () {
                    var policy = new aerospike_1.default.policy.OperatePolicy({
                        exists: aerospike_1.default.policy.exists.UPDATE
                    });
                    it('does not create a key that does not exist yet', function () {
                        var notExistentKey = keygen.string(helper.namespace, helper.set, { prefix: 'test/operate/doesNotExist' })();
                        var ops = [op.write('i', 49)];
                        return client.operate(notExistentKey, ops, {}, policy)
                            .then(function () { return 'error expected'; })
                            .catch(function (error) { return (0, chai_1.expect)(error).to.be.instanceof(AerospikeError).with.property('code', status.ERR_RECORD_NOT_FOUND); })
                            .then(function () { return client.exists(notExistentKey); })
                            .then(function (exists) { return (0, chai_1.expect)(exists).to.be.false; });
                    });
                });
            });
            context('readTouchTtlPercent policy', function () {
                helper.skipUnlessVersion('>= 7.1.0', this);
                this.timeout(4000);
                it('80% touches record', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var ops, policy, record;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    ops = [op.read('i')];
                                    policy = new aerospike_1.default.OperatePolicy({
                                        readTouchTtlPercent: 80
                                    });
                                    return [4 /*yield*/, client.put(new aerospike_1.default.Key('test', 'demo', 'operateTtl1'), { i: 2 }, { ttl: 10 })];
                                case 1:
                                    _a.sent();
                                    return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 3000); })];
                                case 2:
                                    _a.sent();
                                    return [4 /*yield*/, client.operate(new aerospike_1.default.Key('test', 'demo', 'operateTtl1'), ops, null, policy)];
                                case 3:
                                    record = _a.sent();
                                    (0, chai_1.expect)(record.bins).to.eql({ i: 2 });
                                    (0, chai_1.expect)(record.ttl).to.be.within(6, 8);
                                    return [4 /*yield*/, client.get(new aerospike_1.default.Key('test', 'demo', 'operateTtl1'), policy)];
                                case 4:
                                    record = _a.sent();
                                    (0, chai_1.expect)(record.bins).to.eql({ i: 2 });
                                    (0, chai_1.expect)(record.ttl).to.be.within(9, 11);
                                    return [4 /*yield*/, client.remove(new aerospike_1.default.Key('test', 'demo', 'operateTtl1'))];
                                case 5:
                                    _a.sent();
                                    return [2 /*return*/];
                            }
                        });
                    });
                });
                it('60% does not touch record', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var ops, policy, record;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    ops = [op.read('i')];
                                    policy = new aerospike_1.default.OperatePolicy({
                                        readTouchTtlPercent: 60
                                    });
                                    return [4 /*yield*/, client.put(new aerospike_1.default.Key('test', 'demo', 'operateTtl1'), { i: 2 }, { ttl: 10 })];
                                case 1:
                                    _a.sent();
                                    return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 3000); })];
                                case 2:
                                    _a.sent();
                                    return [4 /*yield*/, client.operate(new aerospike_1.default.Key('test', 'demo', 'operateTtl1'), ops, null, policy)];
                                case 3:
                                    record = _a.sent();
                                    (0, chai_1.expect)(record.bins).to.eql({ i: 2 });
                                    (0, chai_1.expect)(record.ttl).to.be.within(6, 8);
                                    return [4 /*yield*/, client.get(new aerospike_1.default.Key('test', 'demo', 'operateTtl1'), policy)];
                                case 4:
                                    record = _a.sent();
                                    (0, chai_1.expect)(record.bins).to.eql({ i: 2 });
                                    (0, chai_1.expect)(record.ttl).to.be.within(6, 8);
                                    return [4 /*yield*/, client.remove(new aerospike_1.default.Key('test', 'demo', 'operateTtl1'))];
                                case 5:
                                    _a.sent();
                                    return [2 /*return*/];
                            }
                        });
                    });
                });
            });
            context('gen policy', function () {
                context('policy.gen.EQ', function () {
                    var policy = new aerospike_1.default.OperatePolicy({
                        gen: aerospike_1.default.policy.gen.EQ
                    });
                    it('executes the operation if the generation matches', function () {
                        var ops = [op.add('int', 7)];
                        var meta = { gen: 1 };
                        return client.operate(key, ops, meta, policy)
                            .then(function () { return client.get(key); })
                            .then(function (record) { return (0, chai_1.expect)(record.bins.int).to.equal(130); });
                    });
                    it('rejects the operation if the generation does not match', function () {
                        var ops = [op.add('int', 7)];
                        var meta = { gen: 99 };
                        return client.operate(key, ops, meta, policy)
                            .then(function () { return 'error expected'; })
                            .catch(function (error) {
                            (0, chai_1.expect)(error).to.be.instanceof(AerospikeError)
                                .with.property('code', status.ERR_RECORD_GENERATION);
                            return Promise.resolve(true);
                        })
                            .then(function () { return client.get(key); })
                            .then(function (record) { return (0, chai_1.expect)(record.bins.int).to.equal(123); });
                    });
                });
            });
            context('with deserialize: false', function () {
                var policy = new aerospike_1.default.OperatePolicy({
                    deserialize: false
                });
                it('returns list and map bins as byte buffers', function () {
                    var ops = [op.read('int'), op.read('list'), op.read('map')];
                    return client.operate(key, ops, null, policy)
                        .then(function (record) {
                        (0, chai_1.expect)(record.bins.int).to.equal(123);
                        (0, chai_1.expect)(record.bins.list).to.eql(Buffer.from([0x93, 0x01, 0x02, 0x03]));
                        (0, chai_1.expect)(record.bins.map).to.eql(Buffer.from([0x84, 0xc7, 0x00, 0x01, 0xc0, 0xa2, 0x03, 0x61, 0x01, 0xa2, 0x03, 0x62, 0x02, 0xa2, 0x03, 0x63, 0x03]));
                    });
                });
            });
        });
        it('calls the callback function with the results of the operation', function (done) {
            var ops = [
                op.read('int')
            ];
            client.operate(key, ops, function (error, result) {
                if (error)
                    throw error;
                (0, chai_1.expect)(result === null || result === void 0 ? void 0 : result.bins.int).to.equal(123);
                done();
            });
        });
    });
    describe('Client#add', function () {
        it('acts as a shortcut for the add operation', function () {
            return client.add(key, { int: 234 })
                .then(function () { return client.get(key); })
                .then(function (record) {
                (0, chai_1.expect)(record.bins.int).to.equal(357);
            });
        });
    });
    describe('Client#incr', function () {
        it('acts as a shortcut for the add operation', function () {
            return client.incr(key, { int: 234 })
                .then(function () { return client.get(key); })
                .then(function (record) {
                (0, chai_1.expect)(record.bins.int).to.equal(357);
            });
        });
    });
    describe('Client#append', function () {
        it('acts as a shortcut for the append operation', function () {
            return client.append(key, { string: 'def' })
                .then(function () { return client.get(key); })
                .then(function (record) {
                (0, chai_1.expect)(record.bins.string).to.equal('abcdef');
            });
        });
    });
    describe('Client#prepend', function () {
        it('acts as a shortcut for the prepend operation', function () {
            return client.prepend(key, { string: 'def' })
                .then(function () { return client.get(key); })
                .then(function (record) {
                (0, chai_1.expect)(record.bins.string).to.equal('defabc');
            });
        });
    });
});
