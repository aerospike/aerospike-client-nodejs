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

describe('client.udfRegister()', function(done) {

    var config = options.getConfig();
    var client = aerospike.client(config);

    before(function(done) {
        client.connect(function(err){
            done();
        });
    });

    after(function(done) {
        client.close()
        client = null;
        done();
    });
    it('should register an UDF file to aerospike cluster', function(done) {
        var dir = __dirname;
        var filename = dir + "/udf_test.lua"
        client.udfRegister(filename, function(err) {
            expect(err).to.be.ok();
            expect(err.code).to.equal(status.AEROSPIKE_OK);
            done();
        });
    });

    it('should register an UDF file with a LUA type to aerospike cluster', function(done) {
        var dir = __dirname;
        var filename = dir + "/udf_test.lua"
        client.udfRegister(filename, language.LUA, function(err) {
            expect(err).to.be.ok();
            expect(err.code).to.equal(status.AEROSPIKE_OK);
            done();
        });
    });
    it('should register an UDF file with a info policy to aerospike cluster', function(done) {
        var dir = __dirname;
        var filename = dir + "/udf_test.lua"
        var infopolicy = { timeout : 1000, send_as_is: true, check_bounds: false }
        client.udfRegister(filename, infopolicy, function(err) {
            expect(err).to.be.ok();
            expect(err.code).to.equal(status.AEROSPIKE_OK);
            done();
        });
    });


    it('should register an UDF file with a info policy and LUA type to aerospike cluster', function(done) {
        var dir = __dirname;
        var filename = dir + "/udf_test.lua"
        var infopolicy = { timeout : 1000, send_as_is: true, check_bounds: false }
        client.udfRegister(filename, language.LUA, infopolicy, function(err) {
            expect(err).to.be.ok();
            expect(err.code).to.equal(status.AEROSPIKE_OK);
            done();
        });
    });

    it('registering a non-existent UDF file to aerospike cluster - should fail',function(done) {
        var filename = "test.lua"
        client.udfRegister(filename, function(err) {
            expect(err).to.be.ok();
            if(err.code != 100) {
                expect(err.code).to.equal(status.AEROSPIKE_ERR);
            }
            else {
                expect(err.code).to.equal(100);
            }
            done();
        });
    });
  it('should register an UDF file to aerospike cluster and wait until all registration is done across all nodes in Aerospike cluster', function(done) {
        var dir = __dirname;
        var filename = dir + "/udf_test.lua"
        client.udfRegister(filename, function(err) {
            expect(err).to.be.ok();
            expect(err.code).to.equal(status.AEROSPIKE_OK);
            client.udfRegisterWait("udf_test.lua", 1000, function(err) {
                expect(err).to.be.ok();
                expect(err.code).to.equal(status.AEROSPIKE_OK);
                done();
            });
        });
    });

});
