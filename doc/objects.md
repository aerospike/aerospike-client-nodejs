###Objects

####Connecting to Aerospike Database
#####[Config](#confheader)
#####[Host](#hostheader)

####Error
#####[Error](#errheader)

####Related to Database operations
#####[Key](#keyheader)
#####[Metadata](#metaheader)
#####[OpList](#oplistheader)
#####[Record](#recordheader)
#####[RecList](#reclistheader)


####<a name="confheader"></a>Config{}
>Config {
	[\[Host\]](#hostheader)
}

####<a name="hostheader"></a>Host{}
>Host{
	addr:String,
	port:Integer
}

####<a name="errheader"></a>Error{}
>Error {
      code: [Status](#statusheader),
      message: String,
      file: String,
      line: Integer,
      func: String
    }

####<a name="keyheader"></a> Key{}
>Key {
      ns: String,
      set: String,
      value: Object,
      digest: Buffer
    }

####<a name="metaheader"></a>Metadata{}

>Metadata {
      ttl: Integer,
      gen: Integer,
    }


####<a name="recordheader"></a>Record{}

>Record {
      key:[Key](#keyheader),
      metadata:[Metadata](#metaheader),
      bins: [Object]
    }

####<a name="reclistheader"></a>RecList[]

>RecList [
		{recstatus :[Status](#statusheader),
		 record	  :[Record](#recordheader)}
	]

####<a name="oplistheader"></a>OpList[]

>OpList [
		{operation :[Operators](#opheader),
		 binname   : String,
		 binvalue  : Object}
	]

###Objects Documentation
> TO DO write explanation for each field in each of the record

##Client Policies.
>Policies define the behavior of database operations.
	Policies fall into two groups: policy values and operation policies. 
	A policy value is a single value which defines how the client behaves. 
	An operation policy is a group of policy values which affect an operation.


####Policy Values
>Policy Values are constants.
	The following are the policy values

#####[KeyPolicy](#kpolicyheader)
#####[RetryPolicy](#retpolicyheader)
#####[GenerationPolicy](#genpolicyheader)
#####[ExistsPolicy](#expolicyheader)

####Operation Policies
>The following are the operation policies

#####[BatchPolicy](#bpolicyheader)
#####[InfoPolicy](#ipolicyheader)
#####[OperatePolicy](#opolicyheader)
#####[ReadPolicy](#rpolicyheader)
#####[RemovePolicy](#rempolicyheader)
#####[WritePolicy](#wpolicyheader)


#####<a name="bpolicyheader"></a>BatchPolicy{}

>BatchPolicy {
		timeout: Integer
	}

####<a name="ipolicyheader"></a>InfoPolicy{}

>InfoPolicy{
		timeout	: Integer,
		send_as_is : Boolean,
		check_bounds : Boolean
	}
	
####<a name="policyheader"></a>WritePolicy{}
 
>WritePolicy {
		timeout : Integer,
		Retry	: [RetryPolicy](#retpolicyheader),
		Key		: [KeyPolicy](#keypolicyheader),
		Gen		: [GenerationPolicy](#genpolicyheader),
		Exists	: [ExistsPolicy](#expolicyheader)
	}

####<a name="rpolicyheader"></a>ReadPolicy{}

>ReadPolicy {
		timeout : Integer,
		Key		: [KeyPolicy](#keypolicyheader)
	}

####<a name="opolicyheader"></a>OperatePolicy{}

>OperatePolicy {
		timeout : Integer,
		Gen		: [GenerationPolicy](#genpolicyheader),
		Key		: [KeyPolicy](#keypolicyheader),
		Retry	: [RetryPolicy](#retpolicyheader)
	}

####<a name="rempolicyheader"></a>RemovePolicy{}
	
>RemovePolicy {
		timeout : Integer,
		gen		: Integer,
		Retry	: [RetryPolicy](#retpolicyheader),
		Key		: [KeyPolicy](#keypolicyheader)
	}

#####<a name="keypolicyheader"></a>KeyPolicy
		UNDEF
		DIGEST
		KEY

#####<a name="retpolicyheader"></a>RetryPolicy
		UNDEF
		NONE
		ONCE

#####<a name="gempolicyheader"></a>GenerationPolicy
		UNDEF
		IGNORE
		EQ  
		GT  
		DUP 

#####<a name="expolicyheader"></a>ExistsPolicy
		UNDEF
		IGNORE
		CREATE
		UPDATE

###Client Policies Documentation
> TO DO write explanation for each field in the polices

###Error Codes Returned by Aerospike Server.
####<a name="statusheader"></a>Status
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

####Status Documentation
>AEROSPIKE_OK                               Generic success.
AEROSPIKE_ERR                               Generic error.
AEROSPIKE_ERR_CLIENT                        Generic client API usage error.
AEROSPIKE_ERR_PARAM                         Invalid client API parameter.
AEROSPIKE_ERR_CLUSTER                       Generic cluster discovery & connection error.
AEROSPIKE_ERR_TIMEOUT                       Request timed out.
AEROSPIKE_ERR_THROTTLED                     Request randomly dropped by client for throttling.
											Warning -- Not yet supported.
AEROSPIKE_ERR_SERVER                        Generic error returned by server.
AEROSPIKE_ERR_REQUEST_INVALID               Request protocol invalid, or invalid protocol field.
AEROSPIKE_ERR_NAMESPACE_NOT_FOUND           Namespace in request not found on server.
										    Warning -- Not yet supported, shows as AEROSPIKE_ERR_REQUEST_INVALID.
AEROSPIKE_ERR_SERVER_FULL                   The server node is running out of memory and/or storage device space
											reserved for the specified namespace.
AEROSPIKE_ERR_CLUSTER_CHANGE                A cluster state change occurred during the request.
AEROSPIKE_ERR_RECORD                        Generic record error.
AEROSPIKE_ERR_RECORD_BUSY                   Too may concurrent requests for one record - a "hot-key" situation.


####<a name="opheader"></a>Operators.
	WRITE
	READ
	INCR
	PREPEND
	APPEND
	TOUCH
####Operators Documentation
>TO DO write explanation for each field in the operator
