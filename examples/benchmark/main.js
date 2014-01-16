/***********************************************************************
 *
 * node -O 10000 -P 4 -R 0.5
 *
 ***********************************************************************/

var aerospike = require('aerospike');
var cluster = require('cluster');
var optimist = require('optimist');
var os = require('os');
var path = require('path');
var util = require('util');
var winston = require('winston');
var stats = require('./stats');

/***********************************************************************
 *
 * Globals
 *
 ***********************************************************************/

var cpus = os.cpus();
var online = 0;
var exited = 0;

var iterations_results = [];

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
            describe: "Log level [0-5]."
        },
        namespace: {
            alias: "n",
            default: "test",
            describe: "Key namespace."
        },
        set: {
            alias: "s",
            default: "demo",
            describe: "Key set."
        },
        json: {
            alias: "j",
            default: false,
            describe: "Display report in JSON format."
        },
        silent: {
            default: false,
            describe: "Suppress intermediate output from workers."
        },
        operations: {
            alias: "O",
            default: 100,
            describe: "Total number of operations to perform per iteration per process."
        },
        iterations: {
            alias: "I",
            default: 1,
            describe: "Total number of iterations to perform per process."
        },
        processes: {
            alias: "P",
            default: cpus.length,
            describe: "Total number of child processes."
        },
        time: {
            alias: "T",
            default: 6000, // Default 10 min
            describe: "Total amount of time to run the benchmark."
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
            default: 1000,
            describe: "The number of keys to use."
        }
    });

var argv = argp.argv;

if ( argv.help === true) {

    argp.showHelp()
    return;
}

if ( !cluster.isMaster ) {
    console.error('main.js must not run as a child process.');
    return;
}
    
var FOPS = (argv.operations / (argv.reads + argv.writes));
var ROPS = FOPS * argv.reads;
var WOPS = FOPS * argv.writes;

if ( (ROPS + WOPS) < argv.operations ) {
    DOPS = argv.operations - (ROPS + WOPS);
    ROPS += DOPS;
}

/***********************************************************************
 *
 * Logging
 *
 ***********************************************************************/

function logger_timestamp() {
    var hrtime = process.hrtime()
    return util.format('[master: %d] [%s]', process.pid, hrtime);
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
 * Functions
 *
 ***********************************************************************/

function finalize() {
    stats.report_final(iterations_results, argv, console.log);
}

function worker_spawn() {
    var worker = cluster.fork();
    worker.iteration = 0;
    worker.on('message', worker_results(worker));
}

function worker_exit(worker) {
    worker.send(['end']);
}

function exit_all_process(){
    Object.keys(cluster.workers).forEach(function(id) {
        worker_exit( cluster.workers[id]);
    });
}
/**
 * key are in range [1 ... argv.keyrange]
 */
function keygen() {
    var rand = Math.floor(Math.random() * 0x100000000) % argv.keyrange + 1;
    return rand < 1 ? 1 : rand;
}

function putgen(commands) {
    var key = keygen();
    commands.push(['put', key, {k: key}]);
}

function getgen(commands) {
    var key = keygen();
    commands.push(['get', key]);
}

function opgen(ops, commands) {

    var rand = Math.floor(Math.random() * 0x100000000) % 2;

    if ( ops[rand][0] >= 0 ) {
        ops[rand][1](commands);
        ops[rand][0]--;
    }
}

function worker_run(worker) {

    var commands = [];

    var ops = [
        [ROPS, getgen],
        [WOPS, putgen]
    ];

    worker.iteration++;

    for (; commands.length < argv.operations;) {
        opgen(ops, commands);
    }

    worker.send(['run', commands]);
}

function worker_results_iteration(worker, iteration_stats) {

    var result = {
        worker: worker.id,
        pid: worker.process.pid,
        iteration: worker.iteration,
        stats: iteration_stats
    };

    iterations_results.push(result);

    if ( !argv.silent ) {
        stats.report_iteration(result, argv, logger.info);
    }

    if (process.uptime() < argv.time ) {
        worker_run(worker);
    }
    else if ( worker.iteration >= argv.iterations ) {
        worker_exit(worker);
    }
    else {
        worker_run(worker);
    }
}

function worker_results(worker) {
    return function(message) {
        worker_results_iteration(worker, message);
    }
}

/***********************************************************************
 *
 * Event Listeners
 *
 ***********************************************************************/


process.on('exit', function() {
    logger.debug('Exiting.');
});

process.on('SIGINT', function() {
    logger.debug('Recevied SIGINT.');
});

process.on('SIGTERM', function() {
    logger.debug('Received SIGTERM.');
});

cluster.on('online', function(worker) {
    online++;
    worker_run(worker);
});

cluster.on('disconnect', function(worker, code, signal) {
    logger.debug("[worker: %d] Disconnected.", worker.process.pid, code);
});

cluster.on('exit', function(worker, code, signal) {
    if ( code !== 0 ) {
        // non-ok status code
        logger.error("[worker: %d] Exited: %d", worker.process.pid, code);
        process.exit(1);
    }
    else {
        logger.debug("[worker: %d] Exited: %d", worker.process.pid, code);
        exited++;
    }
    if ( exited == online ) {
        finalize();
    }
});
/***********************************************************************
 *
 * Setup Workers
 *
 ***********************************************************************/

cluster.setupMaster({
    exec : "worker.js",
    silent : false
});

// Register a timeout process -- so that process exits after the 
// given amount of time (in seconds).

var timerId = setTimeout(function(){
    exit_all_process(cluster);
 }, argv.time*1000);


for ( p = 0; p < argv.processes; p++ ) {
    worker_spawn();
}
