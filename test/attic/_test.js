

// function CleanRecords( str )
// {
//     for ( var i = 1; i <= n; i++) {
//         var key = { ns: 'test', set: 'demo', key: str + i } 
        
//         client.remove(key, function(err) {
//         });
//     }   
// }

// function GetRecord(i)
// {
//     var obj = { 'integer' : i, 'string' : "Some String" , 'array' : [1,2,3] };
//     var packed_obj = msgpack.pack(obj); 
//     var binlist = { 'string_bin' : i.toString(), 'integer_bin': i, 'blob_bin' : packed_obj };
//     var meta = { ttl : 100, gen : 0 }
//     var rec = { metadata : meta, bins : binlist };
//     return rec;
// }

// function ParseConfig( param )
// {
//     param.ns = con.config.namespace;
//     param.set = con.config.set;
// }



// function range_write_done(start, end, done) {

//     var total = end - start + 1;
//     var done = 0;
//     var success = 0;
//     var failure = 0;

//     return function(err, key, skippy) {

//         switch ( err.code ) {
//             case status.AEROSPIKE_OK:
//                 console.log("OK - ", key);
//                 success++;
//                 break;
//             default:
//                 console.log("ERR - ", err, key);
//                 failure++;
//         }

//         done++;
//         if ( done >= total ) {
//             done(total, success, failure);
//         }
//     }
// }

// function range_write(client, ns, set, start, end, prefix, done) {

//     var callback = range_write_done(start, end, done);
//     var i = start;

//     for (; i <= end; i++ ) {

//         var key = {
//             ns:  ns,
//             set: set,
//             key: prefix + i
//         };

//         var record = {
//             k: i,
//             s: "abc",
//             i: i * 1000 + 123,
//             b: new Buffer([0xa, 0xb, 0xc])
//         };

//         var metadata = {
//             ttl: 10000,
//             gen: 0
//         };

//         client.put(key, record, metadata, callback);
//     }
// }


// exports.CleanRecords = CleanRecords;
// exports.GetRecord = GetRecord;
// exports.ParseConfig = ParseConfig;
// exports.range_write = range_write;
