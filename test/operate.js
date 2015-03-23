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
var putgen = require('./generators/put');

var status = aerospike.status;
var policy = aerospike.policy;
var op = aerospike.operator;

describe('client.operate()', function() {

    var client = aerospike.client({
        hosts: [
            { addr: options.host, port: options.port }
        ],
        log: {
            level: options.log
        },
        policies: {
            timeout: options.timeout
        }
    });

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

    it('should increment a bin', function(done) {
        
        // generators
        var kgen = keygen.string(options.namespace, options.set, {prefix: "test/get/"});
        var mgen = metagen.constant({ttl: 1000});
        var rgen = recgen.constant({i: 123, s: "abc"});

        // values
        var key     = kgen();
        var meta    = mgen(key);
        var record  = rgen(key, meta);

        // write the record then check
        client.put(key, record, meta, function(err, key) {

            var ops = [
                op.incr('i', 432)
            ];

            client.operate(key, ops, function(err, record1, metadata1, key1) {
                expect(err).to.be.ok();
                expect(err.code).to.equal(status.AEROSPIKE_OK);

                client.get(key, function(err, record2, metadata2, key2) {
                    expect(err).to.be.ok();
                    expect(err.code).to.equal(status.AEROSPIKE_OK);
                    expect(record['i'] + 432).to.equal(record2['i']);
                    expect(record['s']).to.equal(record2['s']);
					client.remove(key2, function(err, key){
						done();
					});
                });

            });
        });
    });


    it('should append a bin', function(done) {
        
        // generators
        var kgen = keygen.string(options.namespace, options.set, {prefix: "test/get/"});
        var mgen = metagen.constant({ttl: 1000});
        var rgen = recgen.constant({i: 123, s: "abc"});

        // values
        var key     = kgen();
        var meta    = mgen(key);
        var record  = rgen(key, meta);

        // write the record then check
        client.put(key, record, meta, function(err, key) {

            var ops = [
                op.append('s', 'def')
            ];

            client.operate(key, ops, function(err, record1, metadata1, key1) {
                expect(err).to.be.ok();
                expect(err.code).to.equal(status.AEROSPIKE_OK);

                client.get(key, function(err, record2, metadata2, key2) {
                    expect(err).to.be.ok();
                    expect(err.code).to.equal(status.AEROSPIKE_OK);
                    expect(record['i']).to.equal(record2['i']);
                    expect(record['s'] + 'def').to.equal(record2['s']);
					client.remove(key2, function(err, key){
						done();
					});
                });

            });
        });
    });
    
    it('should prepend and read a bin', function(done) {
        
        // generators
        var kgen = keygen.string(options.namespace, options.set, {prefix: "test/get/"});
        var mgen = metagen.constant({ttl: 1000});
        var rgen = recgen.constant({i: 123, s: "abc"});

        // values
        var key     = kgen();
        var meta    = mgen(key);
        var record  = rgen(key, meta);

        // write the record then check
        client.put(key, record, meta, function(err, key) {

            var ops = [
                op.prepend('s', 'def'),
                op.read('s'),
            ];

            client.operate(key, ops, function(err, record1, metadata1, key1) {
                expect(err).to.be.ok();
                expect(err.code).to.equal(status.AEROSPIKE_OK);
                expect(record1['i']).to.equal(undefined);
                expect('def' + record['s']).to.equal(record1['s']);

                client.get(key, function(err, record2, metadata2, key2) {
                    expect(err).to.be.ok();
                    expect(err.code).to.equal(status.AEROSPIKE_OK);
                    expect(record['i']).to.equal(record2['i']);
                    expect('def'+record['s'] ).to.equal(record2['s']);
					client.remove(key2, function(err, key){
						done();
					});
                });

            });
        });
    });
    it('should touch a record(refresh ttl) ', function(done) {
        
        // generators
        var kgen = keygen.string(options.namespace, options.set, {prefix: "test/get/"});
        var mgen = metagen.constant({ttl: 1000});
        var rgen = recgen.constant({i: 123, s: "abc"});

        // values
        var key     = kgen();
        var meta    = mgen(key);
        var record  = rgen(key, meta);

        // TEST LOGIC
        // 1.Write a record to an aerospike server.
        // 2.Read the record, to get the ttl and calculate
        //   the difference in the ttl written and the ttl returned by server.
        // 3.Touch the record with a definite ttl.
        // 4.Read the record and calculate the difference in the ttl between the 
        //  touch ttl value and read ttl value.
        // 5.Compare the difference with the earlier difference calculated.
        // 6.This is to account for the clock asynchronicity between 
        //   the client and the server machines.
        // 7.Server returns a number, at which the record expires according the server clock.
        // 8.The client calculates the time in seconds, and gives back ttl. In the case , where 
        //   clocks are not synchronous between server and client, the ttl client calculates may not 
        //   be accurate to the user. Nevertheless server expires the record in the correct time.

        // write the record then check
        client.put(key, record, meta, function(err, key) {
            var ops = [
                op.touch(2592000)
            ];
            client.get(key, function(err, record3, metadata3, key3){
                expect(err).to.be.ok();
                ttl_diff = metadata3.ttl - meta.ttl;
                client.operate(key, ops, function(err, record1, metadata1, key1) {
                    expect(err).to.be.ok();
                    expect(err.code).to.equal(status.AEROSPIKE_OK);
                    client.get(key1, function(err, record2, metadata2, key2) {
                        expect(err).to.be.ok();
                        expect(err.code).to.equal(status.AEROSPIKE_OK);
                        expect(record['i']).to.equal(record2['i']);
                        expect(record['s']).to.equal(record2['s']);
                        expect(2592000 + ttl_diff+10).to.be.above(metadata2.ttl);
                        expect(2592000 + ttl_diff-10).to.be.below(metadata2.ttl);
						client.remove(key2, function(err, key){
							done();
						});
                    });

                });
            });
        });
    });

});
