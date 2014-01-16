
var util = require('util');

ITERATION_OPERATIONS      = 0;
ITERATION_TIME_START      = 1;
ITERATION_TIME_END        = 2;
ITERATION_TIME_DURATION   = 3;
ITERATION_TIME_MIN        = 4;
ITERATION_TIME_MAX        = 5;
ITERATION_TIME_MEAN       = 6;
ITERATION_TIME_HIST       = 7;
ITERATION_MEMORY_START    = 8;
ITERATION_MEMORY_END      = 9;
ITERATION_STATUS_HIST     = 10;
ITERATION_NFIELDS         = 11;
ITERATION_MEM_RSS         = 12;
ITERATION_MEM_HEAPUSED    = 13;
ITERATION_MEM_HEAPTOTAL   = 14;

OPERATION_STATUS          = 0;
OPERATION_TIME_START      = 1;
OPERATION_TIME_END        = 2;
OPERATION_NFIELDS         = 3;


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

function calculate_memory_stats(memory_usage) {
    var mem_stats = Object;
    var length = memory_usage.length;
    mem_stats.rss = 0;
    mem_stats.heapTotal = 0;
    memory_usage.map( function (item) {
        mem_stats.rss += item.rss;
        mem_stats.heapTotal += item.heapTotal;
    })
    mem_stats.rss = (mem_stats.rss) / length;
    mem_stats.heapTotal = (mem_stats.heapTotal) / length;
    return mem_stats;
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


function status_histogram(operations) {
    var hist = {};

    operations.map(function(op) {
        return op[OPERATION_STATUS];
    }).forEach(function(status){
        hist[status] = (hist[status] || 0) + 1;
    });

    return hist;
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

function print_histogram(histogram, out, prefix) {
    var hist_head = '';
    var hist_body = '';
    var hist_space = 5;

    var total = Object.keys(histogram).map(function(k){
        return histogram[k];
    }).reduce(sum);

    for( var k in histogram ) {
        var diff = hist_body.length - hist_head.length;
        var spacing = hist_space - diff;
        var buff =  spacing <= 1 ? 2 : 0;
        hist_head += Array(hist_space + buff).join(' ') + k;
        hist_body += Array(spacing + buff).join(' ') + (histogram[k] / total * 100).toFixed(1) + '%';
    }

    out((prefix || '') + hist_head);
    out((prefix || '') + hist_body);
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
    var rss_used = mem_end.rss - mem_start.rss;
    var heapUsed = mem_end.heapUsed - mem_start.heapUsed;
    var heapTotal = mem_end.heapTotal - mem_start.heapTotal;

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
    result[ITERATION_MEM_RSS]       = rss_used;
    result[ITERATION_MEM_HEAPUSED]  = heapUsed;
    result[ITERATION_MEM_HEAPTOTAL] = heapTotal;

    return result;
}

function report_iteration(result, argv, print) {

    print('[worker: %d] [iteration: %d] [operations: %d] [time: %d ms] [memory: %s]',
        result.worker,
        result.iteration,
        result.stats[ITERATION_OPERATIONS],
        result.stats[ITERATION_TIME_DURATION].toFixed(2),
        util.inspect(result.stats[ITERATION_MEMORY_END])
    );


    print('[worker: %d] [iteration: %d] MEMORY USAGE ', result.worker, result.iteration);
    print('[worker: %d] [iteration: %d] rss_used: %d, heap_used: %d, heap_total: %d',
        result.worker,
        result.iteration,
        result.stats[ITERATION_MEM_RSS],
        result.stats[ITERATION_MEM_HEAPUSED],
        result.stats[ITERATION_MEM_HEAPTOTAL]
    );
    print('[worker: %d] [iteration: %d] DURATIONS', result.worker, result.iteration);
    print_histogram(result.stats[ITERATION_TIME_HIST], function(line) {
        print('[worker: %d] [iteration: %d] %s', result.worker, result.iteration, line);
    })

    print('[worker: %d] [iteration: %d] STATUS CODES', result.worker, result.iteration);
    print_histogram(result.stats[ITERATION_STATUS_HIST], function(line) {
        print('[worker: %d] [iteration: %d] %s', result.worker, result.iteration, line);
    })
}

 function report_final(iterations, memory_usage, argv, print) {

    var opcountfilter = equals(ITERATION_OPERATIONS, argv.operations);

    var itcount = iterations.filter(opcountfilter).length;

    var t_min = iterations
        .filter(opcountfilter)
        .map(select(ITERATION_TIME_MIN))
        .reduce(min);

    var t_max = iterations
        .filter(opcountfilter)
        .map(select(ITERATION_TIME_MIN))
        .reduce(max,0);

    var t_count = iterations
        .filter(opcountfilter)
        .map(select(ITERATION_OPERATIONS))
        .reduce(sum,0);

    var t_sum = iterations
        .filter(opcountfilter).map(function(it) {
            return it.stats[ITERATION_TIME_MEAN];
        })
        .reduce(sum,0);

    var t_mean = t_sum / itcount;

    var t_hist = iterations
        .map(function(it){
            return it.stats[ITERATION_TIME_HIST];
        })
        .reduce(merge_histogram,{});

    var s_hist = iterations
        .map(function(it){
            return it.stats[ITERATION_STATUS_HIST];
        })
        .reduce(merge_histogram,{});

    var op_count = iterations.map(select(ITERATION_OPERATIONS)).reduce(sum);

    var mem_stats = calculate_memory_stats( memory_usage);

    if ( !argv.json ) {
        print();
        print("SUMMARY");
        print();
        print("  Configuration:");
        print("    operations: %d", argv.operations);
        print("    iterations: %d", argv.iterations);
        print("    processes:  %d", argv.processes);
        print();
        print("  Iteration times:", argv.operations, argv.operations == 1 ? "operation" : "operations");
        print("    mean: %d ms", t_mean.toFixed(2) );
        print("    min:  %d ms", t_min.toFixed(2) );
        print("    max:  %d ms", t_max.toFixed(2) );
        print();
        print("  Transactions / Second / Process:");
        print("    mean: %d tps", Math.round(argv.operations / t_mean * 1000) );
        print("    min:  %d tps", Math.round(argv.operations / t_max * 1000) );
        print("    max:  %d tps", Math.round(argv.operations / t_min * 1000) );
        print();
        print("  Durations:");
        print_histogram(t_hist, print);
        print();
        print("  Status Codes:");
        print_histogram(s_hist, print);
        print()
        print("  Memory Statistics: Average memory usage of all the workers");
        print("     Rss: %d ", mem_stats.rss);
        print("     HeapTotal: %d", mem_stats.heapTotal);
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
            status_codes: s_hist,
            memory_statistics: mem_stats
        };
        console.log("%j",output);
    }
}

module.exports = {
    iteration: iteration,
    print_histogram: print_histogram,
    report_iteration: report_iteration,
    report_final: report_final,
}
