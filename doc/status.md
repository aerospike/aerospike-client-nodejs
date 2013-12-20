# Status

Error codes returned by the aerospike server for all the database operations

- `AEROSPIKE_OK`                        – (0) Generic Success.
- `AEROSPIKE_ERR`                       – (100) Generic Error.
- `AEROSPIKE_ERR_CLIENT`                – (200) Generic client API usage error.
- `AEROSPIKE_ERR_PARAM`                 – (201) Invalid client API parameter.
- `AEROSPIKE_ERR_CLUSTER`               – (300) Generic cluster discovery & connection error.
- `AEROSPIKE_ERR_TIMEOUT`               – (400) Request timed out.
- `AEROSPIKE_ERR_SERVER`                – (500) Generic error returned by server.
- `AEROSPIKE_ERR_REQUEST_INVALID`       – (501) Request protocol invalid, or invalid protocol field.
- `AEROSPIKE_ERR_NAMESPACE_NOT_FOUND`   – (502) Namespace in request not found on server.
- `AEROSPIKE_ERR_SERVER_FULL`           – (503) The server node is running out of memory and/or storage device space reserved for the specified namespace.
- `AEROSPIKE_ERR_CLUSTER_CHANGE`        – (504) A cluster state change occurred during the request.
- `AEROSPIKE_ERR_RECORD`                – (600) Generic record error.
- `AEROSPIKE_ERR_RECORD_BUSY`           – (601) Too may concurrent requests for one record - a "hot-key" situation.
- `AEROSPIKE_ERR_RECORD_NOT_FOUND`      – (602) Record does not exist in database. May be returned by read, or write with policy Exists.UPDATE Warning Exists.UPDATE not yet supported.
- `AEROSPIKE_ERR_RECORD_EXISTS`         – (603) Record already exists. May be returned by write with policy `Exists.CREATE`. 
- `AEROSPIKE_ERR_RECORD_GENERATION`     – (604) Generation of record in database does not satisfy write policy
- `AEROSPIKE_ERR_RECORD_TOO_BIG`        – (605) Record being (re-)written can't fit in a storage write block
- `AEROSPIKE_ERR_BIN_INCOMPATIBLE_TYPE` – (606) Bin modification operation can't be done on an existing bin due to its value type




