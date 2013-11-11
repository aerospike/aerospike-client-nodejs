Status

AEROSPIKE_OK = 0
AEROSPIKE_ERR = 100
AEROSPIKE_ERR_CLIENT = 200
AEROSPIKE_ERR_PARAM = 201
AEROSPIKE_ERR_CLUSTER = 300
AEROSPIKE_ERR_TIMEOUT = 400
AEROSPIKE_ERR_THROTTLED = 401
AEROSPIKE_ERR_SERVER = 500
AEROSPIKE_ERR_REQUEST_INVALID = 501
AEROSPIKE_ERR_NAMESPACE_NOT_FOUND = 502
AEROSPIKE_ERR_SERVER_FULL = 503
AEROSPIKE_ERR_CLUSTER_CHANGE = 504
AEROSPIKE_ERR_RECORD = 600
AEROSPIKE_ERR_RECORD_BUSY = 601
AEROSPIKE_ERR_RECORD_NOT_FOUND = 602
AEROSPIKE_ERR_RECORD_EXISTS = 603
AEROSPIKE_ERR_RECORD_GENERATION = 604
AEROSPIKE_ERR_RECORD_TOO_BIG = 605
AEROSPIKE_ERR_BIN_INCOMPATIBLE_TYPE = 606


Status Documentation

AEROSPIKE_OK								Generic success.

AEROSPIKE_ERR								Generic error.

AEROSPIKE_ERR_CLIENT						Generic client API usage error.

AEROSPIKE_ERR_PARAM							Invalid client API parameter.

AEROSPIKE_ERR_CLUSTER						Generic cluster discovery & connection error.

AEROSPIKE_ERR_TIMEOUT						Request timed out. 

AEROSPIKE_ERR_THROTTLED						Request randomly dropped by client for throttling.
											Warning -- Not yet supported. 
AEROSPIKE_ERR_SERVER						Generic error returned by server.

AEROSPIKE_ERR_REQUEST_INVALID				Request protocol invalid, or invalid protocol field.

AEROSPIKE_ERR_NAMESPACE_NOT_FOUND			Namespace in request not found on server.
											Warning -- Not yet supported, shows as AEROSPIKE_ERR_REQUEST_INVALID.

AEROSPIKE_ERR_SERVER_FULL					The server node is running out of memory and/or storage device space 
											reserved for the specified namespace. 

AEROSPIKE_ERR_CLUSTER_CHANGE				A cluster state change occurred during the request. 

AEROSPIKE_ERR_RECORD						Generic record error.

AEROSPIKE_ERR_RECORD_BUSY					Too may concurrent requests for one record - a "hot-key" situation.

AEROSPIKE_ERR_RECORD_NOT_FOUND				Record does not exist in database. May be returned by read, or 
											write with Policy.Exists.UPDATE.
											Warning -- Policy.Exists.UPDATE not yet supported

AEROSPIKE_ERR_RECORD_EXISTS					Record already exists. May be returned by write with Policy.Exists.CREATE.

AEROSPIKE_ERR_RECORD_GENERATION				Generation of record in database does not satisfy write policy.

AEROSPIKE_ERR_RECORD_TOO_BIG				Record being (re-)written cant fit in a storage write block.

AEROSPIKE_ERR_BIN_INCOMPATIBLE_TYPE			Bin modification operation cant be done on an existing bin due to its value type. 
