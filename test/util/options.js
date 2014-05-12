
var aerospike = require('../../build/Release/aerospike');
var yargs = require('yargs');

/*******************************************************************************
 *
 * Options parsing
 * 
 ******************************************************************************/

var parser = yargs
    .usage("$0 [options]")
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
        log: {
            alias: "l",
            default: aerospike.log.INFO,
            describe: "Log level [0-5]"
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

var options = process.env['OPTIONS'] ? parser.parse(process.env['OPTIONS'].trim().split(' ')) : parser.argv;

if ( options.help === true ) {
    parser.showHelp();
    process.exit(0);
}

module.exports = options;