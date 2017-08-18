**This document covers the 1.x version of the Aerospike Node.js client. For newer
client versions, please refer to the API documentation available at
[http://www.aerospike.com/apidocs/nodejs/](http://www.aerospike.com/apidocs/nodejs/).**

----------

#scanProperties

##scanStatus

Status of a particular background scan.

An enumeration of the scan status codes are available in `aerospike.scanStatus` object, which can be accessed as follows:

```js
var aerospike = require('aerospike')

aerospike.scanStatus.INPROGESS
```


#####  0 - UNDEF

#####  1 - INPROGRESS

#####  2 - ABORTED

#####  3 - COMPLETED

##scanPriority

Priority levels for a given scan operation.

An enumeration of the scan priority available in `aerospike.scanPriority` object, which can be accessed as follows:

```js
var aerospike = require('aerospike')

aerospike.scanPriority.HIGH
```


#####  0 - AUTO

#####  1 - LOW

#####  2 - MEDIUM

#####  3 - HIGH

