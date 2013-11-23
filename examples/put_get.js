var fs = require('fs');
eval(fs.readFileSync('example.js')+'');

var n = con.config.NoOfOps;
var m = 0

console.time(n + " put+get")
for (var i = 0; i < n; i++ ) {

	var key0 = { ns:"test", set:"demo", key:"test"+i}
	var bins0 = { 'i': i, 's': i.toString() }

	var rec = { bins:bins0 }
	client.put(key0, rec, function(err, meta1, key1) {
		if ( err.code != 0 ) {
			console.log("put error: %s", err.message)
		}
		client.get(key1, function(err, bins2, meta2, key2) {
			if ( err.code != 0 ) {
				console.log("get error: %s", err.message)
			}
			if ( (++m) == n ) {
				var ms = console.timeEnd(n + " put+get")
			}
		});
	});
}
