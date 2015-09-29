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
var valgen = require('./generators/value');

var status = aerospike.status;
var policy = aerospike.policy;

describe('client.exists()', function() {

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

    it('should find the record', function(done) {

        // generators
        var kgen = keygen.string(options.namespace, options.set, {prefix: "test/exists/"});
        var mgen = metagen.constant({ttl: 1000});
        var rgen = recgen.record({i: valgen.integer(), s: valgen.string(), b: valgen.bytes()});

        // values
        var key     = kgen();
        var meta    = mgen(key);
        var record  = rgen(key,meta);

        // write the record then check
        client.put(key, record, meta, function(err, key) {
            client.exists(key, function(err, metadata, key) {
                expect(err).to.be.ok();
                expect(err.code).to.equal(status.AEROSPIKE_OK);
                client.remove(key, function(err, key){
                    done();
                });
            });
        });
    });

    it('should not find the record', function(done) {

        // generators
        var kgen = keygen.string(options.namespace, options.set, {prefix: "test/exists/fail/"});

        // values
        var key = kgen();

        // write the record then check
        client.exists(key, function(err, metadata, key) {
            expect(err).to.be.ok();
            if(err.code != 602) {
                expect(err.code).to.equal(status.AEROSPIKE_ERR_RECORD_NOT_FOUND);
            }
            else {
                expect(err.code).to.equal(602);
            }
            done();
        });
    });

});


