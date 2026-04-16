# Testing Aerospike Node.js Client

## Installation

We also recommend installing Aerospike dependencies by running the following
from the module's root directory:

    $ npm update

This will install all required dependencies.

## Usage

To run the test cases:

    $ npm test

The tests are written and run using [`mocha`](http://visionmedia.github.io/mocha).
You can choose to use `mocha` directly, but you must first install `mocha`:

    $ npm install -g mocha

Note: some users may need to run this as sudo.

Then to run the tests via mocha, you will want to run it from the modules' root
directory:

    $ mocha -R spec

## Options

You can modify the test with various options:

    --help           Display this message.
    --host, -h       Aerospike database address.  [default: "127.0.0.1"]
    --port, -p       Aerospike database port.     [default: 3000]
    --timeout, -t    Timeout in milliseconds.     [default: 10]
    --log, -l        Log level [0-5]              [default: 2]
    --namespace, -n  Namespace for the keys.      [default: "test"]
    --set, -s        Set for the keys.            [default: "demo"]

Options can be set via an environment variable `OPTIONS`:

    $ OPTIONS="--port 3010" npm test
