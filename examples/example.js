var aerospike = require('aerospike');
var msgpack = require('msgpack');

// Return codes returned by the aerospike server
var status = aerospike.Status;

// Various policies used by aerospike operation (PUT,GET etc).
var policy = aerospike.Policy;

// All the operations available for operate function call
var operations = aerospike.Operators;

// Config.json file -- contains the config parameters
var con = require('./config');

// config object -- argument to the aerospike.connect() func call
var config = {
	  hosts:[{ addr:con.config.host,port : con.config.port }
		]}

// connecting to aerospike database. 
var client = aerospike.connect(config);


