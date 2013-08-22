var aerospike = require('aerospike')
var key = aerospike.key
var config = {
	hosts:[{ addr:"127.0.0.1", port: 3000 }
	      ]}

var client = aerospike.connect(config)



  var k1 = [
	 {ns:'test',set:'demo',value:"value"+1},
	 {ns:'test',set:'demo',value:'value'+2},
	 {ns:'test',set:'demo',value:'value'+3}] 

 //This function gets the complete record with all the bins.	
 client.batch_get(k1,function (err, rec_list){
	 if ( err.code != 0 ) {
        	console.log("error %s",err.message);
    	}
	console.log(rec_list);
});
	
