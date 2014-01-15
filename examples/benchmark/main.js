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

/***********************************************************************
 *
 * Globals
 *
 ***********************************************************************/

var cpus = os.cpus();
var online = 0;
var exited = 0;

var iterations_results = [];

var WORKER_ITERATION_OPERATIONS     = 0;
var WORKER_ITERATION_TIME_START     = 1;
var WORKER_ITERATION_TIME_END       = 2;
var WORKER_ITERATION_MEMORY_START   = 3;
var WORKER_ITERATION_MEMORY_END     = 4;

var WORKER_OPERATION_COMMAND        = 0;
var WORKER_OPERATION_STATUS         = 1;
var WORKER_OPERATION_TIME_START     = 2;
var WORKER_OPERATION_TIME_END       = 3;

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

var _logger_prefix = util.format('[%s] %d', 'master', process.pid);

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

function duration(start, end) {
    var s = (end[0] - start[0]) * 1000000000;
    var ns = s + end[1] - start[1];
    var ms = ns / 1000000;
    return ms;
}

function finalize() {

    var hist = {
        '<= 0': 0,
        '> 1':  0,
        '> 2':  0,
        '> 4':  0,
        '> 8':  0,
        '> 16': 0,
        '> 32': 0
    };

    var it_durations = iterations_results.filter(function(it) {
        return it.stats.operations.length === argv.operations;
    }).map(function(it) {
        return it.stats.time.duration;
    });

    iterations_results.map(function(it) {
        return it.stats.operations.map(function(op) {
            return duration(op[WORKER_OPERATION_TIME_START],op[WORKER_OPERATION_TIME_END]);
        }).forEach(function(dur){
            var d = Math.floor(dur);
            if ( d > 32 ) {
                hist['> 32']++;
            }
            if ( d > 16 ) {
                hist['> 16']++;
            }
            else if ( d > 8 ) {
                hist['> 8']++
            }
            else if ( d > 4 ) {
                hist['> 4']++
            }
            else if ( d > 2 ) {
                hist['> 2']++;
            }
            else if ( d > 1 ) {
                hist['> 1']++;
            }
            else {
                hist['<= 0']++;
            }
        });
    });


    var op_count = iterations_results.reduce(function(n,it) {
        return n + it.stats.operations.length;
    }, 0);

    var hist_head = '';
    var hist_body = '';
    var hist_space = 5;
    for( var k in hist ) {
        var diff = hist_body.length - hist_head.length;
        var spacing = hist_space - diff;
        hist_head += Array(hist_space).join(' ') + k;
        hist_body += Array(spacing).join(' ') + (hist[k] / op_count * 100).toFixed(1) + '%';
    }


    function sum(l,r) {
        return l+r;
    }

    function min(l,r) {
        return l < r ? l : r;
    }

    function max(l,r) {
        return l > r ? l : r;
    }

    var t_count = it_durations.length;
    var t_sum = it_durations.reduce(sum);
    var t_min = it_durations.reduce(min);
    var t_max = it_durations.reduce(max);
    var t_mean = t_sum / t_count;

    console.log();
    console.log("SUMMARY");
    console.log();
    console.log("  Configuration:");
    console.log("    operations: %d", argv.operations);
    console.log("    iterations: %d", argv.iterations);
    console.log("    processes:  %d", argv.processes);
    console.log();
    console.log("  Iteration times:", argv.operations, argv.operations == 1 ? "operation" : "operations");
    console.log("    mean: %d ms", t_mean.toFixed(4) );
    console.log("    min:  %d ms", t_min.toFixed(4) );
    console.log("    max:  %d ms", t_max.toFixed(4) );
    console.log();
    console.log("  Transactions / Second / Process:");
    console.log("    mean: %d tps", Math.round(argv.operations / t_mean * 1000) );
    console.log("    min:  %d tps", Math.round(argv.operations / t_max * 1000) );
    console.log("    max:  %d tps", Math.round(argv.operations / t_min * 1000) );
    console.log();
    console.log("  Durations:");
    console.log(hist_head)
    console.log(hist_body)
    console.log()
}

function worker_spawn() {
    var worker = cluster.fork();
    worker.iteration = 0;
    worker.on('message', worker_results(worker));
}

function worker_exit(worker) {
    worker.send(['end']);
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

function worker_results_iteration(worker, stats) {

    var result = {
        worker: worker.id,
        pid: worker.process.pid,
        iteration: worker.iteration,
        stats: {
            operations: stats[WORKER_ITERATION_OPERATIONS],
            time: {
                start: stats[WORKER_ITERATION_TIME_START],
                end: stats[WORKER_ITERATION_TIME_END],
                duration: duration(stats[WORKER_ITERATION_TIME_START], stats[WORKER_ITERATION_TIME_END])
            },
            memory: {
                start: stats[WORKER_ITERATION_MEMORY_START],
                end: stats[WORKER_ITERATION_MEMORY_END],
            }
        }
    };

    iterations_results.push(result);

    var hist = {
        '<= 0': 0,
        '> 1':  0,
        '> 2':  0,
        '> 4':  0,
        '> 8':  0,
        '> 16': 0,
        '> 32': 0
    };

    result.stats.operations.map(function(op) {
        return duration(op[WORKER_OPERATION_TIME_START],op[WORKER_OPERATION_TIME_END]);
    }).forEach(function(dur){
        var d = Math.floor(dur);
        if ( d > 32 ) {
            hist['> 32']++;
        }
        if ( d > 16 ) {
            hist['> 16']++;
        }
        else if ( d > 8 ) {
            hist['> 8']++
        }
        else if ( d > 4 ) {
            hist['> 4']++
        }
        else if ( d > 2 ) {
            hist['> 2']++;
        }
        else if ( d > 1 ) {
            hist['> 1']++;
        }
        else {
            hist['<= 0']++;
        }
    });


    var op_count = result.stats.operations.length;

    var hist_head = '';
    var hist_body = '';
    var hist_space = 5;
    for( var k in hist ) {
        var diff = hist_body.length - hist_head.length;
        var spacing = hist_space - diff;
        hist_head += Array(hist_space).join(' ') + k;
        hist_body += Array(spacing).join(' ') + (hist[k] / op_count * 100).toFixed(1) + '%' ;
    }

    // result.stats.operations.forEach(function(op, i){
    //     logger.info('[worker: %d] - OPERATION [iteration: %d] [operation: %d] [time: %d ms] [status: %d]', result.worker, result.iteration, i, duration(op[WORKER_OPERATION_TIME_START],op[WORKER_OPERATION_TIME_END]), op[WORKER_OPERATION_STATUS]);
    // })

    logger.info('[worker: %d] [iteration: %d] [operations: %d] [time: %d ms] [memory: %s]', result.worker, result.iteration, result.stats.operations.length, result.stats.time.duration, util.inspect(result.stats.memory.end));
    logger.info('[worker: %d] [iteration: %d] DURATIONS', result.worker, result.iteration);
    logger.info('[worker: %d] [iteration: %d] %s', result.worker, result.iteration, hist_head);
    logger.info('[worker: %d] [iteration: %d] %s', result.worker, result.iteration, hist_body);

    if ( worker.iteration >= argv.iterations ) {
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
    logger.debug("[worker: %d] Exited: %d", worker.process.pid, code);
    exited++;
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

for ( p = 0; p < argv.processes; p++ ) {
    worker_spawn();
}
