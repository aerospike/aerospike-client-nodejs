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
var options = require('./util/options');
var assert = require('assert');
var expect = require('expect.js');

var keygen = require('./generators/key');
var metagen = require('./generators/metadata');
var recgen = require('./generators/record');
var putgen = require('./generators/put');

var status = aerospike.status;
var policy = aerospike.policy;
var language = aerospike.language;

describe('client.udfRemove()', function(done) {

    var config = {
        hosts: [
            { addr: options.host, port: options.port }
        ],
        log: {
            level: options.log
        },
        policies: {
            timeout: options.timeout
        }
    };
	var client = aerospike.client(config);
    before(function(done) {
		client.connect(function(err){
			done();
		});
    });

    after(function(done) {
        done();
    });
    
	it('should remove an UDF module with a info policy from aerospike cluster', function(done) {
        var dir = __dirname;
		var filename = dir + "/udf_test.lua"
		var infopolicy = { timeout : 1000, send_as_is: true, check_bounds: false }
        client.udfRegister(filename, infopolicy, function(err) {
            expect(err).to.be.ok();
            expect(err.code).to.equal(status.AEROSPIKE_OK);
			client.udfRemove("udf_test.lua", infopolicy, function(err) {
				expect(err).to.be.ok();
				expect(err.code).to.equal(status.AEROSPIKE_OK);
				done();
			});
        }); 
    });

	it('remove non-existent UDF module from aerospike cluster - should fail',function(done) {
		var filename = "noudf.lua"
       client.udfRemove(filename, function(err) {
            expect(err).to.be.ok();
            expect(err.code).to.equal(status.AEROSPIKE_ERR_UDF);
			done();
       }); 
    });
});
