var assert = require('assert');
var request = require('superagent');
var expect = require('expect.js');
var aerospike = require('aerospike');
var msgpack = require('msgpack');
var return_code = aerospike.Status;
var Policy = aerospike.Policy;
var Operator = aerospike.Operators;
var config = { 
		hosts:[{ addr:"127.0.0.1",port : 3000 }
		]}  
var client = aerospike.connect(config);
var n = 1000;
var m = 0

function CleanRecords( str )
{
    for ( var i = 1; i <= n; i++) {
		var key = { ns: 'test', set: 'demo', key: str + i } 
		
		client.remove(key, function(err) {
		});		
	}   
}

function GetRecord(i)
{
	var obj = { 'integer' : i, 'string' : "Some String" , 'array' : [1,2,3] };
	var packed_obj = msgpack.pack(obj); 
	var binlist = { 'string_bin' : i.toString(), 'integer_bin': i, 'blob_bin' : packed_obj };
	var rec = { ttl:100, gen : 0, bins : binlist };
	return rec;
}

exports.CleanRecords = CleanRecords;
exports.GetRecord = GetRecord;

