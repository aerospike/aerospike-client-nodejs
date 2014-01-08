/*******************************************************************************
 *
 * Remove a record.
 * 
 ******************************************************************************/

var optimist = require('optimist');
var aerospike = require('aerospike');
var status = aerospike.Status;
var policy = aerospike.Policy;

/*******************************************************************************
 *
 * Options parsing
 * 
 ******************************************************************************/

var argp = optimist
    .usage("$0 [options] key")
    .options({
        help: {
            boolean: true,
            describe: "Display this message."
        },
        host: {
            alias: "h",
            default: "127.0.0.1",
            describe: "Aerospike database address."
        },
        port: {
            alias: "p",
            default: 3000,
            describe: "Aerospike database port."
        },
        timeout: {
            alias: "t",
            default: 10,
            describe: "Timeout in milliseconds."
        },
        log: {
            alias: "l",
            default: aerospike.Log.INFO,
            describe: "Log level [0-5]"
        },
        namespace: {
            alias: "n",
            default: "test",
            describe: "Namespace for the keys."
        },
        set: {
            alias: "s",
            default: "demo",
            describe: "Set for the keys."
        }
    });

var argv = argp.argv;
var keyv = argv._.length === 1 ? argv._[0] : null;

if ( argv.help === true ) {
    argp.showHelp();
    return;
}

if ( keyv === null ) {
    console.error("Error: Please provide a key for the operation");
    console.error();
    argp.showHelp();
    return;
}

/*******************************************************************************
 *
 * Establish a connection to the cluster.
 * 
 ******************************************************************************/

var client = aerospike.client({
    hosts: [
        { addr: argv.host, port: argv.port }
    ],
    log: {
        level: argv.log
    },
    policies: {
        timeout: argv.timeout
    }
}).connect();

if ( client === null ) {
    console.error("Error: Client not initialized.");
    return;
}

/*******************************************************************************
 *
 * Perform the operation
 * 
 ******************************************************************************/

var key = {
    ns:  argv.namespace,
    set: argv.set,
    key: keyv
};

console.time("remove");

client.remove(key, function(err, metadata, key) {
    if ( err.code == status.AEROSPIKE_OK ) {
        console.log("OK - ", key, metadata);
    }
    else if ( err.code == status.AEROSPIKE_ERR_RECORD_NOT_FOUND ) {
        console.log("NOT_FOUND - ", key);
    }
    else {
        console.log("ERR - ", err, key);
    }

    console.timeEnd("remove");
    console.log("");
    
    client.close();
});


