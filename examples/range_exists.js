/*******************************************************************************
 * Copyright 2013-2014 Aerospike, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 ******************************************************************************/

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

var fs = require('fs');
var aerospike = require('aerospike');
var yargs = require('yargs');

var Policy = aerospike.policy;
var Status = aerospike.status;

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
    process.exit(0);
}

/*******************************************************************************
 *
 * Configure the client.
 * 
 ******************************************************************************/

config = {

    // the hosts to attempt to connect with.
    hosts: [
        { addr: argv.host, port: argv.port }
    ],
    
    // log configuration
    log: {
        level: argv['log-level'],
        file: argv['log-file'] ? fs.openSync(argv['log-file'], "a") : 2
    },

    // default policies
    policies: {
        timeout: argv.timeout
    }
};

/*******************************************************************************
 *
 * Perform the operation
 * 
 ******************************************************************************/

aerospike.client(config).connect(function (err, client) {

    if ( err.code != Status.AEROSPIKE_OK ) {
        console.error("Error: Aerospike server connection error. ", err.message);
        process.exit(1);
    }

    //
    // Perform the operation
    //

    function exists_done(client, start, end, skip) {
        var total = end - start + 1;
        var done = 0;
        var success = 0;
        var notfound = 0;
        var failure = 0;
        var skipped = 0;
        var timeLabel = "range_exists @ " + total;

        console.time(timeLabel);

        return function(err, metadata, key, skippy) {

            if ( skippy === true ) {
                console.log("SKIP - ", key);
                skipped++;
            }
            else {
                switch ( err.code ) {
                    case Status.AEROSPIKE_OK:
                        console.log("OK - ", key, metadata);
                        success++;
                        break;
                
                    case Status.AEROSPIKE_ERR_RECORD_NOT_FOUND:
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

    function exists_start(client, start, end, skip) {
        var done = exists_done(client, start, end, skip);
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

            client.exists(key, done);
        }
    }

    exists_start(client, argv.start, argv.end, argv.skip);

});