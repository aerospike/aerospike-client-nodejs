###Objects

####Connecting to Aerospike Database
#####[Config](#confheader)
#####[Host](#hostheader)

###Error
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
			UNDEF
			NONE
			ONCE
#####[GenerationPolicy](#genpolicyheader)
			UNDEF
			IGNORE
			EQ  
			GT  
			DUP 
#####[ExistsPolicy](#expolicyheader)
			UNDEF
			IGNORE
			CREATE
			UPDATE
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
			SEND
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


##Status
>The error codes returned by aerospike server is exposed to nodejs.
Refer to status.md for all the error codes returned and explanations. 

##Operators.
	WRITE
	READ
	INCR
	PREPEND
	APPEND
	TOUCH
