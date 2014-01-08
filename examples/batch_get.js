/*******************************************************************************
 *
 * Read a batch of records.
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
    .usage("$0 [options] key [key ...]")
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
var keys = argv._.map(function(key) {
    return { ns: argv.namespace, set: argv.set, key: key };
});

if ( argv.help === true ) {
    argp.showHelp();
    return;
}

if ( keys.length === 0 ) {
    console.error("Error: Please provide one or more keys for the operation");
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

console.time("batch_get");

client.batch_get(keys, function (err, results) {
    var i = 0;
    if ( err.code == status.AEROSPIKE_OK ) {
        for ( i = 0; i < results.length; i++ ) {
            switch ( results[i].status ) {
                case status.AEROSPIKE_OK:
                    console.log("OK - ", results[i].key, results[i].metadata, results[i].record);
                    break;
                case status.AEROSPIKE_ERR_RECORD_NOT_FOUND:
                    console.log("NOT_FOUND - ", results[i].key);
                    break;
                default:
                    console.log("ERR - %d - ", results[i].status, results[i].key);
            }
        }
    }
    else {
        console.log("ERR - ", err);
    }

    console.timeEnd("batch_get");
    console.log();
    
    client.close();
});
