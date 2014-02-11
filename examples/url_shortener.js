/**********************************************************************************
 *
 * URL SHORTENING APPLICATION
 *
 ***********************************************************************************/ 

var aerospike = require('aerospike');
var status = aerospike.status;
var op = aerospike.operator;
var fs = require('fs');
var http = require('http');
var parse = require('url').parse;
var optimist = require('optimist');

/*********************************************************************************
 *
 * Options parsing
 *
 ********************************************************************************/
var argp = optimist
    .usage("$0 [options] ")
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
            describe: "Path to a file to write log messages "
        },
        namespace: {
            alias: "n",
            default: "test",
            describe: "namespace for the keys."
        },
        set: {
            alias: "s",
            default: "url_shortening",
            describe: "Set for the keys."
        },
        'http-server' : {
            default : "127.0.0.1",
            describe : "HTTP server address"
        },
        'http-port' : {
            default : 8080,
            describe : "HTTP server port"
        }
});

var argv = argp.argv;
if ( argv.help === true ) {
    argp.showHelp();
    return;
}


/***********************************************************************************
 *
 * Global variables
 *
 **********************************************************************************/ 
var SERVER =  argv['http-server'];
var PORT = argv['http-port'];

var COUNTER = 'URL_COUNTER';

/**********************************************************************************
 *
 * Establish connection to aerospike cluster
 *
 **********************************************************************************/ 

var client = aerospike.client({
    hosts:[ 
        { addr: argv.host, port : argv.port }
    ],
    log : {
        level : argv['log-level'] ,
        file  : argv['log-file'] ? fs.openSync(argv['log-file'], "a") : 2
    },
    policies : {
        timeout : argv.timeout
    }
}).connect(function (err, client) {
    if (err.code != status.AEROSPIKE_OK) {
        console.log("Aerospike server connection Error: %j", err)
        return;
    }
    if ( client === null ) {
        console.error("Error: Client not initialized.");
        return;
    }
});

/************************************************************************************
 *
 * Get the URL counter from aerospike cluster, if it exists already otherwise
 * write a  new URL counter, to the aerospike cluster,
 * to keep track of total number of URLS that are shortened.
 *
 ***********************************************************************************/

var key = { ns : argv.namespace, set : argv.set, key : COUNTER};
// check whether URL shortening counter exists in the aerospike cluster.
client.exists( key, function (err, rec, metadata, key) {
    
   // If the counter does not exist, write a new counter, to the aerospike cluster.
   if ( err.code == status.AEROSPIKE_RECORD_NOT_FOUND){
    var rec = { url_counter : -1}
    var metadata = {ttl : 0, gen : 0 }
    client.put( key, rec, metadata, function ( err, key1) {
        if ( err.code != status.AEROSPIKE_OK) {
            console.log("Error writing the index to the aerospike cluster");
            return;
        }
    });
   } else if (err.code != status.AEROSPIKE_OK){
        console.log("Error with URL shortening counter, from AS cluster");
        return;
   } else {
        //Counter exists in the aerospike cluster, so do nothing.
   }
});

/*********************************************************************************
 *
 * Fetch the url counter from aerospike cluster
 * This function increments the counter value and fetches the incremented 
 * counter from aerospike.
 *
 ********************************************************************************/

function fetch_counter_from_aerospike( callback) {
    var key = { ns: argv.namespace, set : argv.set, key : COUNTER};
    var ops = [ op.incr('url_counter', 1),
                op.read('url_counter')];

    client.operate(key, ops, callback);
}


// all characters in base62 encoding
var base62 = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
 
function num_to_base62( n )
{
    if ( n > 62 ) {
        return num_to_base62(Math.floor(n / 62)) + base62[n % 62];
    } else {
        return base62[n];
    }
}

/********************************************************************************
 *
 * Generate the Short URL id from the long URL
 *
 ********************************************************************************/

function generate_short_URL(callback)
{
    // Algorithm that returns a short url with 5 chars
    fetch_counter_from_aerospike(function (err, rec, metadata, key){
        var short_url = num_to_base62( rec.url_counter);
        while(short_url.length < 5) {
            short_url = base62[0]+short_url;
        }
        callback(short_url);
    });
}

/*********************************************************************************
 *
 * Lookup the long url from aerospike cluster given the short URL
 *
 ********************************************************************************/ 

function shortURL_to_longURL( shortURL, callback)
{
    //get the longURL from aerospike database.
    var key = { ns : argv.namespace, set : argv.set, key : shortURL }
    client.get( key, callback);
}

/**********************************************************************************
 *
 * Store the long URL and the short URL into the Aerospike cluster
 * Key --> short URL
 * Value --> long URL
 *
 *********************************************************************************/

function store_URL( short_URL, long_URL, put_done)
{
    var key = { ns : argv.namespace, set: argv.set, key : short_URL }
    var rec = { long_url : long_URL }
    client.put(key, rec, put_done);
}

function process_long_URL( long_URL, callback )
{
    generate_short_URL( function(short_url) {
        store_URL( short_url, long_URL, function (err, key) {
            callback(err, key);
        });
    });
}


/********************************************************************************
 *
 * Node.js Application for URL shortening 
 *
 *******************************************************************************/

var server = http.createServer( function(req, res){
    var param = parse(req.url, true);
    if ( param.pathname == '/add') {
        if ( param.query.url !== undefined ) {

            process_long_URL(param.query.url, function (err, key){
                if ( err.code == status.AEROSPIKE_OK) {
                    var short_url = key.key;
                    res.writeHead(200, {'Content-Type': 'text/html'});
                    short_url_string = 'http://' + SERVER + ':' + PORT + '/' + short_url;
                    res.end('Your short url is: <a href="' + short_url_string +
                        '">' + short_url_string + '</a>');
                } else {
                    res.writeHead(500, {'Content-Type': 'text/plain'});
                    res.end('Error in generating short URL');
                }
            });
        } else {
            res.writeHead(400, {'Content-Type': 'text/plain'});
            res.end('Malformed URL');
        }
    }
    else {
        var short_url = param.pathname.substring(1);
        if (short_url.length > 0 ){
            longURL = shortURL_to_longURL(short_url, function ( err, rec, metadata, key) {

                if ( rec.long_url !== undefined) {
                    res.writeHead( 302, { 'Location': 'http://'+rec.long_url });
                    res.end();
                } else {
                    res.writeHead( 404, {'Content-Type': 'text/plain'});
                    res.end('404 -  Requested URL not found');
                }
            });
        } else {
            res.writeHead(200, {'Content-Type': 'text/html'});
            var html = "<html> " +
                        "<body>" + 
                        "<form action = \"add\">" + 
                        "<input type=\"text\" name=\"url\">" +
                        "<input type=\"submit\" value=\"Generate Short URL\">" +
                        "</form>" + "</body>" + "</html>";
            res.write(html);
            res.end();
        }
    }
            
}).listen(PORT, SERVER);

console.log('server running at http://' + SERVER + ":" + PORT + '/')
