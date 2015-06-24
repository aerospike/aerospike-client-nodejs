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
 * Read a batch of records.
 * 
 ******************************************************************************/

var fs = require('fs');
var aerospike = require('aerospike');
var yargs = require('yargs');

var Policy = aerospike.policy;
var Status = aerospike.status;

/*******************************************************************************
 *
 * Options parsing
 * 
 ******************************************************************************/

var argp = yargs
    .usage("$0 [options] key [key ...] ")
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
        },
		bins: {
			alias: "b",
			default: undefined,
			describe: "Bins to select in the batch Call"
		},
		user: {
			alias: "u",
			default: null,
			describe: "Username to connect to secured cluster"
		},  
		password: {
			alias: "p",
			default: null,
			describe: "Password to connec to secured cluster"
		}  
    });

var argv = argp.argv;
var keys = argv._.map(function(key) {
    return { ns: argv.namespace, set: argv.set, key: key };
});


if ( argv.help === true ) {
    argp.showHelp();
    process.exit(0);
}


if ( keys.length === 0 ) {
    console.error("Error: Please provide one or more keys for the operation");
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

if (argv.user !== null)
{
	config.user = argv.user;
}

if (argv.password !== null)
{
	config.password = argv.password;
}
/*******************************************************************************
 *
 * Perform the operation
 * 
 ******************************************************************************/

function format(o) {
    return JSON.stringify(o, null, '    ');
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
        console.time("batch_get");
    }

	var bins = [ 'i', 's'];
    client.batchSelect(keys, bins, function (err, results) {
        
        var exitCode = 0;

        switch ( err.code ) {
            case Status.AEROSPIKE_OK:
                console.log(format(results));
                break;

            default:
                console.error("Error: " + err.message);
                exitCode = 1;
                break;
        }


        if ( argv.profile ) {
            console.log("---");
            console.timeEnd("batch_get");
        }
        
        process.exit(exitCode);
    });
});
