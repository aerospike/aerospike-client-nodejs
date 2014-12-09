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
var aerospike = require('../lib/aerospike')
var options = require('./util/options');
var assert = require('assert');
var expect = require('expect.js');
 

var keygen  = require('./generators/key');
var metagen = require('./generators/metadata');
var recgen  = require('./generators/record');
var putgen  = require('./generators/put');
var valgen  = require('./generators/value');

var status     = aerospike.status;
var policy	   = aerospike.policy;
var scanStatus = aerospike.scanStatus;
describe('client.scan()', function() {

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
			// counters

			var total = 100;
			var count = 0;

			// generators
			var kgen = keygen.string(options.namespace, options.set, {prefix: "test/scan/"});
			var mgen = metagen.constant({ttl: 1000});
			var rgen = recgen.record({i: valgen.integer(), s: valgen.string(), b: valgen.bytes()});

			function iteration(i) {

			// values
			var key     = { ns: options.namespace, set: options.set, key: i}
			var meta    = mgen(key);
			var record  = rgen(key, meta);

			// write the record then check
			client.put(key, record, meta, function(err, key) {
				client.get(key, function(err, _record, _metadata, _key) {

					expect(err).to.be.ok();
					expect(err.code).to.equal(status.AEROSPIKE_OK);
					expect(_record).to.eql(record);
					count++;
					if ( count >= total ) {
						done();
					}
					});
				});
			}

			for ( var i = 0; i < total; i++ ) {
				iteration(i);
			}
		});

    });

    after(function(done) {
		var total = 100;
		for ( var j = 0; j < total; j++) {
			var key = { ns: options.namespace, set: options.set, key: j}
			client.remove(key, function(err, key){});
		}
        client.close();
        client = null;
        done();
    });

    it('should scan all the records', function(done) {
        
        // counters
        var total = 100;
        var count = 0;
		var err = 0;

		var scan = client.scan(options.namespace, options.set);

		scan.on('data', function(rec){
			expect(rec.bins).to.have.property('s');
			expect(rec.bins).to.have.property('i');
			expect(rec.bins).to.have.property('b');
			count++;
		});
		scan.on('error', function(error){
			err++;
		});
		scan.on('end', function(end){
			expect(count).to.be.greaterThan(99);
			expect(err).to.equal(0);

			done();
		});
    });

	it('should scan and select no bins', function(done) {
			var total = 100;
			var count = 0;
			var err   = 0;
			
			var args = { nobins : true}
			var scan = client.scan(options.namespace, options.set, args);

			scan.on('data', function(rec) {
				expect(rec.bins).to.not.have.property('s');
				expect(rec.bins).to.not.have.property('i');
				expect(rec.bins).to.not.have.property('b');
				count++;
			});
			scan.on('error', function(error){
				err++;
			});
			scan.on('end', function(end) {
				expect(count).to.equal(total);
				expect(err).to.equal(0);
				done();
			});
	});
    it('should scan and select only few bins in the record', function(done) {
			var total = 99;
			var count = 0;
			var err   = 0;
			
			var args = { select : ['i', 's']}
			var scan = client.scan(options.namespace, options.set, args);

			scan.on('data', function(rec) {
				expect(rec.bins).to.have.property('s');
				expect(rec.bins).to.have.property('i');
				expect(rec.bins).to.not.have.property('b');
				count++;
			});
			scan.on('error', function(error){
				err++;
			});
			scan.on('end', function(end) {
				expect(count).to.be.greaterThan(total);
				expect(err).to.equal(0);
				done();
			});
	});
	it('should fire a scan background and check for scan job completion', function(done) {
			var args = { udfArgs: {module: 'scan', funcname: 'updateRecord'}}
			var scanBackground = client.query( options.namespace, options.set, args);

			var err = 0;
			var scanStream = scanBackground.execute();

			var infoCallback = function( scanJobStats, scanId) {
				if(scanJobStats.status != scanStatus.COMPLETED) {
					scanBackground.Info(scanId, infoCallback);
				}
				else {
					done();
				}
			}
			scanStream.on('error', function(error) {
				err++;
			});
			scanStream.on('end', function(scanId) {
				scanBackground.Info(scanId, infoCallback);
			});
	});
	it('Query without where clause and an UDF - should do a foreground scan of all records', function(done) {
        
        // counters
        var total = 100;
        var count = 0;
		var err = 0;

		var scan = client.query(options.namespace, options.set);
	
		var stream = scan.execute();

		stream.on('data', function(rec){
			expect(rec.bins).to.have.property('s');
			expect(rec.bins).to.have.property('i');
			expect(rec.bins).to.have.property('b');
			count++;
		});
		stream.on('error', function(error){
			err++;
		});
		stream.on('end', function(end){
			expect(count).to.be.greaterThan(99);
			expect(err).to.equal(0);

			done();
		});
    });


});
