.. _objects:

*****************************
Aerospike Datastructures
*****************************
.. js:data:: Config

   Config is an object with attribute hosts

   .. attribute:: hosts

      an instance of array of :js:data:`Host` [Host]

.. js:data:: Host
    
    Host is an object with attributes addr and port

    .. attribute:: addr

        string datatype, address of the aerospike host.

    .. attribute:: port

       Integer datatype, port of the aerospike host

.. js:data:: Error

    Error is an object with attributes code, file, func, line

    .. attribute:: code

        is a constant of type :js:data:`Status`, it is the return status of any database
        operation

    .. attribute:: file

       string datatype.
       if code is not :attr:`AEROSPIKE_OK`, this field is populated. 
       The file in which the error occured

    .. attribute:: func

       string datatype.
       if code is not :attr:`AEROSPIKE_OK`, this field is populated. 
       The function in which the error occured
       
    .. attribute:: line

       integer datatype
       if code is not :attr:`AEROSPIKE_OK`, this field is populated. 
       The line number in which the error occured


.. js:data:: Key

    Key is an object with attributes ns,set and key.

    .. attribute:: ns

        string datatype, refers to namespace to which the key belongs to
 
    .. attribute:: set

        string, refers to set to which the key belongs to

    .. attribute:: key

        could be of type string,integer and Buffer, it contains value of the key 

.. js:data:: Metadata

    Metadata is an object with attributes ttl,gen

    .. attribute:: ttl

        Integer datatype, specifies the time to live, for a record
    
    .. attribute:: gen

        Integer datatype, specifies the generation of the record


.. js:data:: Record
    
    Record is an object with attributes key, metadata and bins 

    .. attribute:: key
        
        key is an instance of :js:data:`Key` 

    .. attribute:: metadata

       metadata is an instance of :js:data:`Metadata`

    .. attribute:: bins

       bins is an instance of object

.. js:data:: RecList

    Instance of an Object datatype, whose attributes are recstatus and record

    .. attribute:: recstatus

       is an instance of :js:data:`Status`. 
       
    .. attribute:: record

       is an instance of :js:data:`Record`. 
       record attribute in RecList, is undefined if recstatus is not :attr:`AEROSPIKE_OK`
       used in batch_get operation, which returns a list of record

.. js:data:: OpList

   Instance of an object, whose attributes are operation, binname, binvalue

    .. attribute:: operation.

      is an instance of :js:data:`Operators`, to specify the type of operation.

    .. attribute:: binname

      string datatype, name of the bin in the record, on which the operation has to be 
      performed

    .. attribute:: binvalue

       instance of an [string|integer|Buffer]. Value to be updated on the bin, by performing 
       the above operation.

.. js:data:: Status

    Error codes returned by the aerospike server for all the database operations

    .. attribute:: AEROSPIKE_OK = 0

        Generic Success.

    .. attribute:: AEROSPIKE_ERR = 100

        Generic Error.

    .. attribute:: AEROSPIKE_ERR_CLIENT = 200

        Generic client API usage error.

    .. attribute:: AEROSPIKE_ERR_PARAM = 201 

        Invalid client API parameter.

    .. attribute:: AEROSPIKE_ERR_CLUSTER = 300 

        Generic cluster discovery & connection error.

    .. attribute:: AEROSPIKE_ERR_TIMEOUT = 400 

       Request timed out.

    .. attribute:: AEROSPIKE_ERR_THROTTLED = 401 

       Request randomly dropped by client for throttling.
       Warning -- Not yet supported.

    .. attribute:: AEROSPIKE_ERR_SERVER = 500 

       Generic error returned by server.

    .. attribute:: AEROSPIKE_ERR_REQUEST_INVALID = 501 

       Request protocol invalid, or invalid protocol field.

    .. attribute:: AEROSPIKE_ERR_NAMESPACE_NOT_FOUND = 502 

        Namespace in request not found on server.
        Warning -- Not yet supported, shows as :attr:`AEROSPIKE_ERR_REQUEST_INVALID`.

    .. attribute:: AEROSPIKE_ERR_SERVER_FULL = 503 
        
        The server node is running out of memory and/or storage device space
        reserved for the specified namespace.

    .. attribute:: AEROSPIKE_ERR_CLUSTER_CHANGE = 504 

         A cluster state change occurred during the request.

    .. attribute:: AEROSPIKE_ERR_RECORD = 600 

        Generic record error.

    .. attribute:: AEROSPIKE_ERR_RECORD_BUSY = 601 

         Too may concurrent requests for one record - a "hot-key" situation.

    .. attribute:: AEROSPIKE_ERR_RECORD_NOT_FOUND = 602 

        Record does not exist in database. May be returned by read, or write with policy Exists.UPDATE
        Warning Exists.UPDATE not yet supported.

    .. attribute:: AEROSPIKE_ERR_RECORD_EXISTS = 603 

        Record already exists. May be returned by write with policy Exists.CREATE. 

    .. attribute:: AEROSPIKE_ERR_RECORD_GENERATION = 604 

        Generation of record in database does not satisfy write policy

    .. attribute:: AEROSPIKE_ERR_RECORD_TOO_BIG = 605 

        Record being (re-)written can't fit in a storage write block

    .. attribute:: AEROSPIKE_ERR_BIN_INCOMPATIBLE_TYPE = 606 

       Bin modification operation can't be done on an existing bin due to its value type

.. js:data:: Operators

    list of operations that can be performed by invoking :js:func:`operate` call to 
    to aerospike server.

    .. attribute:: WRITE

       To write a bin in the record.

    .. attribute:: READ

       To read a bin in the record 

    .. attribute:: INCR

       To increment the given value to a bin, whose type is integer.

    .. attribute:: PREPEND

       To prepend the given string to a bin, whose type is string.

    .. attribute:: APPEND

       To append the given string to a bin, whose type is string.

    .. attribute:: TOUCH

       To increase the ttl(time to live)  of the record.

.. js:data:: Policy

    Policies define the behavior of database operations.
    Policies fall into two groups: policy values and operation policies. 
    A policy value is a single value which defines how the client behaves. 
    An operation policy is a group of policy values which affect an operation.

    :program:`Policy Values`
    

        The following are the policy values
    
        .. data:: KeyPolicy
    
            .. attribute:: UNDEF
    
                The policy is undefined
    
            .. attribute:: DIGEST

                Send the digest value of the key.
                This is the recommended mode of operation. 
                This calculates the digest and send the digest to the server. The digest is only calculated on the client, and not on the server. 
    
            .. attribute:: KEY

                Send the key, but do not store it.
                This policy is ideal if you want to reduce the number of bytes sent over the network. 
                This will only work if the combination the set and key value are less than 20 bytes, which is the size of the digest.
                This will also cause the digest to be computer once on the client and once on the server.
                If your values are not less than 20 bytes, then you should just use Policy.Key.DIGEST

        .. data:: RetryPolicy

            .. attribute:: UNDEF
        
                The policy is undefined

            .. attribute:: NONE

                Only attempt an operation once

            .. attribute:: ONCE

                If an operation fails, attempt the operation one more time

        .. data:: GenerationPolicy

            .. attribute:: UNDEF

                The policy is undefined

            .. attribute:: IGNORE

                Write a record, regardless of generation

            .. attribute:: EQ

                Write a record, ONLY if generations are equal 

            .. attribute:: GT

                Write a record, ONLY if local generation is greater-than remote generation

            .. attribute:: DUP

                Write a record creating a duplicate, ONLY if the generation collides

        .. data:: ExistsPolicy

            .. attribute:: UNDEF

                The policy is undefined

            .. attribute:: IGNORE

                Write the record, regardless of existence

            .. attribute:: CREATE

                Create a record, ONLY if it doesn't exist

            .. attribute:: UPDATE

                Update a record, ONLY if it exists

                Warning : Not yet implemented

        :program:`Operation Policies`

            Operation policies are groups of policy values for a type of operation.
            The following are the operation policies.

            .. data:: BatchPolicy

                .. attribute:: timeout

                    Integer datatype.
                    Maximum time in milliseconds to wait for the operation to complete.
                    If 0 (zero),  then the value will default to global default timeout value

            .. data:: InfoPolicy

                .. attribute:: checkbounds

                    Boolean datatype
                    Ensure the request is within allowable size limits

                .. attribute:: send_as_is

                    Boolean datatype.
                    Send request without any further processing

                .. attribute:: timeout
   
                    Integer datatype.
                    Maximum time in milliseconds to wait for the operation to complete.
                    If 0 (zero), then the value will default to global default timeout value

            .. data:: OperatePolicy

                .. attribute:: key

                    an instance of :data:`KeyPolicy`
                    Specifies the behavior for the key. 

                .. attribute:: gen

                   an instance of :data:`GenerationPolicy`
                   Specifies the behavior for the generation value

                .. attribute:: retry

                   an instance of :data:`RetryPolicy`
                   Specifies the behavior for failed operations.

            .. data:: ReadPolicy

                .. attribute:: key

                    an instance of :data:`KeyPolicy`
                    Specifies the behavior for the key. 

                .. attribute:: timeout

                    Integer datatype.
                    Maximum time in milliseconds to wait for the operation to complete.
                    If 0 (zero), then the value will default to global default timeout value

            .. data:: RemovePolicy

                .. attribute:: gen

                    an instance of :data:`GenerationPolicy`
                    Specifies the behavior for the generation value

                .. attribute:: generation

                    Integer datatype.
                    The generation of the record

                .. attribute:: key

                    an instance of :data:`KeyPolicy`
                    Specifies the behavior for the key. 

                .. attribute:: retry

                    an instance of :data:`RetryPolicy`
                    Specifies the behavior of failed operations

            .. data:: WritePolicy

                .. attribute:: gen

                    an instance of :data:`GenerationPolicy`
                    Specifies the behaviour for the generation value

                .. attribute:: exists

                    an instance of :data:`ExistsPolicy`
                    Specifies the behavior for the existence of the record

                .. attribute:: key

                    an instance of :data:`KeyPolicy`
                    Specifies the behavior for the key. 

                .. attribute:: retry

                    an instance of :data:`RetryPolicy`
                    Specifies the behavior of failed operations
                
                .. attribute:: timeout

                    Integer datatype.
                    Maximum time in milliseconds to wait for the operation to complete.
                    If 0 (zero), then the value will default to global default values.

