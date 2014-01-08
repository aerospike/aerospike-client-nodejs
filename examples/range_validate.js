/*******************************************************************************
 *
 *  node range_validate --start <start> --end <end>
 *
 *  Write and validate records with keys in given numeric range.
 *  
 *  Examples:
 *
 *    Write and Validate records with keys in range 1-99:
 *
 *      node range_validate --start 1 --end 99
 *
 *    Write and Validate records with keys in range 900-1000
 *
 *      node range_put --start 900
 *
 *    Write and Validate a single record with key 99
 *
 *      node range_validate --start 99 --end 99
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
        },
        start: {
            default: 1,
            describe: "Start value for the key range."
        },
        end: {
            default: 1000,
            describe: "End value for the key range."
        }
    });

var argv = argp.argv;

if ( argv.help === true ) {
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

function put_done(start, end) {
    var total = end - start + 1;
    var done = 0;
    var timeLabel = "range_put @ " + total;

    console.time(timeLabel);

    return function(err, metadata, key) {
        if ( err.code == status.AEROSPIKE_OK ) {
            console.log("OK - ", key, metadata);
        }
        else {
            console.log("ERR - ", err, key);
        }
        
        done++;
        if ( done >= total ) {
            console.timeEnd(timeLabel);
            console.log();
            get_start(start, end);
        }
    }
}

function put_start(start, end) {
    var done = put_done(start, end);
    var i = 0;

    for ( i = start; i <= end; i++ ) {
        var key = {
            ns:  argv.namespace,
            set: argv.set,
            key: i
        };

        var record = {
            k: i,
            s: "abc",
            i: i * 1000 + 123,
            b: new Buffer([0xa, 0xb, 0xc])
        };

        var metadata = {
            ttl: 10000,
            gen: 0
        };

        client.put(key, record, metadata, done);
    }
}

function get_done(start, end) {
    var total = end - start + 1;
    var done = 0;
    var timeLabel = "range_get @ " + total;

    console.time(timeLabel);

    return function(err, record, metadata, key) {
        if ( err.code == status.AEROSPIKE_OK ) {
            if ( record.k != key.key ) {
                console.log("INVALID - ", key, metadata, record);
                console.log("        - record.k != key.key", key, metadata, record);
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
        }
        else {
            console.log("ERR - ", err, key);
        }
        
        done++;
        if ( done >= total ) {
            console.timeEnd(timeLabel);
            console.log();
            client.close();
        }
    };
}

function get_start(start, end) {
    var done = get_done(start, end);
    var i = 0;

    for ( i = start; i <= end; i++ ) {
        var key = {
            ns:  argv.namespace,
            set: argv.set,
            key: i
        };

        client.get(key, done);
    }
}

put_start(argv.start, argv.end);
