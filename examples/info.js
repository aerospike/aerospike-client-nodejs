var fs = require('fs');
eval(fs.readFileSync('example.js')+'');

client.info ( "127.0.0.1", 3000, "statistics", function( err, response) {
	console.log(response);
});

