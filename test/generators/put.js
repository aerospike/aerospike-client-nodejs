
var aerospike = require('../../build/Release/aerospike')
var status = aerospike.Status;

function put_done(total, done) {

    var entries = {};
    var count = 0;

    return function(_key, record, metadata) {
        return function(err, key, skippy) {
            switch ( err.code ) {
                case status.AEROSPIKE_OK:
                    entries[key.key] = {
                        status: err.code,
                        key: key,
                        record: record,
                        metadata: metadata
                    };
                    break;
                default:
                    console.error("Error: ", err, key);
            }

            count++;
            if ( count >= total ) {
                done(entries);
            }
        };
    };
}

function put(client, n, keygen, recgen, metagen, done) {

    var d = put_done(n, done);
    var i;

    for ( i = 0; i < n; i++ ) {
        var key = keygen();
        var metadata = metagen(key);
        var record = recgen(key, metadata);
        var callback = d(key, record, metadata);
        client.put(key, record, metadata, callback);
    }
}


module.exports = {
    put: put
};