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
var op = aerospike.operator;

describe('client.operate()', function() {

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
            done();
        });
    });

    after(function(done) {
        client.close();
        client = null;
        done();
    });

    it('should increment a bin', function(done) {
        
        // generators
        var kgen = keygen.string(options.namespace, options.set, {prefix: "test/get/"});
        var mgen = metagen.constant({ttl: 1000});
        var rgen = recgen.constant({i: 123, s: "abc"});

        // values
        var key     = kgen();
        var meta    = mgen(key);
        var record  = rgen(key, meta);

        // write the record then check
        client.put(key, record, meta, function(err, key) {

            var ops = [
                op.incr('i', 432)
            ];

            client.operate(key, ops, function(err, record1, metadata1, key1) {
                expect(err).to.be.ok();
                expect(err.code).to.equal(status.AEROSPIKE_OK);

                client.get(key, function(err, record2, metadata2, key2) {
                    expect(err).to.be.ok();
                    expect(err.code).to.equal(status.AEROSPIKE_OK);
                    expect(record['i'] + 432).to.equal(record2['i']);
                    expect(record['s']).to.equal(record2['s']);
                    done();
                });

            });
        });
    });


    it('should append a bin', function(done) {
        
        // generators
        var kgen = keygen.string(options.namespace, options.set, {prefix: "test/get/"});
        var mgen = metagen.constant({ttl: 1000});
        var rgen = recgen.constant({i: 123, s: "abc"});

        // values
        var key     = kgen();
        var meta    = mgen(key);
        var record  = rgen(key, meta);

        // write the record then check
        client.put(key, record, meta, function(err, key) {

            var ops = [
                op.append('s', 'def')
            ];

            client.operate(key, ops, function(err, record1, metadata1, key1) {
                expect(err).to.be.ok();
                expect(err.code).to.equal(status.AEROSPIKE_OK);

                client.get(key, function(err, record2, metadata2, key2) {
                    expect(err).to.be.ok();
                    expect(err.code).to.equal(status.AEROSPIKE_OK);
                    expect(record['i']).to.equal(record2['i']);
                    expect(record['s'] + 'def').to.equal(record2['s']);
                    done();
                });

            });
        });
    });
    
    it('should prepend and read a bin', function(done) {
        
        // generators
        var kgen = keygen.string(options.namespace, options.set, {prefix: "test/get/"});
        var mgen = metagen.constant({ttl: 1000});
        var rgen = recgen.constant({i: 123, s: "abc"});

        // values
        var key     = kgen();
        var meta    = mgen(key);
        var record  = rgen(key, meta);

        // write the record then check
        client.put(key, record, meta, function(err, key) {

            var ops = [
                op.prepend('s', 'def'),
                op.read('s'),
            ];

            client.operate(key, ops, function(err, record1, metadata1, key1) {
                expect(err).to.be.ok();
                expect(err.code).to.equal(status.AEROSPIKE_OK);
                expect(record1['i']).to.equal(undefined);
                expect('def' + record['s']).to.equal(record1['s']);

                client.get(key, function(err, record2, metadata2, key2) {
                    expect(err).to.be.ok();
                    expect(err.code).to.equal(status.AEROSPIKE_OK);
                    expect(record['i']).to.equal(record2['i']);
                    expect('def'+record['s'] ).to.equal(record2['s']);
                    done();
                });

            });
        });
    });
    it('should touch a record(refresh ttl) ', function(done) {
        
        // generators
        var kgen = keygen.string(options.namespace, options.set, {prefix: "test/get/"});
        var mgen = metagen.constant({ttl: 1000});
        var rgen = recgen.constant({i: 123, s: "abc"});

        // values
        var key     = kgen();
        var meta    = mgen(key);
        var record  = rgen(key, meta);

        // write the record then check
        client.put(key, record, meta, function(err, key) {
            var ops = [
                op.touch(1000)
            ];

            client.operate(key, ops, function(err, record1, metadata1, key1) {
                expect(err).to.be.ok();
                expect(err.code).to.equal(status.AEROSPIKE_OK);

                client.get(key, function(err, record2, metadata2, key2) {
                    expect(err).to.be.ok();
                    expect(err.code).to.equal(status.AEROSPIKE_OK);
                    expect(record['i']).to.equal(record2['i']);
                    expect(record['s']).to.equal(record2['s']);
                    expect(meta.ttl).to.equal(metadata2.ttl);
                    done();
                });

            });
        });
    });

});
