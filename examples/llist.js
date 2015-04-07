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
var events = require('events');
var util = require('util');

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
 * Configure the client.
 * 
 ******************************************************************************/

config = {

    // the hosts to attempt to connect with.
    hosts: [
        { addr: argv.host, port: argv.port }
    ],
    
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
	}

};

var checkError = function(err, msg) {
	if(err.code != Status.AEROSPIKE_OK) {
		console.log(err);
	}
	else
	{
		console.log(msg);
	}
}

/*******************************************************************************
 *
 * Perform the operation
 * 
 ******************************************************************************/
var client = aerospike.client(config)
if(client == null)
{
	console.error("Error: Client object not initialized");
	process.exit(1);
}
client.connect(function (err, client) {

					
    if ( err.code != Status.AEROSPIKE_OK ) {
        console.error("Error: Aerospike server connection error. ", err.message);
        process.exit(1);
    }


	// Get a largelist object from client.
	var listkey = {ns: argv.namespace, set: argv.set, key: "ldt_list_key"}

	var policy = { timeout: 1000};

    var list = client.LargeList(listkey, "ldt_list_bin", policy);

	// perform all the largelist operations.
	
	// add single value to the list.
	var val = "listvalsingle";
	list.add(val, function(err, val ){
		checkError( err, "Added a single value ");
	});


	// update single value added to the list.
	var updateVal = "listvalupdated";
	list.update(updateVal, function(err, val ){
		checkError( err, "Updated a single value ");	
	});

	// find an entry in the list.
	list.find("listvalsingle", function(err, val){
		checkError(err, "Find function verified");
		console.log("value found ", val);
	});

	// remove an entry in the list.
	list.remove("listvalsingle", function(err, val){
		checkError(err, "Remove an entry verified");
	});

	// add an array of values to the list.
	var val = ["listadd1", "listadd2", "listadd3", "listadd4", "listadd5"];
	list.add(val, function(err, retVal){
		checkError(err, "Added an array of values");
	});

	// update an array of value in the list.
	var val = ["listupdate1", "listupdate2", "listupdate3", "listupdate4", "listupdate5"];
	list.update(val, function(err, val) {
		checkError(err, "Updated an array of values");
	});
	
	// find a range of entries in the list.
	list.findRange("listadd1", "listadd9", function(err, val){
		checkError(err, "Find Range Entry Verified");
		console.log(val);
	});

	// remove a range of entries in the list.
	list.removeRange("listadd1", "listadd9", function(err, val){
		checkError(err, "Remove a range of entries verified");
	});

	// remove an array of values in the list.
	var val = ["listupdate1", "listupdate2", "listupdate3", "listupdate4", "listupdate5"];
	list.remove(val, function(err,val) {
		checkError(err, "Removed an array of values");
	});
	
	// scan the whole llist.
	list.scan(function(err, val){
		checkError(err, "Scan Completed" );
		console.log("scanned value", val);
	});

	// Get the size of the list and destroy the list.
	list.size(function(err, val){
		checkError(err, "Get size is verified");
		console.log("The size of the list is ", val);
		list.getConfig(function(err, val) {
			console.log(val);
			// destroy the llist completely.
			list.destroy(function(err, val) {
				checkError(err, "The list is destroyed");
			});
		});
	});


	
});

