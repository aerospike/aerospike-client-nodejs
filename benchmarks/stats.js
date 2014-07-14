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


var util = require('util');
var Table = require('cli-table');
var colors = require('colors');

ITERATION_OPERATIONS        = 0;
ITERATION_TIME_START        = 1;
ITERATION_TIME_END          = 2;
ITERATION_TIME_DURATION     = 3;
ITERATION_TIME_MIN          = 4;
ITERATION_TIME_MAX          = 5;
ITERATION_TIME_MEAN         = 6;
ITERATION_TIME_HIST         = 7;
ITERATION_MEMORY_START      = 8;
ITERATION_MEMORY_END        = 9;
ITERATION_STATUS_HIST       = 10;
ITERATION_NFIELDS           = 11; // the number of fields (should always be last/largest value)

OPERATION_STATUS            = 0;
OPERATION_TIME_START        = 1;
OPERATION_TIME_END          = 2;
OPERATION_NFIELDS           = 3;  // the number of fields (should always be last/largest value)

WORKER_ID                   = 0;
WORKER_PID                  = 1;
WORKER_MEMORY               = 2;
WORKER_NFIELDS              = 3;


TABLE_CHARS = {
    'top': '',
    'top-mid': '',
    'top-left': '',
    'top-right': '',
    'bottom': '',
    'bottom-mid': '',
    'bottom-left': '',
    'bottom-right': '',
    'left': '' ,
    'left-mid': '' ,
    'mid': '' ,
    'mid-mid': '',
    'right': '',
    'right-mid': '',
    'middle': ''
};

TABLE_STYLE = {
    'padding-left': 4,
    'padding-right': 0,
    'head': ['blue'],
    'border': ['grey'],
    'compact': true
};

function sum(l,r) {
    return l+r;
}

function min(l,r) {
    return l < r ? l : r;
}

function max(l,r) {
    return l > r ? l : r;
}

function equals(stat,value) {
    return function(it) {
        return it.stats[stat] === value;
    };
}

function select(stat) {
    return function(it) {
        return it.stats[stat];
    };
}

function duration(start, end) {
    var s = (end[0] - start[0]) * 1000000000;
    var ns = s + end[1] - start[1];
    var ms = ns / 1000000;
    return ms;
}


function time_histogram(operations) {

    var hist = {
        '<= 1': 0,
        '> 1':  0,
        '> 2':  0,
        '> 4':  0,
        '> 8':  0,
        '> 16': 0,
        '> 32': 0
    };

    operations.map(function(op) {
        return duration(op[OPERATION_TIME_START],op[OPERATION_TIME_END]);
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
            hist['<= 1']++;
        }
    });

    return hist;
}

function number_format(v, precision) {
    return v.toFixed(precision ? precision : 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function byte_units(v) {
    var u = 'B';
    if ( Math.abs(v) >= 1024 ) {
        v = v / 1024;
        u = 'kB';
    }
    if ( Math.abs(v) >= 1024 ) {
        v = v / 1024;
        u = 'MB';
    }
    if ( Math.abs(v) >= 1024 ) {
        v = v / 1024;
        u = 'GB';
    }
    if ( Math.abs(v) >= 1024 ) {
        v = v / 1024;
        u = 'TB';
    }
    if ( Math.abs(v) >= 1024 ) {
        v = v / 1024;
        u = 'PB';
    }
    return number_format(v,2) + ' ' + u;
}

function time_units(v) {
    var u = v === 1 ? 'second' : 'seconds';

    if ( Math.abs(v) >= 60 ) {
        v = v / 60;
        u = v === 1 ? 'minute' : 'minutes';
    }

    if ( Math.abs(v) >= 60 ) {
        v = v / 60;
        u = v === 1 ? 'hour' : 'hours';
    }

    return number_format(v,2) + ' ' + u;
}

function status_histogram(operations) {
    var hist = {};

    operations.map(function(op) {
        return op[OPERATION_STATUS];
    }).forEach(function(status){
        hist[status] = (hist[status] || 0) + 1;
    });

    return hist;
}

function chart_iteration_memory(i, worker, iteration, bar, max_memory_mb, buckets, print, prefix) {

    if ( ! iteration ) {
        return;
    }

    if ( iteration.worker !== worker) {
        return;
    }

    var mem_end = iteration.stats[ITERATION_MEMORY_END];
    var mem_used = mem_end.heapUsed; // B
    var mem_used_mb = mem_used / 1024 / 1024; // MB
    var mem_used_pct = mem_used_mb / max_memory_mb * buckets; // MB
    var mem_used_bar = Math.floor(mem_used_pct);
    var mem_used_units = byte_units(mem_used);

    bar.fill(' ');
    if ( mem_used_bar > 0 ) {
        bar.fill(']', 0, mem_used_bar);
    }

    print('%s%d%s | %s%s |%s',
        prefix || '',
        i, Array(10 - i.toString().length).join(' '),
        mem_used_units, Array(10 - mem_used_units.length).join(' '),
        bar.toString().blue);
}

function chart_iterations_memory(iterations, buckets, print, prefix) {

    var i;
    var max_memory;
    var max_memory_mb;
    var bar;
    var worker = 1;

    max_memory = iterations.filter(function(i) {
        return i.worker == worker;
    }).map(function(i){ return i.stats[ITERATION_MEMORY_END].heapUsed}).reduce(max);
    
    max_memory_mb = max_memory / 1024 / 1024;

    bar = new Buffer(buckets+1);
    for ( i = 0; i < iterations.length; i++) {
        chart_iteration_memory(i, worker, iterations[i], bar, max_memory_mb, buckets, print, prefix);
    }
}

function merge_histogram(h1, h2) {
    var hist = {};
    var k;
    for ( k in h1 ) {
        hist[k] = (hist[k] || 0) + h1[k];
    }
    for ( k in h2 ) {
        hist[k] = (hist[k] || 0) + h2[k];
    }
    return hist;
}

function print_table(table, print, prefix) {
    table.toString().split("\n").forEach(function(l) {
        if ( l.length > 0 ) {
            print((prefix || '') + l);
        }
    })
}

function print_histogram(histogram, print, prefix) {

    var total = Object.keys(histogram).map(function(k){
        return histogram[k];
    }).reduce(sum);

    var thead = [];
    var tbody = [];

    for( var k in histogram ) {
        thead.push(k);
        tbody.push(number_format(histogram[k] / total * 100, 1) + "%");
    }

    var table = new Table({
        head: thead,
        chars: TABLE_CHARS,
        style: TABLE_STYLE
    });

    table.push(tbody);

    print_table(table, print, prefix);
}

function iteration(operations, time_start, time_end, mem_start, mem_end) {

    var durations = operations.map(function(op) {
        return duration(op[OPERATION_TIME_START], op[OPERATION_TIME_END]);
    });

    var time_count = durations.length;
    var time_sum = durations.reduce(sum);
    var time_min = durations.reduce(min);
    var time_max = durations.reduce(max);
    var time_mean = time_sum / time_count;
    var time_duration = duration(time_start, time_end);

    var result = Array(ITERATION_NFIELDS);
    
    result[ITERATION_OPERATIONS] = operations.length;
    result[ITERATION_MEMORY_START] = mem_start;
    result[ITERATION_MEMORY_END] = mem_end;
    result[ITERATION_TIME_START] = time_start;
    result[ITERATION_TIME_END] = time_end;
    result[ITERATION_TIME_DURATION] = time_duration;
    result[ITERATION_TIME_MIN] = time_min;
    result[ITERATION_TIME_MAX] = time_max;
    result[ITERATION_TIME_MEAN] = time_mean;
    result[ITERATION_TIME_HIST] = time_histogram(operations);
    result[ITERATION_STATUS_HIST] = status_histogram(operations);

    return result;
}

function report_iteration(result, argv, print) {

    print('[worker: %d] [iteration: %d] [operations: %d] [time: %s ms]',
        result.worker,
        result.iteration,
        result.stats[ITERATION_OPERATIONS],
        number_format(result.stats[ITERATION_TIME_DURATION],2)
    );

    var m_start_rss = result.stats[ITERATION_MEMORY_START].rss;
    var m_start_used = result.stats[ITERATION_MEMORY_START].heapUsed;
    var m_start_total = result.stats[ITERATION_MEMORY_START].heapTotal;

    var m_end_rss = result.stats[ITERATION_MEMORY_END].rss;
    var m_end_used = result.stats[ITERATION_MEMORY_END].heapUsed;
    var m_end_total = result.stats[ITERATION_MEMORY_END].heapTotal;

    var m_diff_rss = m_end_rss - m_start_rss;
    var m_diff_used = m_end_used - m_start_used;
    var m_diff_total = m_end_total - m_start_total;

    var m_diff_pct_rss   = number_format(m_diff_rss / m_start_rss * 100, 1);
    var m_diff_pct_used  = number_format(m_diff_used / m_start_used * 100, 1);
    var m_diff_pct_total = number_format(m_diff_total / m_start_total * 100, 1);

    var memTable = new Table({
        head: ['---', 'rss', 'heap used', 'heap total'],
        chars: TABLE_CHARS,
        style: TABLE_STYLE
    });

    memTable.push({ "start": [
        byte_units(m_start_rss),
        byte_units(m_start_used),
        byte_units(m_start_total)
    ]});

    memTable.push({ "end": [
        byte_units(m_end_rss),
        byte_units(m_end_used),
        byte_units(m_end_total)
    ]});

    memTable.push({ "diff": [
        byte_units(m_diff_rss) + ' (' + m_diff_pct_rss + '%)',
        byte_units(m_diff_used) + ' (' + m_diff_pct_used + '%)',
        byte_units(m_diff_total) + ' (' + m_diff_pct_total + '%)'
    ]});

    print('[worker: %d] [iteration: %d]   MEMORY', result.worker, result.iteration);
    print_table(memTable, function(line) {
        print('[worker: %d] [iteration: %d] %s', result.worker, result.iteration, line);
    });


    print('[worker: %d] [iteration: %d]   DURATIONS', result.worker, result.iteration);
    print_histogram(result.stats[ITERATION_TIME_HIST], function(line) {
        print('[worker: %d] [iteration: %d] %s', result.worker, result.iteration, line);
    });

    print('[worker: %d] [iteration: %d]   STATUS CODES', result.worker, result.iteration);
    print_histogram(result.stats[ITERATION_STATUS_HIST], function(line) {
        print('[worker: %d] [iteration: %d] %s', result.worker, result.iteration, line);
    });

    return 0;
}

 function report_final(iterations, argv, print) {

    var opcountfilter = equals(ITERATION_OPERATIONS, argv.operations);
    var itcount = 0;
    var t_min = 0;
    var t_max = 0;
    var t_sum = 0;
    var t_mean = 0;
    var t_hist = {};
    var s_hist = {};
    var op_count = 0;

    if ( iterations.length > 0 ) {

        itcount = iterations.filter(opcountfilter).length;

        t_min = iterations
            .filter(opcountfilter)
            .map(select(ITERATION_TIME_MIN))
            .reduce(min);

        t_max = iterations
            .filter(opcountfilter)
            .map(select(ITERATION_TIME_MAX))
            .reduce(max,0);

        t_count = iterations
            .filter(opcountfilter)
            .map(select(ITERATION_OPERATIONS))
            .reduce(sum,0);

        t_sum = iterations
            .filter(opcountfilter).map(function(it) {
                return it.stats[ITERATION_TIME_MEAN];
            })
            .reduce(sum,0);

        t_mean = t_sum / itcount;

        t_hist = iterations
            .map(function(it){
                return it.stats[ITERATION_TIME_HIST];
            })
            .reduce(merge_histogram,{});

        s_hist = iterations
            .map(function(it){
                return it.stats[ITERATION_STATUS_HIST];
            })
            .reduce(merge_histogram,{});

        op_count = iterations.map(select(ITERATION_OPERATIONS)).reduce(sum);

        if ( !argv.json ) {

            var configTable = new Table({
                chars: TABLE_CHARS,
                style: TABLE_STYLE
            });

            configTable.push({'operations': argv.operations})
            configTable.push({'iterations': argv.iterations === undefined ? 'undefined' : argv.iterations});
            configTable.push({'processes': argv.processes});
            configTable.push({'time': argv.time === undefined ? 'undefined' : time_units(argv.time)});

            var txnTable = new Table({
                head: ['---', 'mean', 'min', 'max'],
                chars: TABLE_CHARS,
                style: TABLE_STYLE
            });

            txnTable.push({ "duration": [
                number_format(t_mean, 2) + ' ms',
                number_format(t_min, 2) + ' ms',
                number_format(t_max, 2) + ' ms'
            ]});

            txnTable.push({ "tps/process": [
                number_format(Math.round(argv.operations / t_mean * 1000)),
                number_format(Math.round(argv.operations / t_max * 1000)),
                number_format(Math.round(argv.operations / t_min * 1000))
            ]});

            if ( argv['chart-memory'] === true ) {
                print();
                print("MEMORY USED");
                print();
                chart_iterations_memory(iterations, 50, print, '  ');
                print();
            }

            print();
            print("SUMMARY");
            print();
            print("  Configuration");
            print_table(configTable, print);
            print();
            print("  Transactions");
            print_table(txnTable, print);
            print();
            print("  Durations");
            print_histogram(t_hist, print);
            print();
            print("  Status Codes");
            print_histogram(s_hist, print);
            print();
        }
        else {
            var output = {
                configuration: {
                    operations: argv.operations,
                    iterations: argv.iterations,
                    processes: argv.processes
                },
                operations: op_count,
                times: {
                    mean: t_mean,
                    min: t_min,
                    max: t_max
                },
                tps: {
                    mean: Math.round(argv.operations / t_mean * 1000),
                    min: Math.round(argv.operations / t_max * 1000),
                    max: Math.round(argv.operations / t_min * 1000)
                },
                durations: t_hist,
                status_codes: s_hist
            };
            console.log("%j",output);
        }

        return 0;
    }
    else {
        console.error('error: no data avaialble');
        return 1;
    }
}

module.exports = {
    iteration: iteration,
    chart_iteration_memory: chart_iteration_memory,
    print_histogram: print_histogram,
    report_iteration: report_iteration,
    report_final: report_final,
}
