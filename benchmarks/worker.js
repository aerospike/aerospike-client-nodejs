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

/***********************************************************************
 *
 * Benchmark Worker, run operations and report results.
 *
 ***********************************************************************/

var aerospike = require('aerospike');
var cluster = require('cluster');
var fs  = require('fs');
var yargs = require('yargs');
var path = require('path');
var util = require('util');
var winston = require('winston');
var stats = require('./stats');
var status = aerospike.status;
var alerts   = require('./alerts.js');
var argv     = require("./config.json");
/**********************************************************************
 *
 *  MACROS
 *
 *********************************************************************/

var OP_TYPES = 2; // READ and WRITE
var STATS = 3; // OPERATIONS, TIMEOUTS and ERRORS
var READ = 0;
var WRITE = 1;
var QUERY = 2;
var TPS = 0;
var TIMEOUT = 1; 
var ERROR   = 2;
var QPS     = 0;
/***********************************************************************
 *
 * Options Parsing
 *
 ***********************************************************************/
/*var argp = yargs
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
            default: 0,
            describe: "Timeout in milliseconds."
        },
        ttl:{
            default: 10000,
            describe: "Time to live for the record (seconds). Units may be used: 1h, 30m, 30s"
        },
        log: {
            alias: "l",
            default: 1,
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
        user: {
            alias: "U",
            default:null,
            describe: "Username to connect to a secure cluster"
        },  
        password: {
            alias: "P",
            default: null,
            describe: "Password to connect to a secure cluster"
        },
        json: {
            alias: "j",
            default: false,
            describe: "Display report in JSON format."
        },
        silent: {
            default: false,
            describe: "Supress the tps statistics printed every second."
        },
        longevity: {
            default: false,
            describe: "Print intermediate output from workers."
        },
        operations: {
            alias: "O",
            default: 100,
            describe: "Total number of operations to perform per iteration per process."
        },
        iterations: {
            alias: "I",
            default: undefined,
            describe: "Total number of iterations to perform per process."
        },
        time: {
            alias: "T",
            default: undefined,
            describe: "Total amount of time to run the benchmark (seconds). Units may be used: 1h, 30m, 30s"
        },
        reads: {
            alias: "R",
            default: 1,
            describe: "The read in the read/write ratio."
        },
        writes: {
            alias: "W",
            default: 1,
            describe: "The write in the read/write ratio."
        },
        keyrange: {
            alias: "K",
            default: 100000,
            describe: "The number of keys to use."
        },
        datatype: {
            default: "INTEGER",
            describe: "The datatype of the record."
        },
        datasize: {
            default: 1024,
            describe: "Size of the record."
        },
        'chart-memory': {
            boolean: false,
            default: false,
            describe: "Chart the memory used before printing the summary."
        },
        'summary': {
            boolean: true,
            default: true,
            describe: "Produces a summary report (tables, charts, etc) at the end."
        }

    });

var argv = argp.argv;

if ( argv.help === true) {
    argp.showHelp();
    return;
}*/

if ( !cluster.isWorker ) {
    console.error('worker.js must only be run as a child process of main.js.');
    return;
}

argv.ttl = stats.parse_time_to_secs(argv.ttl);

/***********************************************************************
 *
 * Logging
 *
 ***********************************************************************/

function logger_timestamp() {
    return util.format('[worker: %d] [%s]', process.pid, process.hrtime());
}

var logger = new (winston.Logger)({
    transports: [
        new (winston.transports.Console)({
            level: 'info',
            silent: false,
            colorize: true
        })
	]
});

/***********************************************************************
 *
 * Aerospike Client
 *
 ***********************************************************************/

var config = {
		
    hosts: [
        { addr: argv.host, port: argv.port }
    ],
    policies: {
        timeout: argv.timeout
    },
	sharedMemory: {
		key: 0xA5000000,
		maxNodes: 16,
		maxNamespaces: 8,
		takeoverThresholdSeconds : 30
	}
};


if(argv.user !== null)
{
	config.user = argv.user;
}

if(argv.password !== null)
{
	config.password = argv.password;
}

var client = aerospike.client(config);

client.connect(function(err) {
    if ( err.code !== 0 ) {
        logger.error("Aerospike server connection error: ", err);
        process.exit(1);
    }
});

/***********************************************************************
 *
 * Operations
 *
 ***********************************************************************/
/**
* key are in range [min ... max]
*/
function keygen(min, max) {
    var rand = Math.floor(Math.random() * 0x100000000) % (max-min+1) + min;
    return rand < 1 ? 1 : rand;
}

var STRING_DATA = "This the test data to be written to the server";
/**
* Generate a record with string and blob in it if run for longevity.
* Size of strings and blob is argv.datasize ( default 1K).
*
* 
*/ 
function recordgen( key, binSpec ) {

    var data = {};
    var i = 0;
    do {
        var bin= binSpec[i];
        switch (bin.type) {
            case "INTEGER" : {   
                data[bin.name] = key;            
                break;
            }   
            case "STRING"  : {   
                data[bin.name] =  STRING_DATA;
                while ( data[bin.name].length < bin.size ) {   
                    data[bin.name] += STRING_DATA;
                }   
                data[bin.name] += key;
                break;
            }   
            case "BYTES" : {
                var buf_data = STRING_DATA;
                while( buf_data.length < bin.size ) {
                    buf_data += STRING_DATA;
                }
                data[bin.name] = new Buffer(buf_data);
                break;
            }   
            default :
                data.num = key;
                break;
        }
        i++;
    } while(i < binSpec.length);  
    return data;
}

function get(options, done) {
    var k = keygen(options.keyRange.min,options.keyRange.max);
    var time_start = process.hrtime()
    client.get( {ns: options.namespace, set: options.set, key: k}, function(_error, _record, _metadata, _key) {
        var time_end = process.hrtime();
        done(_error.code, time_start, time_end, READ);
    });
}

// set the ttl for the write
var metadata = {
    ttl: argv.ttl
};

function put(options, done) {

    var k = keygen(options.keyRange.min,options.keyRange.max);
    var record  = recordgen(k, options.binSpec)
    var time_start = process.hrtime();
    client.put({ns:options.namespace, set: options.set, key: k}, record, metadata, function(_error, _record, _metadata, _key) {
        var time_end = process.hrtime();
        done(_error.code, time_start, time_end, WRITE);
    });
}

// Structure to store per second statistics.
var interval_data = new Array(OP_TYPES);
reset_interval_data();

function run(options) {

    var expected = options.rops + options.wops;
    var completed = 0;

    // @ TO-DO optimization. 
    // Currently stats of all the operations is collected and sent to
    // master at the end of an iteration. 
    // Master puts the stats in appropriate histogram.
    // Consider having histogram for each worker Vs sending the 
    // results in an array - Which one is more memory efficient.
    var operations  = Array(expected);
    var read_ops    = options.rops;
    var write_ops   = options.wops;
   
    function done(op_status, op_time_start, op_time_end, op_type) {

        operations[completed] = [op_status, op_time_start, op_time_end];
        interval_data[op_type][TPS]++;
        if(op_status === status.AEROSPIKE_ERR_TIMEOUT){
            interval_data[op_type][TIMEOUT]++;
        }
	    else if(op_status !== status.AEROSPIKE_OK && op_status !== status.AEROSPIKE_ERR_TIMEOUT){
            interval_data[op_type][ERROR]++;
        }

        completed++;

        if ( completed >= expected ) {
            process.send(['stats',operations]);
        }
    }

    while( write_ops > 0) {
        if( write_ops > 0) {
            write_ops--;
            put(options, done);
        }
    }
    while( read_ops > 0) {
        if( read_ops > 0) {
            read_ops--;
            get(options, done);
        };
    }
}

/*
 * Sends the populated interval_data to the parent and resets it for the next second
 */
function respond(){
    process.send(['trans',interval_data]);
    reset_interval_data();
}

/*
 * Reset interval_data 
 */
function reset_interval_data(){
    interval_data[READ] =  [0, 0, 0];  // [reads_performed, reads_timeout, reads_error]
    interval_data[WRITE] = [0, 0, 0];  // [writes_performed, writes_timeout, writes_error]   
    interval_data[QUERY] = [0, 0, 0];  // [QueryRecords, query_timeout, query_error]
}

/*
 * Execute the long running job.
 */ 

function executeJob(options, callback) {

    var job     = client.query(options.namespace, options.set, options.statement);
    var stream  = job.execute();
    stream.on('data', function(record) {
       // count the records returned 
       interval_data[QUERY][TPS]++;
    });
    stream.on('error', function(error) {
        interval_data[QUERY][ERROR]++;
        if(error.code == status.AEROSPIKE_ERR_TIMEOUT){
            interval_data[QUERY][TIMEOUT]++;
        }
    });
    stream.on('end', function(){
        // update a stat for number of jobs completed.
        callback(options);

    });
}

var runLongRunningJob = function(options) {
    executeJob(options, runLongRunningJob);
}

/***********************************************************************
 *
 * Event Listeners
 *
 ***********************************************************************/

/**
 * Listen for exit signal from parent. Hopefully we can do a clean 
 * shutdown and emit results.
 */
process.on('exit', function() {
    logger.debug('Exiting.');
});

process.on('SIGINT', function() {
    logger.debug('Received SIGINT.');
    process.exit(0);
});

process.on('SIGTERM', function() {
    logger.debug('Received SIGTERM.');
    process.exit(0);
});

/**
 * Listen for messages from the parent. This is useful, if the parent
 * wants to run the child for a duration of time, rather than a
 * number of operations.
 *
 *  KEY         := STRING | INTEGER
 *  PUT         := '[' "put" ',' KEY ',' RECORD ']'
 *  GET         := '[' "get" ',' KEY ']'
 *  OPERATION   := GET | PUT
 *  OPERATIONS  := '[' OPERATION+ ']'
 *  COMMAND     := "run" ',' OPERATIONS
 *
 *  MESSAGE     := '[' COMMAND ']'
 */
process.on('message', function(msg) {
    logger.debug('command: ', util.inspect(msg[0]));
    switch( msg[0] ) {
        case 'run'   : return run(msg[1]); break;
        case 'query' : return runLongRunningJob(msg[1]);
        case 'trans' : return respond(); break;	 // Listening on trans event. (this event occurs every second) 
        default: return process.exit(0);
    }
});

// log the memory footprint of the process every 10 minutes.
setTimeout(function(){
    //write the memory usage to a file
    var mem = process.memoryUsage();
    fs.writeFile("longevityMemory", JSON.stringify(mem), function(err) {
        if(err) {
            console.log(err);
        }
    })
}, 600000);
