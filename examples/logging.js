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

/*****************************************************************************
 *
 * node logging --log-file <path/to/log-file> --log-level <0-4>
 *
 * Demonstrates logging from the API, for PUT and GET functions.
 *
 * Examples:
 *      
 *  Enable Debug logging to stderr.
 *
 *      node logging --log-level 3.
 *
 *  Enable Detail logging to stderr.
 *
 *     node logging --log-level 4.
 *
 *  Redirect the log messages to a file `example.log`
 *
 *     node logging --log-level <0-4> --log-file example.log
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
    .usage("$0 [options] logfile")
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
var logfile = argv._.length === 1 ? argv._[0] : null;

if ( argv.help === true ) {
    argp.showHelp();
    return;
}

if ( logfile === null ) {
    console.error("Error: Please provide a logfile for the operation");
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
    policies: {
        timeout: argv.timeout
    }
}).connect(function(err, client) {
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

Function.prototype.curry = function() {
    var fn = this, args = Array.prototype.slice.call(arguments);
    return function() {
        return fn.apply(this, args.concat(Array.prototype.slice.call(arguments)));
    };
};

function header(message, callback) {
    return function() {
        console.log('');
        console.log('********************************************************************************');
        console.log('* ', message);
        console.log('********************************************************************************');
        console.log('');
        if ( callback ) callback();
    }
}

function get(key, callback) {
    return function() {
        console.log('*** get')
        client.get(key, function(err, record, metadata, key) {
            if ( callback ) callback();
        });
    }
}

function put(key, rec, callback) {
    return function() {
        console.log('*** put')
        client.put(key, rec, function(err, key) {
            if ( callback ) callback();
        });
    }
}

function log(level, file, callback) {
    return function() {
        var fd;
        if ( file ) {
            if ( !isNaN(parseInt(file, 10)) && isFinite(file) ) {
                fd = parseInt(file, 10);
            }
            else {
                fd = fs.openSync(file, "a");
            }
        }

        console.log('*** log level=%d file=%s', level, file);
        client.updateLogging({
            level: level,
            file: fd
        });
        if ( callback ) callback();
    }
}

function close() {
    return function() {
        client.close();
    }
}

var key = {
    ns:  argv.namespace,
    set: argv.set,
    key: "abc"
};

operations = [
    
    header.curry('Log: default settings'),
    put.curry(key, {a: 1}),
    get.curry(key),

    header.curry('Log: level=4(TRACE)'),
    log.curry(5, null),
    put.curry(key, {a: 2}),
    get.curry(key),
    
    header.curry('Log: file=' + logfile),
    log.curry(null, logfile),
    put.curry(key, {a: 3}),
    get.curry(key),
    
    header.curry('Log: level=3(DEBUG) file=STDERR'),
    log.curry(3, 2),
    put.curry(key, {a:4}),
    get.curry(key)
];

operations.reduceRight(function(r, l) {
    return l(r);
})();
