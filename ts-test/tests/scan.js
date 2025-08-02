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
/* global expect, describe, it, before, after, context */
/* eslint-disable no-unused-expressions */
var aerospike_1 = require("aerospike");
var chai_1 = require("chai");
var helper = require("./test_helper");
var Scan = aerospike_1.default.Scan;
var Job = aerospike_1.default.Job;
var Key = aerospike_1.default.Key;
var op = aerospike_1.default.operations;
var keygen = helper.keygen;
var metagen = helper.metagen;
var putgen = helper.putgen;
var recgen = helper.recgen;
var valgen = helper.valgen;
context('Scans', function () {
    var client = helper.client;
    var testSet = 'test/scan-' + Math.floor(Math.random() * 100000);
    var numberOfRecords = 100;
    var keys = [];
    before(function () { return helper.udf.register('udf.lua')
        .then(function () {
        var config = {
            keygen: keygen.string(helper.namespace, testSet, { prefix: 'test/scan/', random: false }),
            recgen: recgen.record({ i: valgen.integer(), s: valgen.string() }),
            metagen: metagen.constant({ ttl: 300 }),
            policy: new aerospike_1.default.WritePolicy({
                totalTimeout: 1000,
                key: aerospike_1.default.policy.key.SEND,
                exists: aerospike_1.default.policy.exists.CREATE_OR_REPLACE
            })
        };
        return putgen.put(numberOfRecords, config)
            .then(function (records) { keys = records.map(function (rec) { return rec.key; }); });
    }); });
    after(function () { return helper.udf.remove('udf.lua'); });
    describe('client.scan()', function () {
        it('creates a new Scan instance and sets up it\'s properties', function () {
            var namespace = helper.namespace;
            var set = 'demo';
            var options = {
                concurrent: true,
                select: ['a', 'b', 'c'],
                nobins: false
            };
            var scan = client.scan(namespace, set, options);
            (0, chai_1.expect)(scan).to.be.instanceof(Scan);
            (0, chai_1.expect)(scan.ns).to.equal(helper.namespace);
            (0, chai_1.expect)(scan.set).to.equal('demo');
            (0, chai_1.expect)(scan.concurrent).to.be.true;
            (0, chai_1.expect)(scan.selected).to.eql(['a', 'b', 'c']);
            (0, chai_1.expect)(scan.nobins).to.be.false;
        });
        it('creates a scan without specifying the set', function () {
            var namespace = helper.namespace;
            var scan = client.scan(namespace, { select: ['i'] });
            (0, chai_1.expect)(scan).to.be.instanceof(Scan);
            (0, chai_1.expect)(scan.ns).to.equal(helper.namespace);
            (0, chai_1.expect)(scan.set).to.be.null;
            (0, chai_1.expect)(scan.selected).to.eql(['i']);
        });
    });
    describe('scan.select()', function () {
        it('sets the selected bins from an argument list', function () {
            var scan = client.scan(helper.namespace, helper.namespace);
            scan.select('a', 'b', 'c');
            (0, chai_1.expect)(scan.selected).to.eql(['a', 'b', 'c']);
        });
        it('sets the selected bins from an array', function () {
            var scan = client.scan(helper.namespace, helper.namespace);
            scan.select(['a', 'b', 'c']);
            (0, chai_1.expect)(scan.selected).to.eql(['a', 'b', 'c']);
        });
    });
    describe('scan.foreach() #slow', function () {
        it('retrieves all records in the set', function (done) {
            this.timeout(10000); // 10 second timeout
            var scan = client.scan(helper.namespace, testSet);
            var recordsReceived = 0;
            var stream = scan.foreach();
            stream.on('data', function () { return recordsReceived++; });
            stream.on('end', function () {
                (0, chai_1.expect)(recordsReceived).to.equal(numberOfRecords);
                done();
            });
        });
        describe('scan.paginate', function () {
            it('Paginates with the correct amount of keys and pages', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var recordsReceived, recordTotal, pageTotal, lastPage, maxRecs, scan, _loop_1, state_1;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                this.timeout(15000);
                                recordsReceived = 0;
                                recordTotal = 0;
                                pageTotal = 0;
                                lastPage = 11;
                                maxRecs = 10;
                                scan = client.scan(helper.namespace, testSet, { paginate: true });
                                _loop_1 = function () {
                                    var stream;
                                    return __generator(this, function (_b) {
                                        switch (_b.label) {
                                            case 0:
                                                stream = scan.foreach({ maxRecords: maxRecs });
                                                stream.on('error', function (error) { throw error; });
                                                stream.on('data', function (record) {
                                                    recordsReceived++;
                                                });
                                                return [4 /*yield*/, new Promise(function (resolve) {
                                                        stream.on('end', function (scanState) {
                                                            scan.scanState = scanState;
                                                            resolve();
                                                        });
                                                    })];
                                            case 1:
                                                _b.sent();
                                                pageTotal += 1;
                                                if (recordsReceived !== maxRecs) {
                                                    recordTotal += recordsReceived;
                                                    (0, chai_1.expect)(scan.scanState).to.equal(undefined);
                                                    (0, chai_1.expect)(pageTotal).to.equal(lastPage);
                                                    (0, chai_1.expect)(recordTotal).to.equal(numberOfRecords);
                                                    return [2 /*return*/, "break"];
                                                }
                                                else {
                                                    recordTotal += recordsReceived;
                                                    recordsReceived = 0;
                                                }
                                                return [2 /*return*/];
                                        }
                                    });
                                };
                                _a.label = 1;
                            case 1:
                                if (!1) return [3 /*break*/, 3];
                                return [5 /*yield**/, _loop_1()];
                            case 2:
                                state_1 = _a.sent();
                                if (state_1 === "break")
                                    return [3 /*break*/, 3];
                                return [3 /*break*/, 1];
                            case 3: return [2 /*return*/];
                        }
                    });
                });
            });
            it('Paginates correctly using scan.hasNextPage() and scan.nextPage()', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var recordsReceived, recordTotal, pageTotal, lastPage, maxRecs, scan, _loop_2, state_2;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                this.timeout(15000);
                                recordsReceived = 0;
                                recordTotal = 0;
                                pageTotal = 0;
                                lastPage = 11;
                                maxRecs = 10;
                                scan = client.scan(helper.namespace, testSet, { paginate: true });
                                _loop_2 = function () {
                                    var stream;
                                    return __generator(this, function (_b) {
                                        switch (_b.label) {
                                            case 0:
                                                stream = scan.foreach({ maxRecords: maxRecs });
                                                stream.on('error', function (error) { throw error; });
                                                stream.on('data', function (record) {
                                                    recordsReceived++;
                                                });
                                                return [4 /*yield*/, new Promise(function (resolve) {
                                                        stream.on('end', function (scanState) {
                                                            scan.nextPage(scanState);
                                                            resolve();
                                                        });
                                                    })];
                                            case 1:
                                                _b.sent();
                                                pageTotal += 1;
                                                if (recordsReceived !== maxRecs) {
                                                    recordTotal += recordsReceived;
                                                    (0, chai_1.expect)(scan.hasNextPage()).to.equal(false);
                                                    (0, chai_1.expect)(pageTotal).to.equal(lastPage);
                                                    (0, chai_1.expect)(recordTotal).to.equal(numberOfRecords);
                                                    return [2 /*return*/, "break"];
                                                }
                                                else {
                                                    recordTotal += recordsReceived;
                                                    recordsReceived = 0;
                                                }
                                                return [2 /*return*/];
                                        }
                                    });
                                };
                                _a.label = 1;
                            case 1:
                                if (!1) return [3 /*break*/, 3];
                                return [5 /*yield**/, _loop_2()];
                            case 2:
                                state_2 = _a.sent();
                                if (state_2 === "break")
                                    return [3 /*break*/, 3];
                                return [3 /*break*/, 1];
                            case 3: return [2 /*return*/];
                        }
                    });
                });
            });
            it('Paginates correctly using scan.results()', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var recordsReceived, recordTotal, pageTotal, lastPage, maxRecs, scan, _loop_3, state_3;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                this.timeout(15000);
                                recordsReceived = 0;
                                recordTotal = 0;
                                pageTotal = 0;
                                lastPage = 11;
                                maxRecs = 10;
                                scan = client.scan(helper.namespace, testSet, { paginate: true });
                                _loop_3 = function () {
                                    var stream;
                                    return __generator(this, function (_b) {
                                        switch (_b.label) {
                                            case 0:
                                                stream = scan.foreach({ maxRecords: maxRecs });
                                                stream.on('error', function (error) { throw error; });
                                                stream.on('data', function (record) {
                                                    recordsReceived++;
                                                });
                                                return [4 /*yield*/, new Promise(function (resolve) {
                                                        stream.on('end', function (scanState) {
                                                            scan.nextPage(scanState);
                                                            resolve();
                                                        });
                                                    })];
                                            case 1:
                                                _b.sent();
                                                pageTotal += 1;
                                                if (recordsReceived !== maxRecs) {
                                                    recordTotal += recordsReceived;
                                                    (0, chai_1.expect)(scan.hasNextPage()).to.equal(false);
                                                    (0, chai_1.expect)(pageTotal).to.equal(lastPage);
                                                    (0, chai_1.expect)(recordTotal).to.equal(numberOfRecords);
                                                    return [2 /*return*/, "break"];
                                                }
                                                else {
                                                    recordTotal += recordsReceived;
                                                    recordsReceived = 0;
                                                }
                                                return [2 /*return*/];
                                        }
                                    });
                                };
                                _a.label = 1;
                            case 1:
                                if (!1) return [3 /*break*/, 3];
                                return [5 /*yield**/, _loop_3()];
                            case 2:
                                state_3 = _a.sent();
                                if (state_3 === "break")
                                    return [3 /*break*/, 3];
                                return [3 /*break*/, 1];
                            case 3: return [2 /*return*/];
                        }
                    });
                });
            });
        });
        it('retrieves all records from the given partitions', function (done) {
            var scan = client.scan(helper.namespace, testSet);
            var recordsReceived = 0;
            scan.partitions(0, 4096);
            var stream = scan.foreach();
            stream.on('data', function () { return recordsReceived++; });
            stream.on('end', function () {
                (0, chai_1.expect)(recordsReceived).to.equal(numberOfRecords);
                done();
            });
        });
        it('returns the key if it is stored on the server', function (done) {
            this.timeout(10000); // 10 second timeout
            // requires { key: Aerospike.policy.key.SEND } when creating the record
            var scan = client.scan(helper.namespace, testSet);
            var stream = scan.foreach();
            stream.on('data', function (record) {
                (0, chai_1.expect)(record.key).to.be.instanceof(Key);
                (0, chai_1.expect)(record.key.key).to.not.be.empty;
                stream.abort();
            });
            stream.on('end', done);
        });
        it('attaches event handlers to the stream', function (done) {
            this.timeout(10000); // 10 second timeout
            var scan = client.scan(helper.namespace, testSet);
            var dataHandlerCalled = false;
            var stream = scan.foreach(null, function (_record) {
                dataHandlerCalled = true;
                stream.abort();
            }, function (error) { throw error; }, function () {
                (0, chai_1.expect)(dataHandlerCalled).to.be.true;
                done();
            });
        });
        it('sets a scan policy', function (done) {
            this.timeout(10000); // 10 second timeout
            var scan = client.scan(helper.namespace, testSet);
            var policy = new aerospike_1.default.ScanPolicy({
                totalTimeout: 10000,
                socketTimeout: 10000,
                durableDelete: true,
                recordsPerSecond: 50,
                maxRecords: 5000
            });
            var stream = scan.foreach(policy);
            stream.on('data', function () { return stream.abort(); });
            stream.on('error', function (error) {
                if (error.code === aerospike_1.default.status.ERR_TIMEOUT) {
                    // ignore errors caused by cluster change events
                }
                else {
                    throw error;
                }
            });
            stream.on('end', done);
        });
        context('with nobins set to true', function () {
            it('should return only meta data', function (done) {
                this.timeout(10000); // 10 second timeout
                var scan = client.scan(helper.namespace, testSet, { nobins: true });
                var stream = scan.foreach();
                stream.on('data', function (record) {
                    (0, chai_1.expect)(record.bins).to.be.empty;
                    (0, chai_1.expect)(record.gen).to.be.ok;
                    (0, chai_1.expect)(record.ttl).to.be.ok;
                    stream.abort();
                });
                stream.on('end', done);
            });
        });
        context('with bin selection', function () {
            it('should return only selected bins', function (done) {
                this.timeout(10000); // 10 second timeout
                var scan = client.scan(helper.namespace, testSet);
                scan.select('i');
                var stream = scan.foreach();
                stream.on('data', function (record) {
                    (0, chai_1.expect)(record.bins).to.have.all.keys('i');
                    stream.abort();
                });
                stream.on('end', done);
            });
        });
        context('with max records limit', function () {
            helper.skipUnlessVersion('>= 4.9.0', this);
            it('returns at most X number of records', function (done) {
                this.timeout(10000); // 10 second timeout
                var scan = client.scan(helper.namespace, testSet, { nobins: true });
                var maxRecords = 33;
                var stream = scan.foreach({ maxRecords: maxRecords });
                var recordsReceived = 0;
                stream.on('data', function () { return recordsReceived++; });
                stream.on('end', function () {
                    // The actual number returned may be less than maxRecords if node
                    // record counts are small and unbalanced across nodes.
                    (0, chai_1.expect)(recordsReceived).to.be.at.most(maxRecords);
                    done();
                });
            });
        });
        context('without set', function () {
            it('executes a scan without set', function (done) {
                this.timeout(10000); // 10 second timeout
                var scan = client.scan(helper.namespace);
                var recordsReceived = 0;
                var stream = scan.foreach();
                stream.on('error', function (error) { throw error; });
                stream.on('data', function () {
                    recordsReceived++;
                    stream.abort();
                });
                stream.on('end', function () {
                    (0, chai_1.expect)(recordsReceived).to.equal(1);
                    done();
                });
            });
        });
    });
    describe('scan.background()', function () {
        it('applies a UDF to every record', function (done) {
            var token = valgen.string({ length: { min: 10, max: 10 } })();
            var backgroundScan = client.scan(helper.namespace, testSet);
            backgroundScan.background('udf', 'updateRecord', ['x', token], function (err, job) {
                if (err)
                    throw err;
                job.waitUntilDone(10, function (err) {
                    if (err)
                        throw err;
                    var validationScan = client.scan(helper.namespace, testSet);
                    var stream = validationScan.foreach();
                    stream.on('error', function (error) { throw error; });
                    stream.on('data', function (record) { return (0, chai_1.expect)(record.bins.x).to.equal(token); });
                    stream.on('end', done);
                });
            });
        });
        it('returns a Promise that resolves to a Job', function () {
            var backgroundScan = client.scan(helper.namespace, testSet);
            return backgroundScan.background('udf', 'noop')
                .then(function (job) {
                (0, chai_1.expect)(job).to.be.instanceof(Job);
            });
        });
    });
    describe('scan.operate()', function () {
        helper.skipUnlessVersion('>= 4.7.0', this);
        it('should perform a background scan that executes the operations #slow', function () {
            return __awaiter(this, void 0, void 0, function () {
                var scan, ops, job, key, record;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            scan = client.scan(helper.namespace, testSet);
                            ops = [op.write('backgroundOps', 1)];
                            return [4 /*yield*/, scan.operate(ops)];
                        case 1:
                            job = _a.sent();
                            return [4 /*yield*/, job.waitUntilDone()];
                        case 2:
                            _a.sent();
                            key = keys[Math.floor(Math.random() * keys.length)];
                            return [4 /*yield*/, client.get(key)];
                        case 3:
                            record = _a.sent();
                            (0, chai_1.expect)(record.bins.backgroundOps).to.equal(1);
                            return [2 /*return*/];
                    }
                });
            });
        });
        it('should set TTL to the specified value #slow', function () {
            return __awaiter(this, void 0, void 0, function () {
                var scan, ops, job, key, record;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            scan = client.scan(helper.namespace, testSet);
                            scan.ttl = 10800;
                            ops = [op.incr('backgroundOps', 1)];
                            return [4 /*yield*/, scan.operate(ops)];
                        case 1:
                            job = _a.sent();
                            return [4 /*yield*/, job.waitUntilDone()];
                        case 2:
                            _a.sent();
                            key = keys[Math.floor(Math.random() * keys.length)];
                            return [4 /*yield*/, client.get(key)];
                        case 3:
                            record = _a.sent();
                            (0, chai_1.expect)(record.ttl).to.be.within(10798, 10800);
                            return [2 /*return*/];
                    }
                });
            });
        });
        it('should set TTL to the specified value with scan options #slow', function () {
            return __awaiter(this, void 0, void 0, function () {
                var scan, ops, job, key, record;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            scan = client.scan(helper.namespace, testSet, { ttl: 14400 });
                            ops = [op.incr('backgroundOps', 1)];
                            return [4 /*yield*/, scan.operate(ops)];
                        case 1:
                            job = _a.sent();
                            return [4 /*yield*/, job.waitUntilDone()];
                        case 2:
                            _a.sent();
                            key = keys[Math.floor(Math.random() * keys.length)];
                            return [4 /*yield*/, client.get(key)];
                        case 3:
                            record = _a.sent();
                            (0, chai_1.expect)(record.ttl).to.be.within(14398, 14400);
                            return [2 /*return*/];
                    }
                });
            });
        });
        it('should perform a background scan that executes the touch operation #slow', function () {
            return __awaiter(this, void 0, void 0, function () {
                var ttl, scan, job, key, record;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            ttl = 123;
                            scan = client.scan(helper.namespace, testSet);
                            return [4 /*yield*/, scan.operate([aerospike_1.default.operations.touch(ttl)])];
                        case 1:
                            job = _a.sent();
                            return [4 /*yield*/, job.waitUntilDone()];
                        case 2:
                            _a.sent();
                            key = keys[Math.floor(Math.random() * keys.length)];
                            return [4 /*yield*/, client.get(key)];
                        case 3:
                            record = _a.sent();
                            console.log('After scan-op TTL : %d Key TTL: %d', ttl, record.ttl);
                            (0, chai_1.expect)(record.ttl).to.be.within(ttl - 2, ttl);
                            return [2 /*return*/];
                    }
                });
            });
        });
    });
    describe('stream.abort()', function () {
        it('should stop the scan when the stream is aborted', function (done) {
            var scan = client.scan(helper.namespace, testSet);
            var stream = scan.foreach();
            var recordsReceived = 0;
            stream.on('data', function () {
                recordsReceived++;
                if (recordsReceived === 5) {
                    stream.abort();
                }
            });
            stream.on('end', function () {
                (0, chai_1.expect)(recordsReceived).to.equal(5);
                done();
            });
        });
    });
    describe('job.info()', function () {
        it('returns the scan status and progress', function (done) {
            var scan = client.scan(helper.namespace, testSet);
            scan.background('udf', 'noop', function (error, job) {
                if (error)
                    throw error;
                job.info(function (error, info) {
                    if (error)
                        throw error;
                    (0, chai_1.expect)(info.status).to.be.within(aerospike_1.default.jobStatus.INPROGRESS, aerospike_1.default.jobStatus.COMPLETED);
                    (0, chai_1.expect)(info.recordsRead).to.be.within(0, numberOfRecords);
                    (0, chai_1.expect)(info.progressPct).to.be.within(0, 100);
                    done();
                });
            });
        });
    });
});
