// we want to test the built aerospike module
var aerospike = require('../../build/Release/aerospike');
var options = require('../util/options');
var assert = require('assert');
var expect = require('expect.js');

var keygen = require('../generators/key');
var metagen = require('../generators/metadata');
var recgen = require('../generators/record');
var valgen = require('../generators/value');

var status = aerospike.Status;
var policy = aerospike.Policy;



function logger(category) {
    return {
        pre: function() {
            var args = Array.prototype.slice.call(arguments);
            args.unshift(category)
            args.unshift("%s pre -");
            console.log.apply(null, args);
        },
        post: function() {
            var args = Array.prototype.slice.call(arguments);
            args.unshift(category)
            args.unshift("%s post -");
            console.log.apply(null, args);
        }
    };
}

function writer(client, rand, keys, metas, recs) {
    var log = logger('write')
    return function() {
        var i       = rand();
        var key     = keys[i];
        var meta    = metas[i];
        var rec     = recs[i];
        log.pre(i, key, meta, rec);
        client.put(key, rec, meta, log.post);
    };
}

function reader(client, rand, keys) {
    var log = logger('read')
    return function() {
        var i       = rand();
        var key     = keys[i];
        log.pre(i, key);
        client.get(key, log.post);
    };
}

function step(n, z, r, w, read, write) {
    if ( n < r ) {
        read();
    }
    
    if ( n < w ) {
        write()
    }

}

function run(rw, read, write) {
    var r = rw[0];
    var w = rw[1];
    var z = r + w;
    var n = 0;

    console.log("ratio: %d:%d", r, w);

    for(i=0; i<1000000; i++) {

        if ( n < r ) {
            read();
        }
        
        if ( n < w ) {
            write()
        }

        n++;
        if ( n === z ) {
            n = 0;
        }
    }
}


var client = aerospike.client({
    hosts: [
        { addr: options.host, port: options.port }
    ],
    log: {
        level: options.log
    },
    policies: {
        timeout: options.timeout
    }
}).connect(function(err, client) {
    
    if ( err.code != status.AEROSPIKE_OK ) {
        return;
    }

    // read/write ratio
    var rw = [1,5];

    // upper key range
    var nkeys = 1000;

    // generators
    var kgen = keygen.integer(options.namespace, options.set, {min: 1, max: nkeys});
    var mgen = metagen.constant({ttl: 1000});
    var rgen = recgen.record({i: valgen.integer(), s: valgen.string(), b: valgen.bytes()});

    var rand = valgen.integer({max: nkeys});
    var keys = keygen.range(kgen, nkeys);
    var metas = keygen.range(mgen, nkeys);
    var recs = keygen.range(rgen, nkeys);

    // console.log(rand);
    // console.log(keys);
    // console.log(metas);
    // console.log(recs);
    // return;

    var read  = reader(client, rand, keys);
    var write = writer(client, rand, keys, metas, recs);

    run(rw, read, write);

});
