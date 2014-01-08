
var env = require('./env');
var aerospike = require('aerospike');

var status = aerospike.Status;
var policy = aerospike.Policy;

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

console.time("get");

client.get(key, function(err, record, metadata, key) {
    if ( err.code == status.AEROSPIKE_OK ) {
        console.log("OK - %j %j %j", key, metadata, record);
    }
    else if ( err.code == status.AEROSPIKE_ERR_RECORD_NOT_FOUND ) {
        console.log("NOT_FOUND - %j", key);
    }
    else {
        console.log("ERR - %j - %j", err, key);
    }
    
    console.timeEnd("get");
    console.log("");
    
    client.close();
});
