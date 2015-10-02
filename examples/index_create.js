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

/*******************************************************************************
 *
 * Select bins of a record.
 *
 ******************************************************************************/

var fs = require('fs');
var aerospike = require('aerospike');
var yargs = require('yargs');
var iteration = require('./iteration');

var Policy = aerospike.policy;
var Status = aerospike.status;

/*******************************************************************************
 *
 * Options parsing
 *
 ******************************************************************************/

var argp = yargs
    .usage("$0 [options] bin index type")
    .options({
        help: {
            boolean: true,
            describe: "Display this message."
        },
        quiet: {
            alias: "q",
            boolean: true,
            describe: "Do not display content."
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
        'log-level': {
            alias: "l",
            default: aerospike.log.INFO,
            describe: "Log level [0-5]"
        },
        'log-file': {
            default: undefined,
            describe: "Path to a file send log messages to."
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
        'key': {
            boolean: true,
            default: true,
            describe: "Display the record's key."
        },
        'metadata': {
            boolean: true,
            default: true,
            describe: "Display the record's metadata."
        },
        'bins': {
            boolean: true,
            default: true,
            describe: "Display the record's bins."
        },
        user: {
            alias: "U",
            default: null,
            describe: "Username to connect to secured cluster"
        },
        password: {
            alias: "P",
            default: null,
            describe: "Password to connectt to secured cluster"
        },
        iterations: {
            alias: "I",
            default: 1,
            describe: "Number of iterations"
        },
    });

var argv = argp.argv;
var bin = argv._.shift();
var index = argv._.shift();
var type = argv._.shift();

if (argv.help === true) {
    argp.showHelp();
    process.exit(0);
}

if (!bin) {
    console.error("Error: Please provide a bin to be indexed");
    console.error();
    argp.showHelp();
    process.exit(1);
}

if (!index) {
    console.error("Error: Please provide a index name");
    console.error();
    argp.showHelp();
    process.exit(1);
}

if (!type) {
    console.error("Error: Please provide a type of index to be created");
    console.error();
    argp.showHelp();
    process.exit(1);
}

iteration.setLimit(argv.iterations);

/*******************************************************************************
 *
 * Configure the client.
 *
 ******************************************************************************/

config = {

    // the hosts to attempt to connect with.
    hosts: [{
        addr: argv.host,
        port: argv.port
    }],

    // log configuration
    log: {
        level: argv['log-level'],
        file: argv['log-file'] ? fs.openSync(argv['log-file'], "a") : 2
    },

    // default policies
    policies: {
        timeout: argv.timeout
    },

    // authentication
    user: argv.user,
    password: argv.password,
};

/*******************************************************************************
 *
 * Perform the operation
 *
 ******************************************************************************/

function run(client) {

    var options = {
        ns: argv.namespace,
        set: argv.set,
        bin: bin,
        index: index,
    };

    switch (type) {
        case "integer":
            client.createIntegerIndex(options, function(err) {
                if (isError(err)) {
                    process.exit(1);
                } else {
                    isIndexCreated(client, argv.namespace, index, 1000);
                }
            });
            break;
        case "string":
            client.createStringIndex(options, function(err) {
                if (isError(err)) {
                    process.exit(1);
                } 
                else {
                    isIndexCreated(client, argv.namespace, index, 1000);
                }
            });
            break;
        default:
            console.error("Error: Only integer and string indices are supported.");
            process.exit(1);
    }
}

function isError(err) {
    if (err && err.code != Status.AEROSPIKE_OK) {
        switch (err.code) {
            case Status.AEROSPIKE_ERR_RECORD_NOT_FOUND:
                console.error("Error: Not Found.");
                return true;
            default:
                console.log(err);
                console.error("Error: " + err.message);
                return true;
        }
    } else {
        return false;
    }
}

function isIndexCreated(client, namespace, index, pollInterval) {
    client.indexCreateWait(namespace, index, pollInterval, function(err) {
        if (isError(err)) {
            process.exit(1);
        } 
        else {
            !argv.quiet && console.log("Index Created - %s", index);
        }
    });
}

aerospike.client(config).connect(function(err, client) {
    if (err && err.code != Status.AEROSPIKE_OK) {
        process.exit(1);
    } else {
        run(client);
    }
});
