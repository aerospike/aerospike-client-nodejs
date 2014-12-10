# Status

Error codes returned by the aerospike server for all the database operations. 

An enumeration of the status codes are available in `aerospike.status` object, which can be accessed as follows:

```js
var aerospike = require('aerospike');

aerospike.status.AEROSPIKE_OK
```


#### 0 - AEROSPIKE_OK

The operation was successful.

#### 100 - AEROSPIKE_ERR

Generic error code.

#### 200 - AEROSPIKE_ERR_CLIENT

Generic client API usage error.

#### 201 - AEROSPIKE_ERR_PARAM

Invalid client API parameter.

#### 300 - AEROSPIKE_ERR_CLUSTER

Generic cluster discovery & connection error.

#### 400 - AEROSPIKE_ERR_TIMEOUT

Request timed out.

#### 500 - AEROSPIKE_ERR_SERVER

Generic error returned by server.

#### 501 - AEROSPIKE_ERR_REQUEST_INVALID

Request protocol invalid, or invalid protocol field.

#### 501 - AEROSPIKE_ERR_NAMESPACE_NOT_FOUND

Namespace in request not found on server.

#### 503 - AEROSPIKE_ERR_SERVER_FULL

The server node is running out of memory and/or storage device space reserved for the specified namespace.

#### 504 - AEROSPIKE_ERR_CLUSTER_CHANGE

A cluster state change occurred during the request.

#### 600 - AEROSPIKE_ERR_RECORD

Generic record error.

#### 601 - AEROSPIKE_ERR_RECORD_BUSY

Too may concurrent requests for one record - a "hot-key" situation.

#### 602 - AEROSPIKE_ERR_RECORD_NOT_FOUND

Record does not exist in database. May be returned by read, or write with policy Exists.

#### 603 - AEROSPIKE_ERR_RECORD_EXISTS

Record already exists. May be returned by write with policy `Exists.CREATE`. 

#### 604 - AEROSPIKE_ERR_RECORD_GENERATION

Generation of record in database does not satisfy write policy

#### 605 - AEROSPIKE_ERR_RECORD_TOO_BIG

Record being written can't fit in a storage write block

#### 606 - AEROSPIKE_ERR_BIN_INCOMPATIBLE_TYPE

Bin modification operation can't be done on an existing bin due to its value type


