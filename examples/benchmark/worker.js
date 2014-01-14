/***********************************************************************
 *
 * Benchmark Worker, run operations and report results.
 *
 ***********************************************************************/

var aerospike = require('aerospike');
var cluster = require('cluster');
var optimist = require('optimist');
var path = require('path');
var util = require('util');
var winston = require('winston');

var status = aerospike.Status;

/***********************************************************************
 *
 * Options Parsing
 *
 ***********************************************************************/

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

/***********************************************************************
 *
 * Logging
 *
 ***********************************************************************/

// var _logger_prefix = util.format('[%s] %d', path.basename(module.filename), process.pid);

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

var client = aerospike.client({
    hosts: [
        { addr: argv.host, port: argv.port }
    ],
    policies: {
        timeout: argv.timeout
    }
});

client.connect(function(err) {
    if (err.code != status.AEROSPIKE_OK) {
        logger.error("Aerospike server connection error: ", err);
        process.exit(1);
    }
});

/***********************************************************************
 *
 * Operations
 *
 ***********************************************************************/

function duration(start, end) {
    var s = (end[0] - start[0]) * 1000000000;
    var ns = s + end[1] - start[1];
    var ms = ns / 1000000;
    return ms;
}

function get(command, done) {
    client.get({ns: argv.namespace, set: argv.set, key: command[1]}, function(_error, _record, _metadata, _key) {
        command.status = _error.code;
        done(command);
    });
}

function put(command, done) {
    client.put({ns: argv.namespace, set: argv.set, key: command[1]}, command[2], function(_error, _record, _metadata, _key) {
        command.status = _error.code;
        done(command);
    });
}

function run(commands) {

    var expected = commands.length;
    var completed = 0;
    var start = process.hrtime();

    function done(command) {

        completed++;

        if ( completed >= expected ) {
            var end = process.hrtime();
            process.send([commands.length, start, end, duration(start, end)]);
        }
    }

    commands.forEach(function(command) {
        switch(command[0]) {
            case 'get': return get(command, done);
            case 'put': return put(command, done);
        }
    });
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
        default: return process.exit(0);
    }
});
