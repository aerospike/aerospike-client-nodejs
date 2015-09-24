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

OPERATION_STATUS            = 0;
OPERATION_TIME_START        = 1;
OPERATION_TIME_END          = 2;
OPERATION_NFIELDS           = 3;  // the number of fields (should always be last/largest value)

WORKER_ID                   = 0;
WORKER_PID                  = 1;
WORKER_MEMORY               = 2;
WORKER_NFIELDS              = 3;


// histograms 
// 1. For status code of each operation.
// 2. Latency histogram.
var hist = {};
var time_hist = {
        '<= 1': 0,
        '> 1':  0,
        '> 2':  0,
        '> 4':  0,
        '> 8':  0,
        '> 16': 0,
        '> 32': 0
    };

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

function parse_time_to_secs(time){
    if ( time !== undefined ) {
        var time_match = time.toString().match(/(\d+)([smh])?/);
        if ( time_match !== null ) {
            if ( time_match[2] !== null ) {
                time = parseInt(time_match[1],10);
                var time_unit = time_match[2];
                switch( time_unit ) {
                    case 'm':										
                        time = time * 60;	
                    break;
                    case 'h':
                        time = time * 60 * 60;  
                    break;
                }
            }
        }
    }
    return time;
}


function time_histogram(operations) {

    
    operations.map(function(op) {
        return duration(op[OPERATION_TIME_START],op[OPERATION_TIME_END]);
    }).forEach(function(dur){
        var d = Math.floor(dur);
        if ( d > 32 ) {
            time_hist['> 32']++;
        }
        if ( d > 16 ) {
            time_hist['> 16']++;
        }
        else if ( d > 8 ) {
            time_hist['> 8']++
        }
        else if ( d > 4 ) {
            time_hist['> 4']++
        }
        else if ( d > 2 ) {
            time_hist['> 2']++;
        }
        else if ( d > 1 ) {
            time_hist['> 1']++;
        }
        else {
            time_hist['<= 1']++;
        }
    });

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

    operations.map(function(op) {
        return op[OPERATION_STATUS];
    }).forEach(function(status){
        hist[status] = (hist[status] || 0) + 1;
    });

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

function iteration(operations) {
   status_histogram(operations);
   time_histogram(operations);
}

function report_final(argv, print) {
        if ( !argv.json ) {

            var configTable = new Table({
                chars: TABLE_CHARS,
                style: TABLE_STYLE
            });

            configTable.push({'operations': argv.operations})
            configTable.push({'iterations': argv.iterations === undefined ? 'undefined' : argv.iterations});
            configTable.push({'processes': argv.processes});
            configTable.push({'time': argv.time === undefined ? 'undefined' : time_units(argv.time)});
            
            print();
            print("SUMMARY");
            print();
            print("  Configuration");
            print_table(configTable, print);
            print();
            print("  Durations");
            print_histogram(time_hist, print);
            print();
            print("  Status Codes");
            print_histogram(hist, print);
            print();
        }
        else {
            var output = {
                configuration: {
                    operations: argv.operations,
                    iterations: argv.iterations,
                    processes: argv.processes
                },
                durations: time_hist,
                status_codes: hist
            };
            console.log("%j",output);
        }

        return 0;
}

module.exports = {
    iteration: iteration,
    print_histogram: print_histogram,
    report_final: report_final,
    parse_time_to_secs: parse_time_to_secs
}
