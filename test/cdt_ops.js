/*******************************************************************************
 * Copyright 2013-2014 Aerospike, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 ******************************************************************************/

// we want to test the built aerospike module
var aerospike = require('../lib/aerospike');
var options = require('./util/options');
var assert = require('assert');
var expect = require('expect.js');

var keygen = require('./generators/key');
var metagen = require('./generators/metadata');
var recgen = require('./generators/record');

var status = aerospike.status;
var policy = aerospike.policy;
var op = aerospike.operator;

describe('client.operate()', function() {

    var config = options.getConfig();
    var client = aerospike.client(config);

    before(function(done) {
        client.connect(function(err){
            done();
        });
    });

    after(function(done) {
        client.close();
        client = null;
        done();
    });

    describe('operator.listAppend', function() {

        it('should append the given item at the end of the list', function(done) {

            // generators
            var kgen = keygen.string(options.namespace, options.set, {prefix: "test/cdt/append/"});
            var mgen = metagen.constant({ttl: 1000});
            var rgen = recgen.constant({list: [1, 2, 3, 4, 5]});

            // values
            var key     = kgen();
            var meta    = mgen(key);
            var record  = rgen(key, meta);

            // write the record then check
            client.put(key, record, meta, function(err, key) {

                var ops = [
                    op.listAppend('list', 99)
                ];

                client.operate(key, ops, function(err, record1, metadata1, key1) {
                    expect(err).to.be.ok();
                    expect(err.code).to.equal(status.AEROSPIKE_OK);

                    client.get(key, function(err, record2, metadata2, key2) {
                        expect(err).to.be.ok();
                        expect(err.code).to.equal(status.AEROSPIKE_OK);

                        expect(record2.list).to.eql([1, 2, 3, 4, 5, 99]);

                        client.remove(key1, function(err, key){
                            done();
                        });
                    });
                });
            });
        });

    });

    describe('operator.listAppendItems', function() {

        it('should append the given items at the end of the list', function(done) {

            // generators
            var kgen = keygen.string(options.namespace, options.set, {prefix: "test/cdt/append_items/"});
            var mgen = metagen.constant({ttl: 1000});
            var rgen = recgen.constant({list: [1, 2, 3, 4, 5]});

            // values
            var key     = kgen();
            var meta    = mgen(key);
            var record  = rgen(key, meta);

            // write the record then check
            client.put(key, record, meta, function(err, key) {

                var ops = [
                    op.listAppendItems('list', [99, 100])
                ];

                client.operate(key, ops, function(err, record1, metadata1, key1) {
                    expect(err).to.be.ok();
                    expect(err.code).to.equal(status.AEROSPIKE_OK);

                    client.get(key, function(err, record2, metadata2, key2) {
                        expect(err).to.be.ok();
                        expect(err.code).to.equal(status.AEROSPIKE_OK);

                        expect(record2.list).to.eql([1, 2, 3, 4, 5, 99, 100]);

                        client.remove(key1, function(err, key){
                            done();
                        });
                    });
                });
            });
        });

    });

    describe('operator.listInsert', function() {

        it('should insert the given item at the specified index of the list', function(done) {

            // generators
            var kgen = keygen.string(options.namespace, options.set, {prefix: "test/cdt/insert/"});
            var mgen = metagen.constant({ttl: 1000});
            var rgen = recgen.constant({list: [1, 2, 3, 4, 5]});

            // values
            var key     = kgen();
            var meta    = mgen(key);
            var record  = rgen(key, meta);

            // write the record then check
            client.put(key, record, meta, function(err, key) {

                var ops = [
                    op.listInsert('list', 2, 99)
                ];

                client.operate(key, ops, function(err, record1, metadata1, key1) {
                    expect(err).to.be.ok();
                    expect(err.code).to.equal(status.AEROSPIKE_OK);

                    client.get(key, function(err, record2, metadata2, key2) {
                        expect(err).to.be.ok();
                        expect(err.code).to.equal(status.AEROSPIKE_OK);

                        expect(record2.list).to.eql([1, 2, 99, 3, 4, 5]);

                        client.remove(key1, function(err, key){
                            done();
                        });
                    });
                });
            });
        });

    });

    describe('operator.listInsertItems', function() {

        it('should insert the given items at the specified index of the list', function(done) {

            // generators
            var kgen = keygen.string(options.namespace, options.set, {prefix: "test/cdt/insert_items/"});
            var mgen = metagen.constant({ttl: 1000});
            var rgen = recgen.constant({list: [1, 2, 3, 4, 5]});

            // values
            var key     = kgen();
            var meta    = mgen(key);
            var record  = rgen(key, meta);

            // write the record then check
            client.put(key, record, meta, function(err, key) {

                var ops = [
                    op.listInsertItems('list', 2, [99, 100])
                ];

                client.operate(key, ops, function(err, record1, metadata1, key1) {
                    expect(err).to.be.ok();
                    expect(err.code).to.equal(status.AEROSPIKE_OK);

                    client.get(key, function(err, record2, metadata2, key2) {
                        expect(err).to.be.ok();
                        expect(err.code).to.equal(status.AEROSPIKE_OK);

                        expect(record2.list).to.eql([1, 2, 99, 100, 3, 4, 5]);

                        client.remove(key1, function(err, key){
                            done();
                        });
                    });
                });
            });
        });

    });

    describe('operator.listPop', function() {

        it('should remove the item at the specified index and return it', function(done) {

            // generators
            var kgen = keygen.string(options.namespace, options.set, {prefix: "test/cdt/pop/"});
            var mgen = metagen.constant({ttl: 1000});
            var rgen = recgen.constant({list: [1, 2, 3, 4, 5]});

            // values
            var key     = kgen();
            var meta    = mgen(key);
            var record  = rgen(key, meta);

            // write the record then check
            client.put(key, record, meta, function(err, key) {

                var ops = [
                    op.listPop('list', 2)
                ];

                client.operate(key, ops, function(err, record1, metadata1, key1) {
                    expect(err).to.be.ok();
                    expect(err.code).to.equal(status.AEROSPIKE_OK);

                    expect(record1.list).to.eql(3);

                    client.get(key, function(err, record2, metadata2, key2) {
                        expect(err).to.be.ok();
                        expect(err.code).to.equal(status.AEROSPIKE_OK);

                        expect(record2.list).to.eql([1, 2, 4, 5]);

                        client.remove(key1, function(err, key){
                            done();
                        });
                    });
                });
            });
        });

    });

    describe('operator.listPopRange', function() {

        it('should remove the items at the specified range and return them', function(done) {

            // generators
            var kgen = keygen.string(options.namespace, options.set, {prefix: "test/cdt/pop_range/"});
            var mgen = metagen.constant({ttl: 1000});
            var rgen = recgen.constant({list: [1, 2, 3, 4, 5]});

            // values
            var key     = kgen();
            var meta    = mgen(key);
            var record  = rgen(key, meta);

            // write the record then check
            client.put(key, record, meta, function(err, key) {

                var ops = [
                    op.listPopRange('list', 2, 2)
                ];

                client.operate(key, ops, function(err, record1, metadata1, key1) {
                    expect(err).to.be.ok();
                    expect(err.code).to.equal(status.AEROSPIKE_OK);

                    expect(record1.list).to.eql([3, 4]);

                    client.get(key, function(err, record2, metadata2, key2) {
                        expect(err).to.be.ok();
                        expect(err.code).to.equal(status.AEROSPIKE_OK);

                        expect(record2.list).to.eql([1, 2, 5]);

                        client.remove(key1, function(err, key){
                            done();
                        });
                    });
                });
            });
        });

        it('should remove and return all items from the specified index if count is not specified', function(done) {

            // generators
            var kgen = keygen.string(options.namespace, options.set, {prefix: "test/cdt/pop_range_from/"});
            var mgen = metagen.constant({ttl: 1000});
            var rgen = recgen.constant({list: [1, 2, 3, 4, 5]});

            // values
            var key     = kgen();
            var meta    = mgen(key);
            var record  = rgen(key, meta);

            // write the record then check
            client.put(key, record, meta, function(err, key) {

                var ops = [
                    op.listPopRange('list', 2)
                ];

                client.operate(key, ops, function(err, record1, metadata1, key1) {
                    expect(err).to.be.ok();
                    expect(err.code).to.equal(status.AEROSPIKE_OK);

                    expect(record1.list).to.eql([3, 4, 5]);

                    client.get(key, function(err, record2, metadata2, key2) {
                        expect(err).to.be.ok();
                        expect(err.code).to.equal(status.AEROSPIKE_OK);

                        expect(record2.list).to.eql([1, 2]);

                        client.remove(key1, function(err, key){
                            done();
                        });
                    });
                });
            });
        });

    });

    describe('operator.listRemove', function() {

        it('should remove the item at the specified index', function(done) {

            // generators
            var kgen = keygen.string(options.namespace, options.set, {prefix: "test/cdt/remove/"});
            var mgen = metagen.constant({ttl: 1000});
            var rgen = recgen.constant({list: [1, 2, 3, 4, 5]});

            // values
            var key     = kgen();
            var meta    = mgen(key);
            var record  = rgen(key, meta);

            // write the record then check
            client.put(key, record, meta, function(err, key) {

                var ops = [
                    op.listRemove('list', 2)
                ];

                client.operate(key, ops, function(err, record1, metadata1, key1) {
                    expect(err).to.be.ok();
                    expect(err.code).to.equal(status.AEROSPIKE_OK);

                    client.get(key, function(err, record2, metadata2, key2) {
                        expect(err).to.be.ok();
                        expect(err.code).to.equal(status.AEROSPIKE_OK);

                        expect(record2.list).to.eql([1, 2, 4, 5]);

                        client.remove(key1, function(err, key){
                            done();
                        });
                    });
                });
            });
        });

    });

    describe('operator.listRemoveRange', function() {

        it('should remove the items at the specified range', function(done) {

            // generators
            var kgen = keygen.string(options.namespace, options.set, {prefix: "test/cdt/remove_range/"});
            var mgen = metagen.constant({ttl: 1000});
            var rgen = recgen.constant({list: [1, 2, 3, 4, 5]});

            // values
            var key     = kgen();
            var meta    = mgen(key);
            var record  = rgen(key, meta);

            // write the record then check
            client.put(key, record, meta, function(err, key) {

                var ops = [
                    op.listRemoveRange('list', 2, 2)
                ];

                client.operate(key, ops, function(err, record1, metadata1, key1) {
                    expect(err).to.be.ok();
                    expect(err.code).to.equal(status.AEROSPIKE_OK);

                    client.get(key, function(err, record2, metadata2, key2) {
                        expect(err).to.be.ok();
                        expect(err.code).to.equal(status.AEROSPIKE_OK);

                        expect(record2.list).to.eql([1, 2, 5]);

                        client.remove(key1, function(err, key){
                            done();
                        });
                    });
                });
            });
        });

        it('should remove all items from the specified index if count is not specified', function(done) {

            // generators
            var kgen = keygen.string(options.namespace, options.set, {prefix: "test/cdt/remove_range_from/"});
            var mgen = metagen.constant({ttl: 1000});
            var rgen = recgen.constant({list: [1, 2, 3, 4, 5]});

            // values
            var key     = kgen();
            var meta    = mgen(key);
            var record  = rgen(key, meta);

            // write the record then check
            client.put(key, record, meta, function(err, key) {

                var ops = [
                    op.listRemoveRange('list', 2)
                ];

                client.operate(key, ops, function(err, record1, metadata1, key1) {
                    expect(err).to.be.ok();
                    expect(err.code).to.equal(status.AEROSPIKE_OK);

                    client.get(key, function(err, record2, metadata2, key2) {
                        expect(err).to.be.ok();
                        expect(err.code).to.equal(status.AEROSPIKE_OK);

                        expect(record2.list).to.eql([1, 2]);

                        client.remove(key1, function(err, key){
                            done();
                        });
                    });
                });
            });
        });

    });

    describe('operator.listClear', function() {

        it('should remove all elements from the list', function(done) {

            // generators
            var kgen = keygen.string(options.namespace, options.set, {prefix: "test/cdt/clear/"});
            var mgen = metagen.constant({ttl: 1000});
            var rgen = recgen.constant({list: [1, 2, 3, 4, 5]});

            // values
            var key     = kgen();
            var meta    = mgen(key);
            var record  = rgen(key, meta);

            // write the record then check
            client.put(key, record, meta, function(err, key) {

                var ops = [
                    op.listClear('list')
                ];

                client.operate(key, ops, function(err, record1, metadata1, key1) {
                    expect(err).to.be.ok();
                    expect(err.code).to.equal(status.AEROSPIKE_OK);

                    client.get(key, function(err, record2, metadata2, key2) {
                        expect(err).to.be.ok();
                        expect(err.code).to.equal(status.AEROSPIKE_OK);

                        expect(record2.list).to.eql([]);

                        client.remove(key1, function(err, key){
                            done();
                        });
                    });
                });
            });
        });

    });

    describe('operator.listSet', function() {

        it('should set the item at the specified index', function(done) {

            // generators
            var kgen = keygen.string(options.namespace, options.set, {prefix: "test/cdt/set/"});
            var mgen = metagen.constant({ttl: 1000});
            var rgen = recgen.constant({list: [1, 2, 3, 4, 5]});

            // values
            var key     = kgen();
            var meta    = mgen(key);
            var record  = rgen(key, meta);

            // write the record then check
            client.put(key, record, meta, function(err, key) {

                var ops = [
                    op.listSet('list', 2, 99)
                ];

                client.operate(key, ops, function(err, record1, metadata1, key1) {
                    expect(err).to.be.ok();
                    expect(err.code).to.equal(status.AEROSPIKE_OK);

                    client.get(key, function(err, record2, metadata2, key2) {
                        expect(err).to.be.ok();
                        expect(err.code).to.equal(status.AEROSPIKE_OK);

                        expect(record2.list).to.eql([1, 2, 99, 4, 5]);

                        client.remove(key1, function(err, key){
                            done();
                        });
                    });
                });
            });
        });

    });

    describe('operator.listTrim', function() {

        it('should remove all elements not within the specified range', function(done) {

            // generators
            var kgen = keygen.string(options.namespace, options.set, {prefix: "test/cdt/trim/"});
            var mgen = metagen.constant({ttl: 1000});
            var rgen = recgen.constant({list: [1, 2, 3, 4, 5]});

            // values
            var key     = kgen();
            var meta    = mgen(key);
            var record  = rgen(key, meta);

            // write the record then check
            client.put(key, record, meta, function(err, key) {

                var ops = [
                    op.listTrim('list', 1, 3)
                ];

                client.operate(key, ops, function(err, record1, metadata1, key1) {
                    expect(err).to.be.ok();
                    expect(err.code).to.equal(status.AEROSPIKE_OK);

                    client.get(key, function(err, record2, metadata2, key2) {
                        expect(err).to.be.ok();
                        expect(err.code).to.equal(status.AEROSPIKE_OK);

                        expect(record2.list).to.eql([2, 3, 4]);

                        client.remove(key1, function(err, key){
                            done();
                        });
                    });
                });
            });
        });

    });

    describe('operator.listGet', function() {

        it('should get the item at the specified index', function(done) {

            // generators
            var kgen = keygen.string(options.namespace, options.set, {prefix: "test/cdt/get/"});
            var mgen = metagen.constant({ttl: 1000});
            var rgen = recgen.constant({list: [1, 2, 3, 4, 5]});

            // values
            var key     = kgen();
            var meta    = mgen(key);
            var record  = rgen(key, meta);

            // write the record then check
            client.put(key, record, meta, function(err, key) {

                var ops = [
                    op.listGet('list', 2)
                ];

                client.operate(key, ops, function(err, record1, metadata1, key1) {
                    expect(err).to.be.ok();
                    expect(err.code).to.equal(status.AEROSPIKE_OK);

                    expect(record1.list).to.equal(3);
                    client.remove(key1, function(err, key){
                        done();
                    });
                });
            });
        });

        it('should return an error if the index is out of bounds', function(done) {

            // generators
            var kgen = keygen.string(options.namespace, options.set, {prefix: "test/cdt/get/oob/"});
            var mgen = metagen.constant({ttl: 1000});
            var rgen = recgen.constant({list: [1, 2, 3, 4, 5]});

            // values
            var key     = kgen();
            var meta    = mgen(key);
            var record  = rgen(key, meta);

            // write the record then check
            client.put(key, record, meta, function(err, key) {

                var ops = [
                    op.listGet('list', 99)
                ];

                client.operate(key, ops, function(err, record1, metadata1, key1) {
                    expect(err).to.be.ok();
                    expect(err.code).to.equal(status.AEROSPIKE_ERR_REQUEST_INVALID);

                    client.remove(key1, function(err, key){
                        done();
                    });
                });
            });
        });

    });

    describe('operator.listGetRange', function() {

        it('should get the items at the specified range', function(done) {

            // generators
            var kgen = keygen.string(options.namespace, options.set, {prefix: "test/cdt/get_range/"});
            var mgen = metagen.constant({ttl: 1000});
            var rgen = recgen.constant({list: [1, 2, 3, 4, 5]});

            // values
            var key     = kgen();
            var meta    = mgen(key);
            var record  = rgen(key, meta);

            // write the record then check
            client.put(key, record, meta, function(err, key) {

                var ops = [
                    op.listGetRange('list', 1, 3)
                ];

                client.operate(key, ops, function(err, record1, metadata1, key1) {
                    expect(err).to.be.ok();
                    expect(err.code).to.equal(status.AEROSPIKE_OK);

                    expect(record1.list).to.eql([2, 3, 4]);
                    client.remove(key1, function(err, key){
                        done();
                    });
                });
            });
        });

        it('should get all the items from the specified index if count is not specified', function(done) {

            // generators
            var kgen = keygen.string(options.namespace, options.set, {prefix: "test/cdt/get_range_from/"});
            var mgen = metagen.constant({ttl: 1000});
            var rgen = recgen.constant({list: [1, 2, 3, 4, 5]});

            // values
            var key     = kgen();
            var meta    = mgen(key);
            var record  = rgen(key, meta);

            // write the record then check
            client.put(key, record, meta, function(err, key) {

                var ops = [
                    op.listGetRange('list', 1)
                ];

                client.operate(key, ops, function(err, record1, metadata1, key1) {
                    expect(err).to.be.ok();
                    expect(err.code).to.equal(status.AEROSPIKE_OK);

                    expect(record1.list).to.eql([2, 3, 4, 5]);
                    client.remove(key1, function(err, key){
                        done();
                    });
                });
            });
        });

    });

    describe('operator.listSize', function() {

        it('should get the lement count of the list', function(done) {

            // generators
            var kgen = keygen.string(options.namespace, options.set, {prefix: "test/cdt/size/"});
            var mgen = metagen.constant({ttl: 1000});
            var rgen = recgen.constant({list: [1, 2, 3, 4, 5]});

            // values
            var key     = kgen();
            var meta    = mgen(key);
            var record  = rgen(key, meta);

            // write the record then check
            client.put(key, record, meta, function(err, key) {

                var ops = [
                    op.listSize('list')
                ];

                client.operate(key, ops, function(err, record1, metadata1, key1) {
                    expect(err).to.be.ok();
                    expect(err.code).to.equal(status.AEROSPIKE_OK);

                    expect(record1.list).to.equal(5);
                    client.remove(key1, function(err, key){
                        done();
                    });
                });
            });
        });

    });

});