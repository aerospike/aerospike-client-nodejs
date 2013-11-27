.. Aerospike Node.js Documentation documentation master file, created by
   sphinx-quickstart on Fri Nov 15 16:45:46 2013.
   You can adapt this file completely to your liking, but it should at least
   contain the root `toctree` directive.

Introduction
------------

This package describes the Aerospike Node.js Client API in detail. 

Including Aerospike node_module 
++++++++++++++++++++++++++++++++
::    
    
    var aerospike = require('aerospike');

The aerospike module is used to connect to Aerospike database cluster.

Including all the constants from Aeropsike module
+++++++++++++++++++++++++++++++++++++++++++++++++
::
    
    var status = aerospike.Status;
    var policy = aerospike.Policy;
    var operations = aerospike.Operators;

These constants are used in various Client operations

Connecting to Aerospike Server
++++++++++++++++++++++++++++++
::
    
    var config = {
            hosts:[{ addr:`server_host`,port : `server_port` }
                ]}
    var client = aerospike.connect(config);

The connect function returns a client object. This object is used to access an 
Aerospike database cluster and perform database operations.One client instance should 
be used per cluster. 

The application uses this object to perform database operations 
such as writing and reading records, and selecting sets of records. Write operations 
include specialized functionality such as append/prepend and arithmetic addition.

Each record may have multiple bins, unless the Aerospike server nodes are configured 
as "single-bin". In "multi-bin" mode, partial records may be written or read by 
specifying the relevant subset of bins.

Modules
+++++++
.. toctree::

    objects.rst
    operations.rst


Indices and tables
------------------

* :ref:`genindex`
* :ref:`search`

