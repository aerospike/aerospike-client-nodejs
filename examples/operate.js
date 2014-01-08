
var env = require('./env');
var aerospike = require('aerospike');

var status = aerospike.Status;
var policy = aerospike.Policy;
var operations = aerospike.Operators;

var client = aerospike.client(env.config).connect();

if ( client === null ) {
    console.log("Client not initialized.");
    return;
}

var key = {
    ns:  env.namespace,
    set: env.set,
    key: 1
};

var ops = [
  { operation: operations.INCR,   bin_name: 'i', bin_value: 1 },
  { operation: operations.APPEND, bin_name: 's', bin_value: "def" },
  { operation: operations.READ,   bin_name: 'i' }
];

console.time("operate");

client.operate(key, ops, function(err, metadata, key) {
    if ( err.code == status.AEROSPIKE_OK ) {
        console.log("OK - %j %j", key, metadata);
    }
    else if ( err.code == status.AEROSPIKE_ERR_RECORD_NOT_FOUND ) {
        console.log("NOT_FOUND - %j", key);
    }
    else {
        console.log("ERR - %j - %j", err, key);
    }

    console.timeEnd("operate");
    console.log("");
    
    client.close();
});
