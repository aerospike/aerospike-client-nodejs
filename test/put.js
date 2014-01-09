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


describe('client.put()', function() {

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

    it('should write and validate 100 records', function(done) {
        
        // counters
        var total = 100;
        var count = 0;

        // generators
        var kgen = keygen.string("test", "demo", {prefix: "test/get/"});
        var mgen = metagen.constant({ttl: 1000});
        var rgen = recgen.record({i: valgen.integer(), s: valgen.string(), b: valgen.bytes()});

        function iteration() {

            // values
            var key     = kgen();
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
            iteration();
        }
    });

    it('should write the record w/ string key', function(done) {
        
        // generators
        var kgen = keygen.string("test", "demo", {prefix: "test/get/"});
        var mgen = metagen.constant({ttl: 1000});
        var rgen = recgen.record({i: valgen.integer(), s: valgen.string()});

        // values
        var key     = kgen();
        var meta    = mgen(key);
        var record  = rgen(key, meta);

        // write the record then check
        client.put(key, record, meta, function(err, key) {
            client.get(key, function(err, record, metadata, key) {
                expect(err).to.be.ok();
                expect(err.code).to.equal(status.AEROSPIKE_OK);

                done();
            });
        });
    });

    it('should write the record w/ int key', function(done) {

        // generators
        var kgen = keygen.integer("test", "demo");
        var mgen = metagen.constant({ttl: 1000});
        var rgen = recgen.record({i: valgen.integer(), s: valgen.string()});

        // values
        var key     = kgen();
        var meta    = mgen(key);
        var record  = rgen(key, meta);

        // write the record then check
        client.put(key, record, meta, function(err, key) {
            client.get(key, function(err, record, metadata, key) {
                expect(err).to.be.ok();
                expect(err.code).to.equal(status.AEROSPIKE_OK);

                done();
            });
        });
    });

    it.skip('should write the record w/ bytes key', function(done) {
    });

    it.skip('should write, read, write, and check gen', function(done) {
    });

    it.skip('should write, read, remove, write, and check gen', function(done) {
    });

});
