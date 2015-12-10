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

    describe('operator.list_append', function() {

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
                    op.list_append('list', 99)
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

    describe('operator.list_append_items', function() {

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
                    op.list_append_items('list', [99, 100])
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

    describe('operator.list_insert', function() {

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
                    op.list_insert('list', 2, 99)
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

    describe('operator.list_insert_items', function() {

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
                    op.list_insert_items('list', 2, [99, 100])
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

    describe('operator.list_pop', function() {

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
                    op.list_pop('list', 2)
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

    describe('operator.list_pop_items', function() {

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
                    op.list_pop_range('list', 2, 2)
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

    });

    describe('operator.list_remove', function() {

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
                    op.list_remove('list', 2)
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

    describe('operator.list_remove_items', function() {

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
                    op.list_remove_range('list', 2, 2)
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

    });

    describe('operator.list_clear', function() {

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
                    op.list_clear('list')
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

    describe('operator.list_set', function() {

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
                    op.list_set('list', 2, 99)
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

    describe('operator.list_trim', function() {

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
                    op.list_trim('list', 1, 3)
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

    describe('operator.list_get', function() {

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
                    op.list_get('list', 2)
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
                    op.list_get('list', 99)
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

    describe('operator.list_get_range', function() {

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
                    op.list_get_range('list', 1, 3)
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

    });

    describe('operator.list_size', function() {

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
                    op.list_size('list')
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