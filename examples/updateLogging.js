/*****************************************************************************
 *
 * node logging --log-file <path/to/log-file> --log-level <0-4>
 *
 * if --log-file option is not specified, the log messages are redirected to stderr
 *
 * Update the configurations of logger using client.updateLogging function.
 *
 * Examples:
 *      
 *  Enable Debug logging to stderr.
 *
 *      node logging --log-level 3.
 *
 *  Enable Detail logging to stderr.
 *
 *     node logging --log-level 4.
 *
 *  Redirect the log messages to a file `example.log`
 *
 *     node logging --log-level <0-4> --log-file example.log
 *
 ******************************************************************************/

var optimist = require('optimist');
var aerospike = require('aerospike');
var status = aerospike.status;
var policy = aerospike.policy;
var fs = require('fs');

/*******************************************************************************
 *
 * Options parsing
 * 
 ******************************************************************************/

var argp = optimist
    .usage("$0 [options]")
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

if ( argv.help === true ) {
    argp.showHelp();
    return;
}


// create client object with the configurations given in the argv.
function create_client() {
    var client = aerospike.client({
        hosts: [
            { addr: argv.host, port: argv.port }
        ],
        policies: {
            timeout: argv.timeout
        }
    });
    
    return client;
}


//connect to the aerospike cluster.
function aerospike_connect( client, callback) {
    client.connect(function(err, client) {
        if (err.code != status.AEROSPIKE_OK) {
            console.log("Aerospike server connection Error: %j", err)
            return;
        }
        callback(client);
    });
    if ( client === null ) {
        console.error("Error: Client not initialized.");
        return;
    }
}

/*******************************************************************************
 *
 * Perform the operation
 * 
 ******************************************************************************/

function put_done(client) {


    return function(err, key) {
        switch ( err.code ) {
            case status.AEROSPIKE_OK:
                console.log("OK - ", key);
                break;
            default:
                console.log("ERR - ", err, key);
        }
        console.log();
        get_start(client);
    };
}

function put_start(client) {
    var done = put_done(client);
        var key = {
            ns:  argv.namespace,
            set: argv.set,
            key: 123
        };

        var record = {
            k: 123,
            s: "abc",
            i: 123 * 1000 + 123,
            b: new Buffer([0xa, 0xb, 0xc])
        };

        var metadata = {
            ttl: 10000,
            gen: 0
        };
        client.put(key, record, metadata, done);
}

function get_done(client) {

    return function(err, record, metadata, key) {
        switch ( err.code ) {
            case status.AEROSPIKE_OK:
                if ( record.k != key.key ) {
                    console.log("INVALID - ", key, metadata, record);
                    console.log("        - record.k != key.key");
                }
                else if ( record.i != record.k * 1000 + 123 ) {
                    console.log("INVALID - ", key, metadata, record);
                    console.log("        - record.i != record.k * 1000 + 123");
                }
                else if ( record.b[0] == 0xa && record.b[0] == 0xb && record.b[0] == 0xc ) {
                    console.log("INVALID - ", key, metadata, record);
                    console.log("        - record.b != [0xa,0xb,0xc]");
                }
                else {
                    console.log("VALID - ", key, metadata, record);
                }
                break;
            default:
                console.log("ERR - ", err, key);

        }
        console.log();
    };
}

function get_start(client ) {
    var done = get_done(client);
        var key = {
            ns:  argv.namespace,
            set: argv.set,
            key: 123
        };

        client.get(key, done);
}


// create a client object.
var client = create_client();

// if log file option is set, open a file.
if ( argv['log-file'] !== undefined) {
    fs.open(argv['log-file'], 'a', function (err, fd) {
        // update the logger configuration, with the new fd.
        client.updateLogging({level: argv['log-level'], file: fd});

        // connect to the cluster and do a write to see the logger in action.
        aerospike_connect( client, function(client) {
            put_start(client);
        });
    });
} else {

    // log-file is given as a parameter, update the logger to the default values 
    // in the argv. 
    client.updateLogging({level:argv['log-level'], file: argv['log-file']});

    // connect to the cluster and do a write, followed by read, to see the logger
    // in action.
    aerospike_connect( client, function (client) {
        put_start(client);
    });
}


