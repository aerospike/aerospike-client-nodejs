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
 * Remove a record.
 * 
 ******************************************************************************/

var fs = require('fs');
var aerospike = require('aerospike');
var yargs = require('yargs');

var policy = aerospike.policy;
var status = aerospike.status;

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
        }
    });

var argv = argp.argv;
var keyv = argv._.length === 1 ? argv._[0] : null;

if ( argv.help === true ) {
    argp.showHelp();
    return;
}

if ( keyv === null ) {
    console.error("Error: Please provide a key for the operation");
    console.error();
    argp.showHelp();
    return;
}

/*******************************************************************************
 *
 * Establish a connection to the cluster.
 * 
 ******************************************************************************/

var client = aerospike.client({
    hosts: [
        { addr: argv.host, port: argv.port }
    ],
    log: {
        level: argv['log-level'],
        file: argv['log-file'] ? fs.openSync(argv['log-file'], "a") : 2
    },
    policies: {
        timeout: argv.timeout
    }
}).connect(function (err, client ) {
    if ( err.code != status.AEROSPIKE_OK ) {
        console.log("Aerospike server connection Error: %j", err)
        return;
    }
    if ( client === null ) {
        console.error("Error: Client not initialized.");
        return;
    }
});

/*******************************************************************************
 *
 * Perform the operation
 * 
 ******************************************************************************/

var key = {
    ns:  argv.namespace,
    set: argv.set,
    key: keyv
};

console.time("remove");

client.remove(key, function(err, key) {
    if ( err.code == status.AEROSPIKE_OK ) {
        console.log("OK - ", key);
    }
    else if ( err.code == status.AEROSPIKE_ERR_RECORD_NOT_FOUND ) {
        console.log("NOT_FOUND - ", key);
    }
    else {
        console.log("ERR - ", err, key);
    }

    console.timeEnd("remove");
    console.log("");
    
    client.close();
});
