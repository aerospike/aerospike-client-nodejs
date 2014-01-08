
var env = require('./env')
var aerospike = require('aerospike')

var status = aerospike.Status;
var policy = aerospike.Policy;

var client = aerospike.client(env.config).connect();

if ( client === null ) {
    console.log("Client not initialized.");
    return;
}

var keys = [
    { ns: env.namespace, set: env.set, key: 1 },
    { ns: env.namespace, set: env.set, key: 2 },
    { ns: env.namespace, set: env.set, key: 3 },
    { ns: env.namespace, set: env.set, key: 4 },
];

console.time("batch_exists");

client.batch_exists(keys, function (err, results) {
    if ( err.code == status.AEROSPIKE_OK ) {
        for ( i = 0; i < results.length; i++ ) {
            if ( results[i].status != status.AEROSPIKE_OK && results[i].metadata != null ) {
                console.log("OK - %j %j", results[i].key, results[i].metadata);
            }
            else {
                console.log("ERR - %d - %j", results[i].status, results[i].key);
            }
        }
    }
    else {
        console.log("ERR - %j", err);
    }

    console.timeEnd("batch_exists");
    console.log("");
    
    client.close();
})