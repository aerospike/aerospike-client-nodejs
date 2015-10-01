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
var fs     = require('fs');
var keygen = require('./generators/key');
var metagen = require('./generators/metadata');
var recgen = require('./generators/record');
var putgen = require('./generators/put');

var status = aerospike.status;
var policy = aerospike.policy;

describe('client.updateLogging()', function() {

    var fd = null;

    beforeEach(function(done) {
        done();
    });

    after(function(done) {
        done();
    });

    var config = options.getConfig();
	config.log.file = null;


    it('should log the messages to test.log', function(done) {
        var host = {addr: options.host, port: options.port};
        var count = 0;
        fs.open('test.log','a', function(err, fd) {
            config.log.file = fd;
            aerospike.client(config).connect(function(err, client) {
                client.info("objects", host, function(err, response, host) {
                    expect(err).to.be.ok();
                    expect(err.code).to.equal(status.AEROSPIKE_OK);
                    count++;
                    var buffer = new Buffer(100);
                    fs.readFile( 'test.log', function(err, data) {
                        expect(data).to.be.ok();
                        done();
                    });
                });
            });
        });
    });

});
