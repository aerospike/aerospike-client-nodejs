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
 * Write a record.
 *
 ******************************************************************************/

var fs = require('fs');
var aerospike = require('aerospike');
var client = aerospike.client;
var yargs = require('yargs');
var events = require('events');
var util = require('util');
var iteration = require('./iteration');

var Policy = aerospike.policy;
var Status = aerospike.status;
var filter = aerospike.filter;

/*******************************************************************************
 *
 * Options parsing
 *
 ******************************************************************************/

var argp = yargs
    .usage("$0 [options] key")
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
        user: {
            alias: "U",
            default: null,
            describe: "Username to connect to secured cluster"
        },
        password: {
            alias: "P",
            default: null,
            describe: "Password to connect to secured cluster"
        },
        iterations: {
            alias: "I",
            default: 1,
            describe: "Number of iterations"
        },
    });

var argv = argp.argv;

if (argv.help === true) {
    argp.showHelp();
    return;
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

    //modlua userpath
    modlua: {
        userPath: __dirname
    },

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
        filters: [filter.equal("i", 492)],
    };

    var stream = client.query(argv.namespace, argv.set, options).execute();

    stream.on('data', function(rec) {
        !argv.quiet && console.log(JSON.stringify(rec, null, '    '));
    });

    stream.on('error', function(err) {
        console.error(err);
        process.exit(1);
    });

    stream.on('end', function() {
        iteration.next(run, client);
    });
}

function isError(err) {
    if (err && err.code != Status.AEROSPIKE_OK) {
        console.error("Error: " + err.message);
        return true;
    } else {
        return false;
    }
}

aerospike.client(config).connect(function(err, client) {
    if (isError(err)) {
        process.exit(1);
    } else {
        run(client)
    }
});