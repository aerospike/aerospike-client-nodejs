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
var yargs = require('yargs');
var path = require('path');
var util = require('util');
var winston = require('winston');
var stats = require('./stats');
var status = aerospike.status;

/**********************************************************************
 *
 *  MACROS
 *
 *********************************************************************/

var OP_TYPES = 2; // READ and WRITE
var STATS = 3; // OPERATIONS, TIMEOUTS and ERRORS
var READ = 0;
var WRITE = 1;
var TPS = 0;
var TIMEOUT = 1; 
var ERROR = 2;

/***********************************************************************
 *
 * Options Parsing
 *
 ***********************************************************************/
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
        } 
    });

var argv = argp.argv;

if ( argv.help === true) {
    argp.showHelp()
    return;
}

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
            colorize: true,
            timestamp: logger_timestamp
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
}

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

function get(command, done) {
    var time_start = process.hrtime();

    client.get({ns: argv.namespace, set: argv.set, key: command[1]}, function(_error, _record, _metadata, _key) {
        var time_end = process.hrtime();
        done(_error.code, time_start, time_end, READ);
    });
}

// set the ttl for the write
var metadata = {
    ttl: argv.ttl
};

function put(command, done) {
    var time_start = process.hrtime();
    
    client.put({ns: argv.namespace, set: argv.set, key: command[1]}, command[2], metadata, function(_error, _record, _metadata, _key) {
        var time_end = process.hrtime();
        done(_error.code, time_start, time_end, WRITE);
    });
}



var interval_data = new Array(OP_TYPES);
reset_interval_data();

function run(commands) {

    var expected = commands.length;
    var completed = 0;

    var operations = Array(expected);
    var mem_start = process.memoryUsage();
    var time_start = process.hrtime();

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
            var time_end = process.hrtime();
            var mem_end = process.memoryUsage();
            process.send(['stats',stats.iteration(
                operations,
                time_start,
                time_end,
                mem_start,
                mem_end
            )]);
        }
    }

    commands.forEach(function(command) {
        switch(command[0]) {
            case 'get': return get(command, done);
            case 'put': return put(command, done);
        }
    });
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
    interval_data[READ] = [0, 0, 0];  // [reads_performed, reads_timeout, reads_error]
    interval_data[WRITE] = [0, 0, 0]; // [writes_performed, writes_timeout, writes_error]   
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
        case 'run': return run(msg[1]);
        case 'trans': respond(); break;	 // Listening on trans event. (this event occurs every second) 
        default: return process.exit(0);
    }
});
