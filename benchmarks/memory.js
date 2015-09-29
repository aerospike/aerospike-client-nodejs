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


var Table = require('cli-table');
var yargs = require('yargs');

var MEM_MATCH = /(\d+(\.\d+)?) MB/


var TABLE_CHARS = {
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

var TABLE_STYLE = {
    'padding-left': 4,
    'padding-right': 0,
    'head': ['blue'],
    'border': ['grey'],
    'compact': true
};

var RANGE_COUNT = 0;
var ITERATION_COUNT = 0;


var mem_cnt = 0;
var mem_min;
var mem_max;
var mem_ranges = [];


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
        factor: {
            alias: "f",
            default: 1,
            describe: "Factor to filter by."
        },
        start: {
            alias: "s",
            default: undefined,
            describe: "Start GC range."
        },
        end: {
            alias: "e",
            default: undefined,
            describe: "End GC range."
        }
    });

var argv = argp.argv;

if ( argv.help === true) {
    argp.showHelp()
    return;
}

/***********************************************************************
 *
 * Functions
 *
 ***********************************************************************/

var MEM_MAX_MB = 100;
var MEM_BUCKETS = 100;

function memory_bar(min_used_mb, max_used_mb) {

    var min_used_len = Math.floor(min_used_mb / MEM_MAX_MB * MEM_BUCKETS);
    var min_used_bar = new Buffer(min_used_len);
    if ( min_used_len > 0 ) {
        min_used_bar.fill(']');
    }

    var max_used_len = Math.floor(max_used_mb / MEM_MAX_MB * MEM_BUCKETS);
    var max_used_bar = new Buffer(max_used_len - min_used_len);
    if ( max_used_len > 0 ) {
        max_used_bar.fill(']');
    }

    return min_used_bar.toString().blue  + max_used_bar.toString().red;
}

function report() {

    var minhist = {};
    var maxhist = {};
    var stephist = {};

    var rtable = new Table({
        head: ['min', 'min diff', 'max', 'max diff', 'steps', 'size'],
        chars: TABLE_CHARS,
        style: TABLE_STYLE
    });

    var l;

    var unfiltered = mem_ranges;

    var filtered = unfiltered.filter(function(r,i) {
        if ( argv.factor && i % argv.factor !== 0 ) {
            return false;
        }
        if ( argv.start && i < argv.start ) {
            return false;
        }
        if ( argv.end && i > argv.end ) {
            return false;
        }
        return true;
    });

    filtered.forEach(function(r, i) {

        var minceil = Math.ceil(r[0]);
        minhist[minceil] = (minhist[minceil]||0) + 1;

        var maxceil = Math.ceil(r[1])
        maxhist[maxceil] = (maxhist[maxceil]||0) + 1;

        var step = Math.ceil(r[2])
        stephist[step] = (stephist[step]||0) + 1;

        if ( l ) {
            rtable.push([
                r[0],
                (r[0]-l[0]).toFixed(3),
                r[1],
                (r[1]-l[1]).toFixed(3),
                r[2],
                (r[1]-r[0]).toFixed(3),
                memory_bar(r[0],r[1])
            ]);
        }
        else {
            rtable.push([
                r[0],
                0.00,
                r[1],
                0.00,
                r[2],
                (r[1]-r[0]).toFixed(3),
                memory_bar(r[0],r[1])
            ]);
        }
        l = r;
    });

    var k;

    var minhead = [];
    var minbody = [];
    for ( k in minhist ) {
        minhead.push('<'+k)
        minbody.push(minhist[k])
    }
    var mintable = new Table({
        head: minhead,
        chars: TABLE_CHARS,
        style: TABLE_STYLE
    });
    mintable.push(minbody);


    var maxhead = [];
    var maxbody = [];
    for ( k in maxhist ) {
        maxhead.push('<'+k)
        maxbody.push(maxhist[k])
    }
    var maxtable = new Table({
        head: maxhead,
        chars: TABLE_CHARS,
        style: TABLE_STYLE
    });
    maxtable.push(maxbody);

    var stephead = [];
    var stepbody = [];
    for ( k in stephist ) {
        stephead.push(k)
        stepbody.push(stephist[k])
    }
    var steptable = new Table({
        head: stephead,
        chars: TABLE_CHARS,
        style: TABLE_STYLE
    });
    steptable.push(stepbody);


    /**************************************************************************/

    console.log();
    console.log('Heap Usage (MB)'.grey);
    rtable.toString().split("\n").forEach(function(l) {
        if ( l.length > 0 ) {
            console.log(l);
        }
    });

    console.log();
    console.log('Heap Used Lower Bound (MB)'.grey);
    mintable.toString().split("\n").forEach(function(l) {
        if ( l.length > 0 ) {
            console.log(l);
        }
    });

    console.log();
    console.log('Heap Used Upper Bound (MB)'.grey);
    maxtable.toString().split("\n").forEach(function(l) {
        if ( l.length > 0 ) {
            console.log(l);
        }
    });

    console.log();
    console.log('Iterations / GC'.grey);
    steptable.toString().split("\n").forEach(function(l) {
        if ( l.length > 0 ) {
            console.log(l);
        }
    });

    console.log();
    console.log('%s %d', 'Number of Iterations:'.grey, ITERATION_COUNT);
    console.log('%s %d', 'Number of GC executions (unfiltered):'.grey, unfiltered.length);
    console.log('%s %d', 'Number of GC executions (filtered):'.grey, filtered.length);

    console.log();
}

function readline(line) {

    if ( line.trim().length === 0 ) {
        return l;
    }

    var matches = line.match(MEM_MATCH);
    if ( ! matches || ! matches[1] ) {
        console.error('RegEx match failed on: |%s|', line, matches);
        process.exit(1);
    }

    var mem = parseFloat(matches[1]);

    if ( mem_min === undefined ) {
        mem_min = mem;
        mem_cnt = 0;
    }

    if ( mem_max === undefined ||  mem > mem_max ) {
        mem_max = mem;
        mem_cnt++;
    }
    else {
        // this is where the magic happens

        // we will filter based on a factor
        mem_ranges.push([mem_min, mem_max, mem_cnt]);

        // reset
        mem_min = mem;
        mem_max = mem;
        mem_cnt = 0;
        RANGE_COUNT++;
    }

    ITERATION_COUNT++;
}

/***********************************************************************
 *
 * Event Listeners
 *
 ***********************************************************************/

var last_line;

process.stdin.on('data', function(chunk) {

    var i = 0, j = 0;
    var line;

    for ( i=0, j=chunk.indexOf('\n', i); j != -1; i=j+1, j=chunk.indexOf('\n', i)) {
        if ( last_line ) {
            readline(last_line + chunk.slice(i,j));
            last_line = undefined;
        }
        else {
            readline(chunk.slice(i,j));
        }
    }

    if ( chunk.length > i ) {
        last_line = chunk.slice(i);
    }
});

process.stdin.on('end', function() {
    report();
});

/***********************************************************************
 *
 * Run
 *
 ***********************************************************************/


process.stdin.resume();
process.stdin.setEncoding('utf8');

