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


function GetWritePolicyDefault()
{
    var writepolicy = { timeout : 10,
                        gen : Policy.Generation.IGNORE,
                        retry: Policy.Retry.ONCE, 
                        key: Policy.Key.SEND, 
                        exists: Policy.Exists.IGNORE};
    return writepolicy;
    
}

describe ( 'PUT FUNCTIONALITY', function() {
    it( 'SIMPLE PUT TEST', function() {
        var m = 0;
        for ( var i = 1; i <= n; i++) {
            var Key = { ns : params.ns, set : params.set, key : 'PUT' + i }
            var rec = new GetRecord(i);
            client.put(Key, rec.bins, rec.metadata, function(err) {
                expect(err).to.exist;
                expect(err.code).to.equal(return_code.AEROSPIKE_OK);
                if ( ++m == n) {
                    console.log("SIMPLE PUT TEST SUCCESS");
                    m = 0;
                    CleanRecords('PUT');
                }
            });
        }
    });

//Expected to pass
    it(' GENERATION EQUALITY -- SHOULD SUCCEED', function() {
        var recGen = 0;
        var m = 0;
        for ( var i = 1; i <= n; i++) {
            var K = { ns:params.ns, set: params.set, key:'GEN_SUCCESS' + i };
            var rec = new GetRecord(i);
            client.put(K, rec.bins, rec.metadata, function(err, meta, key) {
            client.get(key, function (err, bins, meta, key) {
                if ( err.code == return_code.AEROSPIKE_OK) {
                    recGen = meta.gen ;
                }
                var writepolicy = new GetWritePolicyDefault();
                var rec = new GetRecord(i);
                rec.metadata.gen = recGen;
                client.put( key, rec.bins, rec.metadata, writepolicy, function (err, meta, key) {
                    expect(err).to.exist;
                    expect(err.code).to.equal(return_code.AEROSPIKE_OK);
                    if( ++m == n) {
                        m = 0;
                        console.log("GENERATION EQUALITY SUCCESS");
                        CleanRecords('GEN_SUCCESS');
                    }
                });
            });

            });
        }
    });
//});

//Expected to fail
    it(' GENERATION EQUALITY -- NEGATIVE', function() {
        var recGen = 0;
        var m = 0;
        for ( var i = 1; i <= n; i++) {
            var K = { ns:params.ns, set: params.set, key:'GEN_FAILURE' + i };
            var rec = new GetRecord(i);
            client.put(K, rec.bins, rec.metadata, function(err, meta, key) {
            client.get(key, function (err, bins, meta, key) {
                if ( err.code == return_code.AEROSPIKE_OK) {
                    recGen = meta.gen ;
                }
                var writepolicy = new GetWritePolicyDefault();
                writepolicy.gen = Policy.Generation.EQ;
                var rec = new GetRecord(i);
                rec.metadata.gen = recGen+10;
                client.put( key, rec.bins, rec.metadata, writepolicy, function (err, meta, key) {
                    expect(err).to.exist;
                    expect(err.code).to.equal(return_code.AEROSPIKE_ERR_RECORD_GENERATION);
                    if( ++m == n) {
                        m = 0;
                        console.log("GENERATION EQUALITY NEGATIVE PUT SUCCESS");
                        CleanRecords('GEN_FAILURE');
                    }
                });
            });

            });
        }
    });
//});

// better way to test timeout error
    it ('WRITE POLICY TEST -- TEST FOR TIMEOUT ERROR ', function() {
        var m = 0;
        for ( var i = 1; i <= n; i++) {
            var K = { ns: params.ns, set : params.set, key : 'TIMEOUT' + i };
            var writepolicy = { timeout : 1 }
            var obj = { a : 1, b: "Some String", c: [1,2,3] };
            var packed_obj = msgpack.pack(obj);
            var bins = {s : i.toString(), i : i, b : packed_obj };
            var metadata = { ttl : 100, gen : 1 };
            client.put( K, bins, metadata, writepolicy, function (err) {
                expect(err).to.exist;
                if ( err.code > 0 ) {
                    expect(err.code).to.equal(return_code.AEROSPIKE_ERR_TIMEOUT);
                }
                if ( ++m == n ) {   
                    console.log("TIMEOUT ERROR TEST SUCCESS");
                    CleanRecords("TIMEOUT");
                    n = 1000;
                    m = 0;
                }
            });
        }
    });


//Expected to pass
    it(' EXISTS POLICY  CREATE-- SHOULD SUCCEED', function() {
        var m = 0;
        for ( var i = 1; i <= n; i++) {
            var K = { ns:params.ns, set: params.set, key:'EXIST_SUCCESS' + i };
            var rec = new GetRecord(i);
            var writepolicy = new GetWritePolicyDefault();
            writepolicy.exists = Policy.Exists.CREATE;
            client.put(K, rec.bins, rec.metadata, writepolicy, function(err, meta, key) {
                expect(err).to.exist;
                expect(err.code).to.equal(return_code.AEROSPIKE_OK);
                if( ++m == n) {
                    m = 0;
                    console.log("EXISTS POLICY BASED PUT SUCCESS");
                    CleanRecords('EXIST_SUCCESS');
                }
            });
        }
    });
//});

//Expected to fail

    it(' EXISTS POLICY  CREATE -- NEGATIVE TEST', function() {
        var m = 0;
        for ( var i = 1; i <= n; i++) {
            var K = { ns:params.ns, set: params.set, key:'EXIST_FAIL' + i };
            var rec = new GetRecord(i);
            var writepolicy = new GetWritePolicyDefault();
            writepolicy.exists = Policy.Exists.CREATE;
            client.put(K, rec.bins, rec.metadata, writepolicy, function(err, meta, key) {
                expect(err).to.exist;
                expect(err.code).to.equal(return_code.AEROSPIKE_OK);
                client.put(K, rec.bins, rec.metadata, writepolicy, function(err, meta, key) {
                    expect(err).to.exist;
                    expect(err.code).to.equal(return_code.AEROSPIKE_ERR_RECORD_EXISTS);
                    if( ++m == n) {
                        m = 0;
                        console.log("EXISTS POLICY CREATE NEGATIVE  -- SUCCESS");
                        CleanRecords('EXIST_FAIL');
                    }
                });
            });
        }
    });


//Expected to fail

// Array and float type bin is passed as bins for put operation.
// Expected to fail with AEROSPIKE_ERR_PARAM error code.
    it(' PARAMETER CHECKING-- NEGATIVE TEST', function() {
        var m = 0;
        for ( var i = 1; i <= n; i++) {
            var K = { ns:params.ns, set: params.set, key:'PARAM_CHECK' + i };
            var rec = new GetRecord(i);
            rec.bins.f = 123.45;
            rec.bins.arr = [123, 45, 67 ];
            client.put(K, rec.bins, rec.metadata, function(err, meta, key) {
                expect(err).to.exist;
                expect(err.code).to.equal(return_code.AEROSPIKE_ERR_PARAM);
                    if( ++m == n) {
                        m = 0;
                        console.log("PARAMETER CHECKING NEGATIVE  -- SUCCESS");
                        CleanRecords('PARAM_CHECK');
                    }
                });
        }
    });
});
