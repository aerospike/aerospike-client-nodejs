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
  - add - Increment the value of a single bin
  - append - Append a string or bytes to a single bin
  - apply - Apply a UDF to a single record
  - exists - Check the existence of a record
  - get - Read a record
  - operate - Perform multiple operations on a record
  - put - Write a record
  - remove - Remove a record
- **Advanced Operations**
  - info - Get cluster state information
  - batch - Read a batch of records in a single transaction
  - query - Run a query to fetch records matching a filter, optionally
    performing aggregation using UDFs
  - scan - Run a scan on an entire namespace or set
  - sindex - Manage secondary indexes (create/remove index)
  - udf - Manage User-Defined Functions (create/remove module)
- **Complex Examples**
  - geospatialMonteCarlo - Performs a Monte Carlo simulation to approximate PI
    using Aerospike's geospatial indexing and query functionality
