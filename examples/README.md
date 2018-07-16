# Aerospike Node.js Client Examples

## Requirements

These examples use async/await functionality and require Node.js v8 or later to run.

(These requirements apply to running the provided examples only. The Aerospike
Node.js client itself may support a different range of Node.js versions and may
have additional requirements.)

## Setup

To use the examples, you will need to install the `aerospike` module into the
`examples` directory. From the `examples` directory, run the following to
install the dependencies:

    $ npm install

## Usage

You can simply run each example independently:

    $ node run <example>

Most of these examples require a key, and can optionally take a hostname, port,
and namespace of the cluster. The default server is on 127.0.0.1 at port 3000
(a local server installation).

To see a list of all the options that apply to all the examples, execute the
runner with the `--help` flag:

    $ node run --help

Each example also provides more detailed usage information via a `--help` flag:

    $ node run <example> --help

## Examples

The following are the included examples:

- **Single Key Operations**
  - exists - check the existence of a record
  - get - read a record
  - select - read specific bins of a record
  - put - write a record
  - remove - remove a record
  - operate - perform multiple operations on a record
  - info - get cluster state information
- **Batch & Query Operations**
  - batch - read a batch of records
  - query - run a query to fetch records matching a filter
  - scan - run a scan on an entire namespace or set
