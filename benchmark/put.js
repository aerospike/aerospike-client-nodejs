// Benchmarking put operation.

var optimist = require('optimist')
var aerospike = require('aerospike')
var status = aerospike.Status

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
            default: aerospike.Log.INFO,
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
        nops: {
            alias: "N",
            default: 100000,
            describe: "Total number of operations for benchmarking."
        }
    });

var argv = argp.argv;

if ( argv.help === true) {
    argp.showHelp()
    return;
}
var cluster = require('cluster');
var numCPUs = require('os').cpus().length;
var client = aerospike.client({
    hosts: [
        { addr: argv.host, port: argv.port }
    ],
    policies: {
        timeout: argv.timeout
    }
}).connect(function(err) {
    if (err.code != status.AEROSPIKE_OK) {
        console.log("Aerospike server connection Error: %j", err)
        return;
    }
});


if (client === null)
{
	console.log("Client object is null \n ---Benchmark Exiting --- ")
	process.exit(1)
}

var ops_per_worker = argv.nops / numCPUs

var ops_by_worker = 0;
// Total number of operations completed by all the workers until (systime - 1) seconds.
var hist = 0;

//Total number of operations completed by all the workers, until (systime) seconds
var numReqs = 0;


//Count the total number of requests completed. 
//Done by the master in the cluster.
function messageHandler(msg) {
    if (msg.cmd && msg.cmd == 'put') {
        numReqs += 1;
    }
}

// No of workers which finished exection.
var dead_workers = 0;

if (cluster.isMaster) {
    // function to setInterval is invoked every second.
    // This calculates the TPS and latency every one second
    var timerId = setInterval(function() {
    if ( numReqs != 0) {
        var tps = numReqs - hist;
        var latency = 1000/tps;
        console.log("TPS = %d, latency in ms = %d", tps, latency.toFixed(3));
        hist = numReqs;
     }
    }, 1000);

    // Fork workers.
    for (var i = 0; i < numCPUs; i++) {
        console.log("Forking child %d", i);
        cluster.fork();
    }

    // Set the message handler for each worker.
    Object.keys(cluster.workers).forEach(function(id) {
        cluster.workers[id].on('message', messageHandler);
    });

    //When a worker exits 
    cluster.on('exit', function(worker, code, signal) {
        console.log('worker %d died (%s)...',
            worker.process.pid, signal || code);

      worker.kill()  
      dead_workers++;
      
      // If all the workers are done finishing their task
      // clearInterval(), to inform node process not to call the 
      // function every one second.
      if (dead_workers == numCPUs) {
        clearInterval(timerId)
      }
  })

} else {
  // This code is executed by the worker thread.
  var worker_id = cluster.worker.id

  //Note the start time of the put operations.
  var startTime = new Date();
  
  for (var i = 0; i < ops_per_worker; i++ ) {
    // Key of the record.
    var k1 = {
        ns: argv.namespace,
        set: argv.set,
        key: "key" + worker_id +"_"+i
    }

    // record to be written 
    var rec = {
        s: i.toString(),
        i: i
    }

    // write the record to database
    client.put(k1, rec, function(err) {
        if ( err.code != status.AEROSPIKE_OK ) {
            console.log( "%j", err)
        }
        
        ops_by_worker++;
              
        //Send a message to parent process, to signal the completion of one request.
        process.send({cmd:'put'});

        // Logging the time taken for first request, as it takes longer time for 1st request.
        if ( ops_by_worker == 1) {
            var first_req = new Date()
            var first_total_time = first_req -startTime; 
            console.log("time taken to finish the 1st requests %d", first_total_time);
        }

        //Logging the average statistics of this worker .
        if ( ops_by_worker  == ops_per_worker ) {
            var endTime = new Date();
            var totalTime = endTime - startTime;
            var w_latency = totalTime/ops_by_worker
            var w_TPS = ops_by_worker * 1000 / totalTime
            console.log("average latency of worker %d  = %d", worker_id, w_latency.toFixed(3));
            console.log("average TPS of worker %d = %d", worker_id, w_TPS.toFixed(3));
            process.exit(0)
        }
    })  

  }
}
