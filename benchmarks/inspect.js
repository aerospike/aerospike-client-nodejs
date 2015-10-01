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
 * node inspect.js -h
 *
 ***********************************************************************/

var spawn = require('child_process').spawn;

var cluster = require('cluster');
var yargs = require('yargs');
var os = require('os');
var path = require('path');
var util = require('util');
var winston = require('winston');
var stats = require('./stats');


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

/***********************************************************************
 *
 * Globals
 *
 ***********************************************************************/

var cpus = os.cpus();

var P_MIN = 1, P_MAX = cpus.length, P_STEP = 1;
var I_MIN = 1, I_MAX = 1, I_STEP = 1;
var O_MIN = 1, O_MAX = 100, O_STEP = 8;

/***********************************************************************
 *
 * Functions
 *
 ***********************************************************************/

var results = [];
var errors = [];

function report_step(p, i, o, code, stdout, stderr) {

    console.log('processes: %d, iterations: %d, operations: %d, status: %d', p, i, o, code);

    console.log();

    var result;

    if ( code === 0 ) {

        result = JSON.parse(stdout);

        console.log('    tps (per process):');
        console.log('        min: %d, max: %d, mean: %d',
            result.tps.min,
            result.tps.max,
            result.tps.mean
            );

        console.log('    times (ms):');
        console.log('        min: %d, max: %d, mean: %d',
            result.times.min.toFixed(2),
            result.times.max.toFixed(2),
            result.times.mean.toFixed(2)
            );

        console.log('    duration:')
        stats.print_histogram(result.durations, console.log,'    ');

        console.log('    status codes:')
        stats.print_histogram(result.status_codes, console.log,'    ');

        results.push(result);
    }
    else {
        stderr.split("\n").forEach(function(l){
            console.log('    error: %s', l);
        });
        errors.push([p, i, o, code, stderr]);
    }

    console.log();

}

function report_final() {

    console.log();
    console.log("SUMMARY");
    console.log();

    var matched = results.filter(function(res) {
        var ops = res.operations;
        return (res.durations['<= 1'] / ops * 100).toFixed(0) >= 90 &&
            (res.durations['> 1'] / ops * 100).toFixed(0)  <= 10 &&
            (res.durations['> 2'] / ops * 100).toFixed(0)  <= 2 &&
            (res.durations['<= 1'] + res.durations['> 1'] + res.durations['> 2'] == ops);
    })

    matched.forEach(function(res) {
        console.log('  processes: %d, iterations: %d, operations: %d',
            res.configuration.processes,
            res.configuration.iterations,
            res.configuration.operations
            );
        console.log('      tps:  {min: %d, max: %d, avg: %d}',
            res.tps.min,
            res.tps.max,
            res.tps.mean
            );
        console.log('      time: {min: %d, max: %d, avg: %d}',
            res.times.min.toFixed(2),
            res.times.max.toFixed(2),
            res.times.mean.toFixed(2)
            );
        console.log('      duration:')
        stats.print_histogram(res.durations, console.log,'      ');
    });

    var group_ops = {};

    matched.forEach(function(res) {
        var ops = res.configuration.operations;
        var group = (group_ops[ops] || [])
        group.push(res);
        group_ops[ops] = group;
    })

    console.log();
    console.log();
    for ( var k in group_ops ) {
        var ops = group_ops[k];
        console.log("operations: %d", k);
        for(var o=0; o<ops.length; o++) {
            var op = ops[o];
            console.log('    p: %d, tps: {l: %d, u: %d, m: %d}, time: {l: %d, u: %d, m: %d}, dur: {0: %d, 1: %d, 2: %d}',
                op.configuration.processes,
                op.tps.min,
                op.tps.max,
                op.tps.mean,
                op.times.min.toFixed(2),
                op.times.max.toFixed(2),
                op.times.mean.toFixed(2),
                op.durations['<= 1'],
                op.durations['> 1'],
                op.durations['> 2']
            );
        }
    }
    console.log();


    var o_hist = {};

    matched.forEach(function(res) {
        var ops = res.configuration.operations;
        o_hist[ops] = (o_hist[ops] || 0) + 1;
    })

    console.log();
    console.log('Number of Concurrent Transactions:')
    stats.print_histogram(o_hist, console.log,'    ');

    console.log();

}

function exec(p, i, o) {

    var stdout = new Buffer("");
    var stderr = new Buffer("");

    var prog = 'node';

    var args = ['main.js',
        '-h', argv.host, '-p', argv.port, '-t', argv.timeout,
        '-n', argv.namespace, '-s', argv.set,
        '-R', argv.reads, '-W', argv.writes, '-K', argv.keyrange,
        '-P', p, '-I', i, '-O', o,
        '--silent', '--json'
    ];

    var proc = spawn(prog, args);

    proc.stdout.on('data', function(data) {
        stdout = Buffer.concat([stdout,data])
    });

    proc.stderr.on('data', function(data) {
        stderr = Buffer.concat([stderr,data])
    });

    proc.on('close', function(code) {
        report_step(p, i, o, code, stdout.toString(), stderr.toString());
        step(p, i, o);
    });
}

function step(p, i, o) {
    o += O_STEP;

    if ( o > O_MAX ) {
        i += I_STEP;
        o = O_MIN;
    }

    if ( i > I_MAX ) {
        p += P_STEP;
        i = I_MIN;
        o = O_MIN;
    }

    if ( p > P_MAX ) {
        report_final();
        return;
    }

    return exec(p, i, o);
}

exec(P_MIN, I_MIN, O_MIN);
