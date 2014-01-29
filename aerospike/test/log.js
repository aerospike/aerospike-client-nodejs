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
    var config = {
        hosts: [
            { addr: options.host, port: options.port }
        ],
        log: {
            level :options.log,
            file : fd
        },
        policies: {
            timeout: options.timeout
        }
    };


    it('should log the messages to test.log', function(done) {
        var host = {addr: options.host, port: options.port};
        var count = 0;
        fs.open('test.log','a', function(err, fd) {
            config.log.file = fd;
            aerospike.client(config)
                .info("objects", host, function(err, response, host) {
                    expect(err).to.be.ok();
                    expect(err.code).to.equal(status.AEROSPIKE_OK);
                    count++;
                    var buffer = new Buffer(100);
                    fs.readFile( 'test.log', function(err, data) {
                        expect(data).to.be.ok();
                        done();
                    });
                }, function() {
                    expect(count).to.equal(1);
            });
        });
    });
    
});
