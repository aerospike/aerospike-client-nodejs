var aerospike = require('aerospike')
var con = require('./config')
var msgpack = require('msgpack')

var n = con.config.nops

var config = { 
	hosts: [{addr:con.config.host, port : con.config.port}
	]}
var client = aerospike.client(config).connect();

exports.n = n
exports.client = client

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
	var meta = { ttl : 100, gen : 0 }
	var rec = { metadata : meta, bins : binlist };
	return rec;
}

function ParseConfig( param )
{
	param.ns = con.config.namespace;
	param.set = con.config.set;
}

exports.CleanRecords = CleanRecords;
exports.GetRecord = GetRecord;
exports.ParseConfig = ParseConfig;
