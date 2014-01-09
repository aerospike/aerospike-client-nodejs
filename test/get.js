// we want to test the built aerospike module
var aerospike = require('../build/Release/aerospike')
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


describe('client.get()', function() {

    var client;

    before(function() {
        client = aerospike.client({
            hosts: [ {addr: '127.0.0.1', port: 3010 } ]
        }).connect();
    });

    after(function() {
        client.close();
        client = null;
    });

    it('should read the record', function(done) {
        
        // generators
        var kgen = keygen.string_prefix("test", "demo", "test/get/");
        var mgen = metagen.constant({ttl: 1000});
        var rgen = recgen.constant({i: 123, s: "abc"});

        // values
        var key     = kgen();
        var meta    = mgen(key);
        var record  = rgen(key, meta);

        // write the record then check
        client.put(key, record, meta, function(err, key) {
            client.exists(key, function(err, record, metadata, key) {
                expect(err).to.be.ok();
                expect(err.code).to.equal(status.AEROSPIKE_OK);

                done();
            });
        });
    });

    it('should not find the record', function(done) {

        // generators
        var kgen = keygen.string_prefix("test", "demo", "test/not_found/");
        var mgen = metagen.constant({ttl: 1000});
        var rgen = recgen.constant({i: 123, s: "abc"});

        // values
        var key = kgen();

        // write the record then check
        client.get(key, function(err, record, metadata, key) {
            expect(err).to.be.ok();
            expect(err.code).to.equal(status.AEROSPIKE_ERR_RECORD_NOT_FOUND);

            done();
        });
    });

    it('should read the record w/ a key send policy', function(done) {

        // generators
        var kgen = keygen.string_prefix("test", "demo", "test/get/");
        var mgen = metagen.constant({ttl: 1000});
        var rgen = recgen.constant({i: 123, s: "abc"});

        // values
        var key     = kgen();
        var meta    = mgen(key);
        var record  = rgen(key, meta);
        var pol     = { key: policy.Key.SEND };

        // write the record then check
        client.put(key, record, meta, function(err, key) {
            client.get(key, policy, function(err, record, metadata, key) {
                expect(err).to.be.ok();
                expect(err.code).to.equal(status.AEROSPIKE_OK);

                done();
            });
        });
    });
});
