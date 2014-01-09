/*******************************************************************************
 *
 * Write a record.
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

client.put(key, record, metadata, function(err, key) {
    switch ( err.code ) {
        case status.AEROSPIKE_OK:
            console.log("OK - ", key);
            break;
        default:
            console.log("ERR - ", err, key);
    }

    console.timeEnd("put");
    console.log();
    
    client.close();
});
