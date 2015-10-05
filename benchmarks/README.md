# Benchmarks

Benchmark is a collection of example programs which can be used to benchmark the Aerospike Node.js Client.

## Setup

To use the benchmarks, you will need to install the `aerospike` module into the `benchmarks` directory.

From the `benchmarks` directory, run the following to install the dependencies:

	$ npm install ../
	$ npm update

## Running the main benchmark.

- `main.js` – The main benchmark program, which runs multiple batches of operations
against an Aerospike cluster. The program can run for a specified number of iterations
or time frame. To run the benchmark 

    $`node main.js`

The configuration parameters to run benchmark are specified through `config.json` file. A sample `config.json` 
is available in the benchmark folder. This can be modified to run the desired configuration.

## Configuration details.

 -  host        : Aerospike host node.(default `localhost`)
 -  port        : The port to connect to Aerospike Server. (default `3000`).
 -  namespace   : All the operations for benchmark are done on this namespace.(default `test`).
 -  set         : The set name on which all the benchmark operations are performed.(default `demo`).
 -  user        : Username to connect to secured cluster. (default `null`).
 -  password    : Password to connect to secured cluster. (default `null`).
 -  timeout     : Global timeout for all read/write operations performed in benchmark. (default `0` - infinite timeout).
 -  ttl         : Time to live for the objects written during benchmark run. (default `10000` seconds).
 -  log         : Log level of the client module (default INFO). 
 -  operations  : Number of operations for a single batch of operations. (default `100`).
 -  iterations  : Number of iterations the benchmark should run. (default `null` - runs indefinitely).
 -  processes   : Number of worker process. These are work horses for the benchmark, that does actual read/write or scan/query operations                  in a aerospike cluster. (default  `4` - Recommened value Number of CPUs/cores in the machine).
 -  time        : Time to run the benchmark. This can be specified in the units of seconds/minutes/hours. 
                  Sample data - 30s/30m/30h. This runs for the benchmark for 30 seconds/30 minutes/ 30 hours respectively.
                  (default `24h` - runs for 24 hours).
 -  reads       : The read proportion in the read/write ratio. (default `1`).
 -  writes      : The write proportion in the read/write ratio. (default `1`).
 -  keyrange    : Range of key values to be used in benchmark for read/write operations. (default `0-100000`).
 -  binSpec     : Bin specification for write operations in benchmark. This is specified using,
                  - name : name of the bin.
                  - type : type of the bin. should be STRING, BYTES or INTEGER.
                  - size : size of data to be written in each bin. For integer type bins size is 8.

## Benchmark output.

The benchmark prints the read/write tps in the following format.

info: Fri Oct 02 2015 00:03:55 GMT+0530 (IST) read(tps=14434 timeouts=0 errors=0) write(tps=14350 timeouts=0 errors=0)

info: Fri Oct 02 2015 00:03:56 GMT+0530 (IST) read(tps=14009 timeouts=0 errors=0) write(tps=14119 timeouts=0 errors=0) 

info: Fri Oct 02 2015 00:03:57 GMT+0530 (IST) read(tps=14691 timeouts=0 errors=0) write(tps=14581 timeouts=0 errors=0)

info: Fri Oct 02 2015 00:03:58 GMT+0530 (IST) read(tps=14200 timeouts=0 errors=0) write(tps=14200 timeouts=0 errors=0)

In the end it prints the summary of benchmark run in the following format.

SUMMARY

- Configuration
- operations  : 100        
- iterations  :  undefined  
- processes   : 4          
- time        :  30 seconds

- Durations :  latency histogram of read/write operations.
   
   | <=1  | >1  | >2  | >4  | >8  |  >16 | >32  |
|---|---|---|---|---|---|---|
| 8.4%  |11.9%   | 21.7%  |27.0%   |18.4%   |10.6%   |1.9%   |


- Status Codes : histogram for return values of read/write operations.

   | 0  |
|---|
|100.0%   |




