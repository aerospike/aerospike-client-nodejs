/**
 *
 *  node range_validate [start [end]]
 *
 *  Write and validate records with keys in given numeric range.
 *
 *  The default values are:
 *  - `start=1`
 *  - `end=1000`
 *
 *  Examples:
 *
 *    Write and Validate records with keys in range 1-99:
 *
 *      node range_validate 1 99
 *
 *    Write and Validate records with keys in range 900-1000
 *
 *      node range_put 900
 *
 *    Write and Validate a single record with key 99
 *
 *      node range_validate 99 99
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

var range_start = process.argv.length-2 < 1 ? 1 : process.argv[2];
var range_end = process.argv.length-2 < 2 ? 1000 : process.argv[3];
var range_total = range_end - range_start;
var range_done = 0;

function put_done(start, end) {
    var total = end - start + 1;
    var done = 0;
    var timeLabel = "range_put @ " + total;

    console.time(timeLabel);

    return function(err, metadata, key) {
        if ( err.code == status.AEROSPIKE_OK ) {
            console.log("OK - %j %j", key, metadata);
        }
        else {
            console.log("ERR - %j - %j", err, key);
        }
        
        done++;
        if ( done >= total ) {
            console.timeEnd(timeLabel);
            console.log("");
            get_start(start, end);
        }
    }
}

function put_start(start, end) {
    var done = put_done(start, end);
    var i = 0;

    for ( i = start; i <= end; i++ ) {
        var key = {
            ns:  env.namespace,
            set: env.set,
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
                console.log("INVALID - %j %j %j", key, metadata, record);
                console.log("        - record.k != key.key", key, metadata, record);
            }
            else if ( record.i != record.k * 1000 + 123 ) {
                console.log("INVALID - %j %j %j", key, metadata, record);
                console.log("        - record.i != record.k * 1000 + 123");
            }
            else if ( record.b[0] == 0xa && record.b[0] == 0xb && record.b[0] == 0xc ) {
                console.log("INVALID - %j %j %j", key, metadata, record);
                console.log("        - record.b != [0xa,0xb,0xc]");
            }
            else {
                console.log("VALID - %j %j %j", key, metadata, record);
            }
        }
        else {
            console.log("ERR - %j - %j", err, key);
        }
        
        done++;
        if ( done >= total ) {
            console.timeEnd(timeLabel);
            console.log("");
            client.close();
        }
    };
}

function get_start(start, end) {
    var done = get_done(start, end);
    var i = 0;

    for ( i = start; i <= end; i++ ) {
        var key = {
            ns:  env.namespace,
            set: env.set,
            key: i
        };

        client.get(key, done);
    }
}


put_start(range_start, range_end);
