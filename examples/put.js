
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

var record = {
    s: "abc",
    i: 123,
    b: new Buffer([0xa, 0xb, 0xc])
};

var metadata = {
    ttl: 10000,
    gen: 0
};

console.time("put");

client.put(key, record, metadata, function(err, metadata, key) {
    if ( err.code == status.AEROSPIKE_OK ) {
        console.log("OK - %j %j", key, metadata);
    }
    else {
        console.log("ERR - %j - %j", err, key);
    }

    console.timeEnd("put");
    console.log("");
    
    client.close();
});
