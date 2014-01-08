
var env = require('./env')
var aerospike = require('aerospike')

var status = aerospike.Status;
var policy = aerospike.Policy;

var client = aerospike.client(env.config).connect();

if ( client === null ) {
    console.log("Client not initialized.");
    return;
}

console.time("info:host");

client.info("objects", env.host, function(err, host, response) {

    if ( err.code == status.AEROSPIKE_OK ) {
        console.log("OK - %j %j", host, response);
    }
    else {
        console.log("ERR - %j - %j", err, key);
    }
    
    console.timeEnd("info:host");
    console.log("");

    console.time("info:cluster");

    client.info("objects", function(err, host, response) {
        if ( err.code == status.AEROSPIKE_OK ) {
            console.log("OK - %j %j", host, response);
        }
        else {
            console.log("ERR - %j - %j", err, key);
        }

        console.timeEnd("info:cluster");
        console.log("");
        
        client.close();
    });

});

