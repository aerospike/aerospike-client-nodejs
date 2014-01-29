/*******************************************************************************
 *
 * Read a record.
 * 
 ******************************************************************************/

var optimist = require('optimist');
var fs = require('fs');
var aerospike = require('aerospike');
var status = aerospike.status;
var policy = aerospike.policy;

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
        'log-level': {
            alias: "l",
            default: aerospike.log.INFO,
            describe: "Log level [0-5]"
        },
        'log-file': {
            default: undefined,
            describe: "Path to a file send log messages to."
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
 * Create a client object
 *
 ******************************************************************************/

var client = aerospike.client({
    hosts: [
        { addr: argv.host, port: argv.port }
    ],
    policies: {
        timeout: argv.timeout
    }
});

/*****************************************************************************
 *
 * set the logger if --log-file option is set
 *
 *****************************************************************************/
if(argv['log-file'] != undefined) {
    fs.open(argv['log-file'], 'a', function(err, fd) {
        client.updateLogging({level:argv['log-level'], file: fd});
    });
}


/*******************************************************************************
 *
 * Establish a connection to the cluster.
 * 
 ******************************************************************************/

var client = client.connect(function(err) {
    if (err.code != status.AEROSPIKE_OK) {
        console.log("Aerospike server connection Error: %j", err)
        return;
    }
});

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

console.time("get");

client.get(key, function(err, record, metadata, key) {
    switch ( err.code ) {
        case status.AEROSPIKE_OK:
            console.log("OK - ", key, metadata, record);
            break;
        case status.AEROSPIKE_ERR_RECORD_NOT_FOUND:
            console.log("NOT_FOUND -", key);
            break;
        default:
            console.log("ERR - ", err, key);
    }
    
    console.timeEnd("get");
    console.log();
    
    client.close();
});
