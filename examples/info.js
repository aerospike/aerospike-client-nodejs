/*******************************************************************************
 *
 * Get state information from the cluster or a single host.
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
var request = argv._.length !== 0 ? argv._.shift() : "statistics";

if ( argv.help === true ) {
    argp.showHelp();
    return;
}

/*******************************************************************************
 *
 * Establish a connection to the cluster.
 * 
 ******************************************************************************/
function aerospike_setup ( callback) {
var client = aerospike.client({
    hosts: [
        { addr: argv.host, port: argv.port }
    ],
    log: {
        level: argv['log-level'],
        file: argv['log-file']
    },
    policies: {
        timeout: argv.timeout
    }
}).connect(function(err, client) {
    if (err.code != status.AEROSPIKE_OK) {
        console.log("Aerospike server connection Error: %j", err)
        return;
    }
    if ( client === null ) {
        console.error("Error: Client not initialized.");
        return;
    }
    callback(client);
});

}
/*******************************************************************************
 *
 * Perform the operation
 * 
 ******************************************************************************/
function Info( client) {
console.log("host...");

client.info(request, {addr: argv.host, port: argv.port}, function(err, response, host) {

    switch ( err.code ) {
        case status.AEROSPIKE_OK:
            console.log("OK - ", host, response);
            console.log();
            break;
        default:
            console.log("ERR - ", err, key);
            console.log();
    }
    
    console.log("cluster...");

    client.info(request, function(err, response, host) {
        switch ( err.code ) {
            case status.AEROSPIKE_OK:
                console.log("OK - ", host, response);
                break;
            default:
                console.log("ERR - ", err, key);
        }

        console.log();
    });

});
}

if (argv['log-file'] !== undefined) {
    fs.open( argv['log-file'], 'a', function(err, fd) {
        argv['log-file'] = fd;
        aerospike_setup( function (client) {
            Info(client);
        });
    });
} else {
    aerospike_setup(function (client) {
        Info(client);
    });
}
