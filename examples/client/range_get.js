/*******************************************************************************
 *
 *  node range_get --start <start> --end <end> --skip <skip>
 *
 *  Read records with given key range.
 *
 *  Examples:
 *
 *    Read records with keys in range 1-100
 *
 *      node range_get -start 1 --end 100
 *
 *    Read records with keys in range 1-100, skipping every fifth
 *
 *      node range_get --start 1 --end 100 --skip 5
 *
 *    Write records with keys in range 900-1000
 *
 *      node range_put --start 900
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
        },
        skip: {
            default: 0,
            describe: "Skip every n keys."
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
}).connect(function(err) {
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

function get_done(start, end, skip) {
    var total = end - start + 1;
    var done = 0;
    var success = 0;
    var notfound = 0;
    var failure = 0;
    var skipped = 0;
    var timeLabel = "range_get @ " + total;

    console.time(timeLabel);

    return function(err, record, metadata, key, skippy) {

        if ( skippy === true ) {
            console.log("SKIP - ", key);
            skipped++;
        }
        else {
            switch ( err.code ) {
                case status.AEROSPIKE_OK:
                    console.log("OK - ", key, metadata, record);
                    success++;
                    break;
            
                case status.AEROSPIKE_ERR_RECORD_NOT_FOUND:
                    console.log("NOT_FOUND - ", key);
                    notfound++;
                    break;
                default:
                    console.log("ERR - ", err, key);
                    failure++;
            }
        }

        done++;
        if ( done >= total ) {
            console.timeEnd(timeLabel);
            console.log();
            console.log("RANGE: start=%d end=%d skip=%d", start, end, skip);
            console.log("RESULTS: (%d completed, %d success, %d failed, %d notfound, %d skipped)", done, success, failure, notfound, skipped);
            console.log();
            client.close();
        }
    }
}

function get_start(start, end, skip) {
    var done = get_done(start, end, skip);
    var i = start, s = 0;

    for (; i <= end; i++ ) {
        var key = {
            ns:  argv.namespace,
            set: argv.set,
            key: i
        };

        if ( skip !== 0 && ++s >= skip ) {
            s = 0;
            done(null,null,null,key,true);
            continue;
        }

        client.get(key, done);
    }
}

get_start(argv.start, argv.end, argv.skip);
