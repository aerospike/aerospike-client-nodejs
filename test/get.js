var assert = require('assert');
var request = require('superagent');
var expect = require('expect.js');
var aerospike = require('aerospike');
var msgpack = require('msgpack');
var return_code = aerospike.Status;
var Policy = aerospike.Policy;
var Operator = aerospike.Operators;

var test = require('./test')
var client = test.client;
var params = new Object;
var ParseConfig = test.ParseConfig
var GetRecord = test.GetRecord
var CleanRecords = test.CleanRecords
var n = test.n


ParseConfig(params);


function GetReadPolicy()
{
    var readpolicy = { timeout : 10, key :Policy.Key.SEND }
    return readpolicy;
}

describe( 'GET FUNCTIONALITY', function() {
    it( 'SIMPLE GET TEST', function() {
        var m = 0;
        for ( var i = 1; i <= n; i++) {
        var rec = GetRecord(i);
        var Key = { ns: params.ns, set: params.set,key: 'GET' + i }
        client.put (Key, rec.bins, rec.metadata, function (err, meta, key) {
            if ( err.code == return_code.AEROSPIKE_OK) { 
            client.get(key, function ( err, bins, meta, key) {
                expect(err).to.exist;
                expect(err.code).to.equal(return_code.AEROSPIKE_OK);
                var ind = key.key.substr(3);
                expect(bins.string_bin).to.equal(ind);
                expect(bins.integer_bin).to.equal(parseInt(ind));
                var obj = msgpack.unpack(bins.blob_bin);
                expect(obj.integer).to.equal(parseInt(ind));
                expect(obj.string).to.equal('Some String');
                expect(obj.array).to.eql([1,2,3]);
                if ( ++m == n) {
                    m = 0;
                    console.log("GET TEST SUCCESS");
                    CleanRecords('GET');
                }
            });
            }
        });
    }
    });

    it( 'GET TEST WITH READ POLICY', function() {
        var m = 0;
        for ( var i = 1; i <= n; i++) {
        var rec = GetRecord(i);
        var Key = { ns: params.ns, set: params.set, key: 'READPOLICY' + i }
        client.put (Key, rec.bins, rec.metadata, function (err, meta, key) {
            if ( err.code == return_code.AEROSPIKE_OK) { 
                var readpolicy = new GetReadPolicy();
            client.get(key, readpolicy, function ( err, bins, meta, key) {
                expect(err).to.exist;
                expect(err.code).to.equal(return_code.AEROSPIKE_OK);
                var ind = key.key.substr(10);
                expect(bins.string_bin).to.equal(ind);
                expect(bins.integer_bin).to.equal(parseInt(ind));
                var obj = msgpack.unpack(bins.blob_bin);
                expect(obj.integer).to.equal(parseInt(ind));
                expect(obj.string).to.equal('Some String');
                expect(obj.array).to.eql([1,2,3]);
                if ( ++m == n) {
                    console.log("GET TEST WITH READ POLICY SUCCESS");
                    CleanRecords('READPOLICY');
                }
            });
            }
        });
    }
    });
});
