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
var client    = aerospike.client;
var yargs = require('yargs');
var events = require('events')
var util = require('util')
var policy = aerospike.policy;
var status = aerospike.status;
var AsScan = require('../lib/AsScan');
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

if ( argv.help === true ) {
    argp.showHelp();
    return;
}


/*******************************************************************************
 *
 * Establish a connection to the cluster.
 * 
 ******************************************************************************/

var client = new client({
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

var scan = AsScan({ client_obj : client, ns: argv.namespace, set: argv.set, highWaterMark : 1})

//udf_args = { module:"udf_test", funcname: "func_cache", args: [123, "str"] }

//scan.setUDFargs(udf_args);
var i = 0;
scan.on('data', function(record) {
		console.log(i++);
		console.log(JSON.parse(record));
})
scan.on('error', function(err){
			console.log(JSON.parse(err));
})
scan.on('end', function() {
	process.exit(0)

});
