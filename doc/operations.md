#Importing aerospike module to node application

	var aerospike = require('aerospike')

#Connecting to Aerospike Cluster.

	var  config = { hosts : [ {addr: "127.0.0.1", port : 3000 } ] }

	var client = aerospike.connect(config)

#Importing various EnumObjects used in client operations,
 to node application

	1. The error codes returned by the aerospike server
		var status = aerospike.Status
	##Example
		status.AEROSPIKE_OK. 
	
	2. All kinds Policies used for client operation
		var Policy = aerospike.Policy 
	##Example
		Policy.Key.SEND.
	
	3.All kinds of operators provided by Aerospike API, for
	  operate functionality
		var operations = aerospike.Operators
	##Example
		operations.INCR
	


# Client Operations

## get()

Get a record from the database via a key.

	client.get(Key, ReadPolicy?, function(Error, Bins, Metadata, Key))
	ReadPolicy is an optional parameter here

#### Example

	get operation without ReadPolicy

	client.get({ ns:"test", set: "demo", key:"a"}, function(err, bins) {
		if ( err.code == status.AEROSPIKE_OK) {
			// process result
		}
	})

	get operation with ReadPolicy

	var readpolicy = { timeout : 10, Key : Policy.KeyPolicy.SEND }a


	client.get({ ns:"test", set: "demo", key:"a"}, function(err, bins) {
		if ( err.code == status.AEROSPIKE_OK) {
			// process result
		}
	})

## put()

Put a record into the database via key.

	client.put(Key, Record, WritePolicy?, function(Error, Metadata, Key))
	WritePolicy is an optional parameter

Example:

	var binlist = {
		a: 123,
		b: "abc"
	}

	var meta = {
		ttl : 1000,
		gen : 1
	}
	
	rec = { metadata: meta, bins : binlist }

	Put operation without WritePolicy

	client.put({ns:"test", set:"demo", key:"a"}, rec, function(err) {
		if ( err.code == status.AEROSPIKE_OK) {
			// process result
		}
	})

	Put operation with WritePolicy

	var writepolicy = { timeout : 10, 
						  Gen : Policy.GenerationPolicy.IGNORE,
						  Retry : Policy.RetryPolicy.ONCE,
						  Key : Policy.KeyPolicy.SEND,
						  Exists: Policy.ExistsPolicy.IGNORE}

	client.put({ns: "test", set: "demo", key : "a"}, rec, writepolicy, function(err) {
		if ( err.code == status.AEROSPIKE_OK) {
			// process result
		}
	})

## Get a batch of records from the database using an array of keys

	client.batch_get( [Key], ReadPolicy?, function(Error, RecList))
	ReadPolicy is an optional parameter

Example:

	var KeyList = [
		{ns:'test', set : 'demo', key : 'value1'},
		{ns:'test', set : 'demo', key : 'value2'},
		.
		.
		{ns:'test', set : 'demo', key : 'valuei'},
		.
		.
		{ns:'test', set : 'demo', key : 'valuez'} ]


	batch_get without ReadPolicy

	client.batch_get(KeyList, function(err, reclist) {
		if ( err.code == status.AEROSPIKE_OK) {	
		// err.code signifies the success or failure of a single batch operation.
			for ( var i = 0; i < reclist.length; i++ )
			{
				if ( reclist[i].recstatus == status.AEROSPIKE_OK)
				// reclist[i].recstatus signifies the success or failure of the retrieval of
				// record[i] in the batch operation
				// process result
			}
		}
	})

	batch_get with ReadPolicy

	var readpolicy = { timeout : 10, Key : Policy.KeyPolicy.SEND }a


	client.batch_get(KeyList, readpolicy, function(err, reclist) {
		if ( err.code == status.AEROSPIKE_OK) {	
		// err.code signifies the success or failure of a single batch operation.
			for ( var i = 0; i < reclist.length; i++ )
			{
				if ( reclist[i].recstatus == status.AEROSPIKE_OK)
				// reclist[i].recstatus signifies the success or failure of the retrieval of
				// record[i] in the batch operation
				// process result
			}
		}
	})

##Retrieve a selected number of columns (bins) from a record, using the key.

	client.select( Key, binNames, ReadPolicy?, function (Error, bins, Metadata, Key))
	ReadPolicy is an optional parameter

Example:

	var binNames : [ 'binName1', 'binName2' ]

	Select operation without ReadPolicy

	client.select( {ns: 'test', set : 'demo', key : 'value' }, binNames,  
					function (err, bins, meta, key) {
		if ( err.code == status.AEROSPIKE_OK) {
			// process result
		}
	});

	Select Operation with ReadPolicy

	var readpolicy = { timeout : 10, Key : Policy.KeyPolicy.SEND }

	client.select( {ns: 'test', set : 'demo', key : 'value' }, binNames, readpolicy, 
					function (err, bins, meta, key) {
		if ( err.code == status.AEROSPIKE_OK) {
			// process result
		}
	});

## Delete a record in the database using the key

	client.remove( Key, RemovePolicy?, function ( Error, Key))
	RemovePolicy is an optional parameter

Example:
	
	var key = { ns : 'test', set : 'demo', key : 'value' }

	Remove operation without RemovePolicy

	client.remove( key, function ( err, key) {
		if ( err.code == status.AEROSPIKE_OK) {
			// process result
		}
	});

	Remove operation with RemovePolicy

	var removepolicy = { timeout : 10, 
						  Gen : Policy.GenerationPolicy.IGNORE,
						  Retry : Policy.RetryPolicy.ONCE,
						  Key : Policy.KeyPolicy.SEND }

	client.remove( key, removepolicy, function ( err, key) {
		if ( err.code == status.AEROSPIKE_OK) {
			// process result
		}
	});


##Perform multiple operations on a single record

  Increment the integer bin value,
  Append some value to bin,
  Prepend some value to the bin, 
  Write a bin value,
  Read some bin value
  Combination of any of the above operation can be performed using a single 
  request to a database.

	client.operate ( Key, OpList, OperatePolicy?, function (Error, bins, Metadata, Key))
	OperatePolicy is an optional parameter

Example:
	
	var key = { ns: 'test', set:'demo', key : 'value' }
	var val_to_increment = 10;
	var str_to_append = 'append'
	var op_list = [ { operation : operations.INCR, binName : 'Integer_bin', binValue : val_to_increment },
					{ operation : operations.APPEND, binName : 'String_bin', binValue: str_to_append} ]

	Operate without OperatePolicy

	client.operate( key, Op_list, function ( err, bins, meta, key ) {
		if ( err.code == status.AEROSPIKE_OK) {
			// process result
		}
	});

	Operate with OperatePolicy

	var operatepolicy = { timeout : 10, 
						  Gen : Policy.GenerationPolicy.IGNORE,
						  Retry : Policy.RetryPolicy.ONCE,
						  Key : Policy.KeyPolicy.SEND }

	client.operate( key, Op_list, operatepolicy, function ( err, bins, meta, key ) {
		if ( err.code == status.AEROSPIKE_OK) {
			// process result
		}
	});
