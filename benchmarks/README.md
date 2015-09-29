# Benchmarks

Benchmark is a collection of example programs which can be used to benchmark the Aerospike Node.js Client.

## Setup

To use the benchmarks, you will need to install the `aerospike` module into the `benchmarks` directory.

From the `benchmarks` directory, run the following to install the dependencies:

	$ npm install ../
	$ npm update

## Programs

The following are the programs in this directory:

- `main.js` – The main benchmark program, which runs multiple batches of operations
against an Aerospike cluster. The program can run for a specified number of iterations
or time frame.
- `inspect.js` – Runs `main.js` with multiple configurations to find a combination
of parameters which appear to perform best.
- `memory.js` – Is a program which is used to process the memory usage output from `main.js`,
to give more insight into memory utilization.

These programs optionally take a hostname, port, and namespace of the
cluster. The default server is on 127.0.0.1 at port 3000
(a local server installation).

Each of the programs will provide usage information when `--help` option is provided.

## main.js

The primary benchmark program, which will run multiple iterations of a batch of operations against an Aerospike database cluster.

The configuration to run benchmark is specified through a json file. A sample JSON file is available.

Alternatively, you can have the program run for a specified period of time. This will supercede the `-I` option, so the number iterations will depend on the number of iterations that can be executed in the time period.

- `-T <n>[s|m|h]` – The amount of time to run the program. The value will be the amount of time followed by the unit of time. The units are: `s` (seconds), `m` (minutes) and `h` (hours).

Use `--help` to list all options for the program.

### Summary Reports

The program will generate a report of the test after it has completed. The report will contain several kinds of data, including transactions per second, memory use, and status codes.

This will requires the main program to store the information for the summary report in memory.

If you do not want a summary report, then use the `--no-summary` option.



