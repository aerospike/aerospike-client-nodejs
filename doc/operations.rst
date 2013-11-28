.. _operations:

Client Operations
+++++++++++++++++
* :js:func:`batch_get`
* :js:func:`connect`
* :js:func:`get`
* :js:func:`info`
* :js:func:`operate`
* :js:func:`put`
* :js:func:`remove`
* :js:func:`select`


Client Operations Reference
+++++++++++++++++++++++++++

.. js:function:: connect(Config)

   Connecting to Aerospike database Cluster

   :param Config: :js:data:`Config` object, containing an array of :js:data:`Host`

   :program:`Example`::

        //config object -- argument to the aerospike.connect() func call
        var config = {
              hosts:[{ addr:con.config.host,port : con.config.port }
         ]}
     
        // connecting to aerospike database. 
        var client = aerospike.connect(config);


.. js:function:: info( host, port, info_str,[infopolicy], callback)

   Access server's info monitoring protocol.
   The info protocol is a name/value pair based system, where an individual database server node is 
   queried to determine its configuration and status.

   The list of supported names can be found at:

   https://docs.aerospike.com/display/AS2/Config+Parameters+Reference 
   
   :param string host: server address 
   :param port port: server port
   :param str info_str: The query string.
   :param infopolicy: :data:`InfoPolicy`, policy to specify the behaviour of info call.
   :param callback: Gets called on completion of Info Call.
            Arguments to the callback is :js:data:`Error` and response string.

            * Error: Specifies the success or failure of the operation.
            * response: response string corresponding to the query string.

    :program:`Example`::

        client.info ( "127.0.0.1", 3000, "statistics", function( err, response) {
               console.log(response);
            });

.. js:function:: put(Key, Record, [WritePolicy], callback)

    Writing a record to the database.

   :param Key: :js:data:`Key` object, Key of the record to be written
   :param Record: :js:data:`Record` Object, Record containing the data to be written
   :param WritePolicy: :data:`WritePolicy` Object, The policy to use for this operation. 
                        If not passed as an argument, default write policy values are used
   :param callback:  Get's called on completion of Put operation.
            Arguments to the callback are :js:data:`Error`, :js:data:`Metadata` and :js:data:`Key`.

            * Error: Specifies the success or failure of the operation. 
            * Metadata: Metadata of the record written.
            * Key: Key of the record written to the database.

    :program:`Example`::

        var binlist = { 
            integerbin: 123,
            stringbin: "abc"
        }
        var meta = { 
            ttl : 1000,
            gen : 1
        }

        rec = { metadata: meta, bins : binlist }

        //Put operation without WritePolicy

        client.put({ns:"test", set:"demo", key:"a"}, rec, function(err) {
            if ( err.code == status.AEROSPIKE_OK) {
                // process result
            }
        })  

        //Put operation with WritePolicy

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

.. js:function:: get(Key, [ReadPolicy], callback)

    Reading a record from the database.

    :param Key: :js:data:`Key`, key of the record to be retrieved.
    :param ReadPolicy: :data:`ReadPolicy`, The policy to use for this operation. 
              If the arguments is not passed, ReadPolicy is set to default values.
    :param callback:
            Gets called after the completion of Get operation, with arguments, :js:data:`Error`,
            bins, :js:data:`Metadata` and :js:data:`Key`.
            
            * Error: Specifies the success or failure of the operation. 
            * bins is an instance of object, with bin name as attributes and bin values against those
              attributes.
            * Metadata: Metadata of the record retrieved.
            * Key: Key of the record retrieved from the database.

    :program:`Example`::

        //get operation without ReadPolicy

        client.get({ ns:"test", set: "demo", key:"a"}, function(err, bins) {
            if ( err.code == status.AEROSPIKE_OK) {
                // process result
            }
        })

        //get operation with ReadPolicy

        var readpolicy = { timeout : 10, Key : Policy.KeyPolicy.SEND }

        client.get({ ns:"test", set: "demo", key:"a"}, function(err, bins) {
            if ( err.code == status.AEROSPIKE_OK) {
                // process result
            }
        })

.. js:function:: batch_get( Key[],[BatchPolicy], callback)

   Getting a batch of records from the database using an array of keys.

   :param Key[]: Array of :js:data:`Key`\s. Set of keys, for which the records have to be retrieved.
   :param BatchPolicy: The policy to use for this operation.
   :param callback: 
            Gets called on completion of batch_get operation. Arguments to this callback are :js:data:`Error` 
            and :js:data:`RecList`\[].

            * Error     : Specifies the success or failure of the batch_get operation.
            * RecList[] : Array of :js:data:`RecList`. The list of records returned by the server, on successful 
                          completion of batch_get request.

    :program:`Example`::

        var KeyList = [
                {ns:'test', set : 'demo', key : 'value1'},
                {ns:'test', set : 'demo', key : 'value2'},
                .
                .
                {ns:'test', set : 'demo', key : 'valuei'},
                .
                .
                {ns:'test', set : 'demo', key : 'valuez'} ]

        // batch_get without BatchPolicy

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
    
        //batch_get with BatchPolicy

        var batchpolicy = { timeout : 10 }

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

.. js:function:: select(Key, binName, [ReadPolicy], callback)

    Retrieve a selected number of columns(bins) from the record.

    :param Key: instance of :js:data:`Key`. key of the record, whose columns are to be retrieved.
    :param string binName: Column name of all the columns whose values have to be retrieved.
    :param ReadPolicy: an instance of :js:data:`ReadPolicy`. The policy to use for this operation.
    :param callback:
            Gets called after the completion of select operation, with arguments, :js:data:`Error`,
            bins, :js:data:`Metadata` and :js:data:`Key`.
            
            * Error: Specifies the success or failure of the operation. 
            * bins is an instance of object, with bin name as attributes and bin values against those
              attributes.
            * Metadata: Metadata of the record retrieved.
            * Key: Key of the record retrieved from the database.

    :program:`Example`::

        var binNames : [ 'binName1', 'binName2' ]

        //Select operation without ReadPolicy

        client.select( {ns: 'test', set : 'demo', key : 'value' }, binNames, function (err, bins, meta, key) {
            if ( err.code == status.AEROSPIKE_OK) {
                // process result
            }
        });

        //Select Operation with ReadPolicy

        var readpolicy = { timeout : 10, Key : Policy.KeyPolicy.SEND }

        client.select( {ns: 'test', set : 'demo', key : 'value' }, binNames, readpolicy, function (err, bins, meta, key) {
            if ( err.code == status.AEROSPIKE_OK) {
                // process result
            }
        });

.. js:function:: remove(Key, [RemovePolicy], callback)

    Delete a record in the database using key.

    :param Key: an instance of :js:data:`Key`.  Key of the record to be deleted.
    :param RemovePolicy: an instance of :data:`RemovePolicy`. The policy to use for the operation.
    :param callback:
        Gets called after the completion of remove operation, with arguments, :js:data:`Error`
        and :js:data:`Key`.
            
        * Error: Specifies the success or failure of the operation. 
        * Key: Key of the record deleted from the database.

    :program:`Example`::

        var key = { ns : 'test', set : 'demo', key : 'value' }

        //Remove operation without RemovePolicy

        client.remove( key, function ( err, key) {
            if ( err.code == status.AEROSPIKE_OK) {
                // process result
            }
        });

        //Remove operation with RemovePolicy

        var removepolicy = { timeout : 10, 
                             Gen : Policy.GenerationPolicy.IGNORE,
                             Retry : Policy.RetryPolicy.ONCE,
                             Key : Policy.KeyPolicy.SEND }

        client.remove( key, removepolicy, function ( err, key) {
            if ( err.code == status.AEROSPIKE_OK) {
                // process result
            }
        });




.. js:function:: operate(Key,OpList[], [OperationPolicy], callback) 

    Perform multiple operations on a single record. 
    Following are the list of operations that can be performed on a single record,
    using operate function.

    *  Increment the integer bin value,
    *  Append some value to bin,
    *  Prepend some value to the bin,
    *  Write a bin value,
    *  Read some bin value

    Combination of any of the above operation can be performed using a single
    request to a database.

    :param Key: an instance of :js:data:`Key`. Key of the record on which the operations has to be performed.
    :param OpList[]: An array of :js:data:`OpList`. Set of operations to be performed on the record.
    :param callback:
            Gets called after the completion of select operation, with arguments, :js:data:`Error`,
            bins, :js:data:`Metadata` and :js:data:`Key`.
            
            * Error: Specifies the success or failure of the operation. 
            * bins is an instance of object, with bin name as attributes and bin values against those
              attributes.
            * Metadata: Metadata of the record retrieved.
            * Key: Key of the record retrieved from the database.
    
    :program:`Example`::

        var key = { ns: 'test', set:'demo', key : 'value' }

        var val_to_increment = 10;

        var str_to_append = 'append'

        var op_list = [ { operation : operations.INCR, binName : 'Integer_bin', binValue : val_to_increment },
                        { operation : operations.APPEND, binName : 'String_bin', binValue: str_to_append} ]

        //Operate without OperatePolicy

        client.operate( key, Op_list, function ( err, bins, meta, key ) {
            if ( err.code == status.AEROSPIKE_OK) {
                // process result
            }
        });
        
        //Operate with OperatePolicy

        var operatepolicy = { timeout : 10, 
                              Gen : Policy.GenerationPolicy.IGNORE,
                              Retry : Policy.RetryPolicy.ONCE,
                              Key : Policy.KeyPolicy.SEND }

        client.operate( key, Op_list, operatepolicy, function ( err, bins, meta, key ) {
            if ( err.code == status.AEROSPIKE_OK) {
                // process result
            }
        });

