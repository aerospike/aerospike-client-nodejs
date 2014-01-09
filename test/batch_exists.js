// we want to test the built aerospike module
var aerospike = require('../build/Release/aerospike');
var config = require('./config/client');
var assert = require('assert');
var request = require('superagent');
var expect = require('expect.js');
var msgpack = require('msgpack');

var keygen = require('./generators/key');
var metagen = require('./generators/metadata');
var recgen = require('./generators/record');
var putgen = require('./generators/put');

var status = aerospike.Status;
var policy = aerospike.Policy;
var ops = aerospike.Operators;

describe('client.batch_exists()', function() {

    var client;

    before(function() {
        client = aerospike.client(config).connect();
    });

    after(function() {
        client.close();
        client = null;
    });

    it('should successfully find 10 records', function(done) {

        // number of records
        var nrecords = 10;

        // generators
        var kgen, mgen, rgen;

        // key generator
        kgen = keygen.string_prefix("test", "demo", "test/batch_exists/" + nrecords + "/");

        // metadata generator
        mgen = metagen.constant({ttl: 1000});

        // record generator
        rgen = recgen.constant({i: 123, s: "abc"});

        // writer using generators
        // callback provides an array of written keys
        putgen.put(client, nrecords, kgen, rgen, mgen, function(written) {

            var keys = Object.keys(written).map(function(key){
                return written[key].key;
            })

            client.batch_exists(keys, function(err, results) {

                var result;
                var j;

                expect(err).to.be.ok();
                expect(err.code).to.equal(status.AEROSPIKE_OK);
                expect(results.length).to.equal(nrecords);

                for ( j = 0; j < results.length; j++) {
                    result = results[j];
                    expect(result.status).to.equal(status.AEROSPIKE_OK);
                }

                done();
            });
        });
    });

    it('should fail finding 10 records', function(done) {

        // number of records
        var nrecords = 10;

        // generators
        var kgen, keys;

        // key generator
        kgen = keygen.string_prefix("test", "demo", "test/batch_exists/10fail/");

        // keys
        keys = keygen.range(kgen, 10);
        
        // writer using generators
        // callback provides an array of written keys
        client.batch_exists(keys, function(err, results) {

            var result;
            var j;
            
            expect(err).to.be.ok();
            expect(err.code).to.equal(status.AEROSPIKE_OK);
            expect(results.length).to.equal(10);

            for ( j = 0; j < results.length; j++) {
                result = results[j];
                expect(result.status).to.equal(status.AEROSPIKE_ERR_RECORD_NOT_FOUND);
            }

            done();
        });
    });

    it('should successfully find 1000 records', function(done) {

        // number of records
        var nrecords = 10;

        // generators
        var kgen, mgen, rgen;

        // key generator
        kgen = keygen.string_prefix("test", "demo", "test/batch_exists/" + nrecords + "/");

        // metadata generator
        mgen = metagen.constant({ttl: 1000});

        // record generator
        rgen = recgen.constant({i: 123, s: "abc"});

        // writer using generators
        // callback provides an array of written keys
        putgen.put(client, nrecords, kgen, rgen, mgen, function(written) {

            var keys = Object.keys(written).map(function(key){
                return written[key].key;
            })

            client.batch_exists(keys, function(err, results) {

                var result;
                var j;

                expect(err).to.be.ok();
                expect(err.code).to.equal(status.AEROSPIKE_OK);
                expect(results.length).to.equal(nrecords);

                for ( j = 0; j < results.length; j++) {
                    result = results[j];
                    expect(result.status).to.equal(status.AEROSPIKE_OK);
                }

                done();
            });
        });
    });

});

