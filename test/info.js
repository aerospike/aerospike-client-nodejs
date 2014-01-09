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


describe('client.info()', function() {

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

    before(function(done) {
        done();
    });

    after(function(done) {
        done();
    });

    it('should get "objects" from a single node', function(done) {
        var host = {addr: options.host, port: options.port};
        var count = 0;
        aerospike.client(config)
            .info("objects", host, function(err, response, host) {
                expect(err).to.be.ok();
                expect(err.code).to.equal(status.AEROSPIKE_OK);
                count++;
            }, function() {
                expect(count).to.equal(1);
                done();
            });
    });

    it('should get "objects" from entire cluster', function(done) {
        aerospike.client(config).connect(function(err, client){
            client.info("objects", function(err, response, host) {
                expect(err).to.be.ok();
                expect(err.code).to.equal(status.AEROSPIKE_OK);
            }, function() {
                client.close();
                done();
            });
        });
    });
});
