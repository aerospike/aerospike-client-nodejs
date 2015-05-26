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
 * Get state information from the cluster or a single host.
 * 
 ******************************************************************************/

var fs = require('fs');
var aerospike = require('aerospike');
var yargs = require('yargs');

var Policy = aerospike.policy;
var Status = aerospike.status;
var Language = aerospike.language;

/*******************************************************************************
 *
 * Options parsing
 * 
 ******************************************************************************/

var argp = yargs
    .usage("$0 [options] module")
    .options({
        help: {
            boolean: true,
            describe: "Display this message."
        },
        profile: {
            boolean: true,
            describe: "Profile the operation."
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
		enable_security: {
			default: false,
			describe: "set this to true to run example in a secured cluster"
		},  
		user: {
			alias: "u",
			default: "admin",
			describe: "Username to connect to secured cluster"
		},  
		password: {
			alias: "p",
			default: "admin",
			describe: "Password to connec to secured cluster"
		}  
    });

var argv = argp.argv;
var module = argv._.shift();

if ( argv.help === true ) {
    argp.showHelp();
    process.exit(0);
}

if ( ! module ) {
    console.error("Error: Please provide a UDF module name to remove.");
    console.error();
    argp.showHelp();
    process.exit(1);
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
    }
};

if(argv.enable_security)
{
	config.user = argv.user;
	config.password = argv.password;
}

aerospike.client(config).connect(function (err, client) {

    if ( err.code != Status.AEROSPIKE_OK ) {
        console.error("Error: Aerospike server connection error. ", err.message);
        process.exit(1);
    }

    //
    // Perform the operation
    //

    if ( argv.profile ) {
        console.time("udfRemove");
    }

    client.udfRemove(module, function(err) {

        var exitCode = 0;

        switch ( err.code ) {
            case Status.AEROSPIKE_OK:
                break;
            default:
                console.error("Error: " + err.message);
                exitCode = 1;
                break;
        }
        
        if ( argv.profile ) {
            console.log("---");
            console.timeEnd("udfRemove");
        }

        process.exit(exitCode);
    });
});
