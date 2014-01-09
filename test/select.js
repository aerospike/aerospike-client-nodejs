// we want to test the built aerospike module
var aerospike = require('../build/Release/aerospike');
var options = require('./util/options');
var assert = require('assert');
var expect = require('expect.js');

var keygen = require('./generators/key');
var metagen = require('./generators/metadata');
var recgen = require('./generators/record');
var putgen = require('./generators/put');

var status = aerospike.Status;
var policy = aerospike.Policy;


describe('client.select()', function() {

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

    it('should read the record', function(done) {
        
        // generators
        var kgen = keygen.string_prefix("test", "demo", "test/select/");
        var mgen = metagen.constant({ttl: 1000});
        var rgen = recgen.constant({i: 123, s: "abc"});

        // values
        var key     = kgen();
        var meta    = mgen(key);
        var record  = rgen(key, meta);
        var bins    = Object.keys(record).slice(0,1);

        // write the record then check
        client.put(key, record, meta, function(err, key) {
            client.select(key, bins, function(err, record, metadata, key) {
                expect(err).to.be.ok();
                expect(err.code).to.equal(status.AEROSPIKE_OK);
                expect(record).to.only.have.keys(bins);

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
        var key     = kgen();
        var meta    = mgen(key);
        var record  = rgen(key, meta);
        var bins    = Object.keys(record).slice(0,1);

        // write the record then check
        client.select(key, bins, function(err, record, metadata, key) {
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
        var bins    = Object.keys(record).slice(0,1);
        var pol     = { key: policy.Key.SEND };

        // write the record then check
        client.put(key, record, meta, function(err, key) {
            client.select(key, bins, policy, function(err, record, metadata, key) {
                expect(err).to.be.ok();
                expect(err.code).to.equal(status.AEROSPIKE_OK);
                expect(record).to.only.have.keys(bins);

                done();
            });
        });
    });
});
