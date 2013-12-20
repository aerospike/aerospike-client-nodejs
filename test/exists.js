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

describe( 'EXISTS FUNCTIONALITY', function() {
    it( 'SIMPLE EXISTS TEST', function() {
        var m = 0;
        for ( var i = 1; i <= n; i++) {
        var rec = GetRecord(i);
        var Key = { ns: params.ns, set: params.set,key: 'EXISTS' + i }
        client.put (Key, rec.bins, rec.metadata, function (err, meta, key) {
            if ( err.code == return_code.AEROSPIKE_OK) { 
            client.exists(key, function ( err1, meta1, key1) {
                expect(err1).to.exist;
                expect(err1.code).to.equal(return_code.AEROSPIKE_OK);
                expect(meta1).to.exist;
                expect(meta1.gen).to.equal(1);
                if ( meta1.ttl != 100) {
                    expect(meta1.ttl).to.be.above(90)
                    expect(meta1.ttl).to.be.below(100)
                } else {
                    expect(meta1.ttl).to.be.equal(100);
                }   

                if ( ++m == n) {
                    m = 0;
                    console.log("EXISTS TEST SUCCESS");
                    CleanRecords('EXISTS');
                }
            });
            }
        });
    }
    });
});


