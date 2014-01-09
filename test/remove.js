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

var status = aerospike.Status;
var policy = aerospike.Policy;


describe('client.remove()', function() {

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
        client.connect();
        done();
    });

    after(function(done) {
        client.close();
        client = null;
        done();
    });

    it('should remove a record w/ string key', function(done) {

        // generators
        var kgen = keygen.string("test", "demo", {prefix: "test/get/"});
        var mgen = metagen.constant({ttl: 1000});
        var rgen = recgen.record({i: valgen.integer(), s: valgen.string(), b: valgen.bytes()});

        // values
        var key     = kgen();
        var meta    = mgen(key);
        var record  = rgen(key, meta);

        // write the record then check
        client.put(key, record, meta, function(err, key) {
            client.get(key, function(err, record, metadata, key) {
                expect(err).to.be.ok();
                expect(err.code).to.equal(status.AEROSPIKE_OK);
                client.remove(key, function(err, key) {
                    client.get(key, function(err, record, metadata, key) {
                        expect(err).to.be.ok();
                        expect(err.code).to.equal(status.AEROSPIKE_ERR_RECORD_NOT_FOUND);

                        done();
                    });
                });
            });
        });
    });

    it('should remove a record w/ integer key', function(done) {

        // generators
        var kgen = keygen.integer("test", "demo");
        var mgen = metagen.constant({ttl: 1000});
        var rgen = recgen.record({i: valgen.integer(), s: valgen.string(), b: valgen.bytes()});

        // values
        var key     = kgen();
        var meta    = mgen(key);
        var record  = rgen(key, meta);

        // write the record then check
        client.put(key, record, meta, function(err, key) {
            client.get(key, function(err, record, metadata, key) {
                expect(err).to.be.ok();
                expect(err.code).to.equal(status.AEROSPIKE_OK);
                client.remove(key, function(err, key) {
                    client.get(key, function(err, record, metadata, key) {
                        expect(err).to.be.ok();
                        expect(err.code).to.equal(status.AEROSPIKE_ERR_RECORD_NOT_FOUND);

                        done();
                    });
                });
            });
        });
    });
    
    it('should not remove a non-existent key', function(done) {

        // generators
        var kgen = keygen.string("test", "demo", {prefix: "test/not_found/"});

        // values
        var key = kgen();

        // write the record then check
        client.remove(key, function(err, key) {
            expect(err).to.be.ok();
            expect(err.code).to.equal(status.AEROSPIKE_ERR_RECORD_NOT_FOUND);
            
            done();
        });
    });

});
