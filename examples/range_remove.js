/**
 *
 *  node range_get [start [end [skip]]]
 *
 *  Read records with given key range
 *
 *  The default values are:
 *  - `start=1`
 *  - `end=1000`
 *  - `skip=0`
 *
 *  Example:
 *
 *    Read records with keys in range 1-100
 *
 *      node range_get 1 100
 *
 *    Read records with keys in range 1-100, skipping every fifth
 *
 *      node range_get 1 100 5
 *
 *    Write records with keys in range 900-1000
 *
 *      node range_put 900
 *
 */

var env = require('./env');
var aerospike = require('aerospike');

var status = aerospike.Status;
var policy = aerospike.Policy;

var client = aerospike.client(env.config).connect();

if ( client === null ) {
    console.log("Client not initialized.");
    return;
}

function remove_done(start, end, skip) {
    var total = end - start + 1;
    var done = 0;
    var success = 0;
    var notfound = 0;
    var failure = 0;
    var skipped = 0;
    var timeLabel = "range_remove @ " + total;

    console.time(timeLabel);

    return function(err, key, skippy) {

        if ( skippy == true ) {
            console.log("SKIP - %j", key);
            skipped++;
        }
        else {
            if ( err.code == status.AEROSPIKE_OK ) {
                console.log("OK - %j", key);
                success++;
            }
            else if ( err.code == status.AEROSPIKE_ERR_RECORD_NOT_FOUND ) {
                console.log("NOT_FOUND - %j", key);
                notfound++;
            }
            else {
                console.log("ERR - %j - %j", err, key);
                failure++;
            }
            
        }

        done++;
        if ( done >= total ) {
            console.timeEnd(timeLabel);
            console.log("");
            console.log("RANGE: start=%d end=%d skip=%d", start, end, skip);
            console.log("RESULTS: (%d completed, %d success, %d failed, %d notfound, %d skipped)", done, success, failure, notfound, skipped);
            console.log("");
            client.close();
        }
    }
}

function remove_start(start, end, skip) {
    var done = remove_done(start, end, skip);
    var i = start, s = 0;

    for (; i <= end; i++ ) {
        var key = {
            ns:  env.namespace,
            set: env.set,
            key: i
        };

        if ( skip != 0 && ++s >= skip ) {
            s = 0;
            done(null,key,true);
            continue;
        }

        client.remove(key, done);
    }
}

var range_start = process.argv.length-2 < 1 ? 1 : process.argv[2];
var range_end = process.argv.length-2 < 2 ? 1000 : process.argv[3];
var range_skip = process.argv.length-2 < 3 ? 0 : process.argv[4];

remove_start(range_start, range_end, range_skip);
