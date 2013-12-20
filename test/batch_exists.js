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
var m = 0;
var startBatch = 0;
describe( 'BATCH-EXISTS FUNCTION', function() {
    it ( 'SIMPLE BATCH-EXIST TEST' , function() {
        for ( var i = 0; i < 4*n; i++ ) {
            var key = { ns: params.ns, set: params.set, key:"BATCHEXISTS"+i };
            var rec= GetRecord(i);
            client.put(key, rec.bins, rec.metadata, function( err, meta, key) {
                expect(err).to.exist;
                expect(err.code).to.equal(return_code.AEROSPIKE_OK);
                if ( ++m == 4*n) {
                    m = 0;
                    startBatch = 1;
                } 
            });
        }
    if ( startBatch == 1) 
    {   
        for ( var i = 0; i < n; i++) {
            var K_array = [ {ns:params.ns, set:params.set, key:"BATCHEXISTS" +  (i*4) },
                            {ns:params.ns, set:params.set, key:"BATCHEXISTS" +  (i*4)+1 },
                            {ns:params.ns, set:params.set, key:"BATCHEXISTS" +  (i*4)+2 },
                            {ns:params.ns, set:params.set, key:"BATCHEXISTS" +  (i*4)+3 } ];
            client.batch_get(K_array, function(err, rec_list){
                expect(err).to.exist;
                expect(err.code).to.equal(return_code.AEROSPIKE_OK);
                expect(rec_list.length).to.equal(4);
                for ( var j = 0; j < rec_list.length; j++) {
                    expect(rec_list[j].recstatus).to.equal(return_code.AEROSPIKE_OK);
                    expect(rec_list[i].meta).to.exist;
                    expect(rec_list[i].meta.gen).to.equal(1);
                    if ( rec_list[i].meta.ttl != 100) {
                        expect(rec_list[i].meta.ttl).to.be.above(90)
                        expect(rec_list[i].meta.ttl).to.be.below(100)
                    } else {
                        expect(rec_list[i].meta.ttl).to.be.equal(100);
                    }
                    if ( ++m == n ) {
                        n = 4*n;
                        console.log("BATCH EXISTS TEST SUCCESS")
                        CleanRecords('BATCHEXISTS');
                    }
                }
            });
        }
    }
    });

});

