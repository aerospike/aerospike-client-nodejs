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
var aerospike = require('../build/Release/aerospike');
var options   = require('./util/options');
var assert    = require('assert');
var expect    = require('expect.js');

var keygen  = require('./generators/key');
var metagen = require('./generators/metadata');
var recgen  = require('./generators/record');
var putgen  = require('./generators/put');
var valgen  = require('./generators/value');

var status = aerospike.status;
var policy = aerospike.policy;

describe('client.select()', function() {

    var client = aerospike.client({
        hosts: [
            { addr: options.host, port: options.port }
        ],
        log: {
            level: options.log,
			file:  options.log_file
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

    it('should read the record', function(done) {
        
        // generators
        var kgen = keygen.string(options.namespace, options.set, {prefix: "test/select/"});
        var mgen = metagen.constant({ttl: 1000});
        var rgen = recgen.record({i: valgen.integer(), s: valgen.string(), b: valgen.bytes()});

        // values
        var key     = kgen();
        var meta    = mgen(key);
        var record  = rgen(key, meta);
        var bins    = Object.keys(record).slice(0,1);

        // write the record then check
        client.put(key, record, meta, function(err, key) {
            client.select(key, bins, function(err, _record, metadata, key) {
                expect(err).to.be.ok();
                expect(err.code).to.equal(status.AEROSPIKE_OK);
                expect(_record).to.only.have.keys(bins);

                for ( var bin in _record ) {
                    expect(_record[bin]).to.be(record[bin]);
                }
				
				client.remove(key, function(err, key){
					done();
				});
            });
        });
    });
	it('should fail - when a select is called without key ', function(done) {
        
        // generators
        var kgen = keygen.string(options.namespace, options.set, {prefix: "test/select/"});
        var mgen = metagen.constant({ttl: 1000});
        var rgen = recgen.record({i: valgen.integer(), s: valgen.string(), b: valgen.bytes()});

        // values
        var key     = kgen();
        var meta    = mgen(key);
        var record  = rgen(key, meta);
        var bins    = Object.keys(record).slice(0,1);

        // write the record then check
        client.put(key, record, meta, function(err, key1) {
			var select_key = { ns:options.namespace, set: options.set}
            client.select(select_key, bins, function(err, _record, metadata, key1) {
                expect(err).to.be.ok();
                expect(err.code).to.equal(status.AEROSPIKE_ERR_PARAM);
				client.remove(key, function(err, key){
					done();
				});
            });
        });
    });

    it('should not find the record', function(done) {

        // generators
        var kgen = keygen.string(options.namespace, options.set, {prefix: "test/not_found/"});
        var mgen = metagen.constant({ttl: 1000});
        var rgen = recgen.record({i: valgen.integer(), s: valgen.string(), b: valgen.bytes()});

        // values
        var key     = kgen();
        var meta    = mgen(key);
        var record  = rgen(key, meta);
        var bins    = Object.keys(record).slice(0,1);

        // write the record then check
        client.select(key, bins, function(err, record, metadata, key) {
            expect(err).to.be.ok();
			if(err.code != 602)
			{
				expect(err.code).to.equal(status.AEROSPIKE_ERR_RECORD_NOT_FOUND);
			}
			else 
			{
				expect(err.code).to.equal(602);
			}

            done();
        });
    });

    it('should read the record w/ a key send policy', function(done) {

        // generators
        var kgen = keygen.string(options.namespace, options.set, {prefix: "test/get/"});
        var mgen = metagen.constant({ttl: 1000});
        var rgen = recgen.record({i: valgen.integer(), s: valgen.string(), b: valgen.bytes()});

        // values
        var key     = kgen();
        var meta    = mgen(key);
        var record  = rgen(key, meta);
        var bins    = Object.keys(record).slice(0,1);
        var pol     = { key: policy.key.SEND };

        // write the record then check
        client.put(key, record, meta, function(err, key) {
            client.select(key, bins, pol, function(err, _record, metadata, key) {
                expect(err).to.be.ok();
                expect(err.code).to.equal(status.AEROSPIKE_OK);
                expect(_record).to.only.have.keys(bins);

                for ( var bin in _record ) {
                    expect(_record[bin]).to.be(record[bin]);
                }
				client.remove(key, function(err, key){
					done();
				});
            });
        });
    });
});
