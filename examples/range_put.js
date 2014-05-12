/*******************************************************************************
 *
 *  node range_put --start <start> --end <end> --skip <skip>
 *
 *  Write records with given key range.
 *
 *  Examples:
 *
 *    Write records with keys in range 1-100
 *
 *      node range_put --start 1 --end 100
 *
 *    Read records with keys in range 1-100, skipping every 5th key (in sequence)
 *
 *      node range_get --start 1 --end 100 --skip 5
 *
 *    Write records with keys in range 900-1000
 *
 *      node range_put --start 900
 *
 ******************************************************************************/

var fs = require('fs');
var aerospike = require('aerospike');
var yargs = require('yargs');

var policy = aerospike.policy;
var status = aerospike.status;

/*******************************************************************************
 *
 * Options parsing
 * 
 ******************************************************************************/

var argp = yargs
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
        level: argv['log-level'],
        file: argv['log-file'] ? fs.openSync(argv['log-file'], "a") : 2
    },
    policies: {
        timeout: argv.timeout
    }
}).connect(function (err, client ) {
    if ( err.code != status.AEROSPIKE_OK ) {
        console.log("Aerospike server connection Error: %j", err)
        return;
    }
    if ( client === null ) {
        console.error("Error: Client not initialized.");
        return;
    }
});

/*******************************************************************************
 *
 * Perform the operation
 * 
 ******************************************************************************/

function put_done(client, start, end, skip) {
    var total = end - start + 1;
    var done = 0;
    var success = 0;
    var failure = 0;
    var skipped = 0;
    var timeLabel = "range_put @ " + total;

    console.time(timeLabel);

    return function(err, key, skippy) {

        if ( skippy === true ) {
            console.log("SKIP - ", key);
            skipped++;
        }
        else {
            switch ( err.code ) {
                case status.AEROSPIKE_OK:
                    console.log("OK - ", key);
                    success++;
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
            console.log("RANGE: start=%d end=%d skip=%d)", start, end, skip);
            console.log("RESULTS: (%d completed, %d success, %d failed, %d skipped)", done, success, failure, skipped);
            console.log();
            client.close();
        }
    }
}

function put_start(client, start, end, skip) {
    var done = put_done(client, start, end, skip);
    var i = start, s = 0;

    for (; i <= end; i++ ) {

        var key = {
            ns:  argv.namespace,
            set: argv.set,
            key: i
        };

        if ( skip !== 0 && ++s >= skip ) {
            s = 0;
            done(null, key, true);
            continue;
        }

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

put_start(client, argv.start, argv.end, argv.skip);
