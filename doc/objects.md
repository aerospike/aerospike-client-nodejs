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

####Defining policies for various database operations
#####[BatchPolicy](#bpolicyheader)
#####[InfoPolicy](#ipolicyheader)
#####[OperatePolicy](#opolicyheader)
#####[ReadPolicy](#rpolicyheader)
#####[RemovePolicy](#rempolicyheader)
#####[WritePolicy](#wpolicyheader)

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

    Record {
      key: Key,
      metadata: Metadata,
      bins: [Object]
    }

####<a name="reclistheader"></a>RecList[]

	RecList [
		{recstatus : Status,
		 record	  : Record}
	]

####<a name="oplistheader"></a>OpList[]

	OpList [
		{operation : Operators,
		 binname   : String,
		 binvalue  : Object}
	]


##Client Policies.
	Policies define the behavior of database operations.
	Policies fall into two groups: policy values and operation policies. 
	A policy value is a single value which defines how the client behaves. 
	An operation policy is a group of policy values which affect an operation.


	1.Policy Values
		Policy Values are constants.
		The following are the policy values

		[link KeyPolicy]KeyPolicy
		2. RetryPolicy
			UNDEF
			NONE
			ONCE
		3. GenerationPolicy
			UNDEF
			IGNORE
			EQ  
			GT  
			DUP 
		4. ExistsPolicy
			UNDEF
			IGNORE
			CREATE
			UPDATE
	2.Operation Policies
		The following are the operation policies

			BatchPolicy
			InfoPolicy
			OperatePolicy
			ReadPolicy
			RemovePolicy
			WritePolicy

#DataStructures
	##BatchPolicy{}

	BatchPolicy {
		timeout: Integer
	}

	##InfoPolicy{}

	InfoPolicy{
		timeout	: Integer,
		send_as_is : Boolean,
		check_bounds : Boolean
	}
	
	##WritePolicy{}
 
	WritePolicy {
		timeout : Integer,
		Retry	: RetryPolicy,
		Key		: KeyPolicy,
		Gen		: GenerationPolicy,
		Exists	: ExistsPolicy
	}

	##ReadPolicy{}
	
	ReadPolicy {
		timeout : Integer,
		Key		: keyPolicy,
	}

	##OperatePolicy{}

	OperatePolicy {
		timeout : Integer,
		Gen		: GenerationPolicy,
		Key		: KeyPolicy,
		Retry	: RetryPolicy
	}

	##RemovePolicy{}
	
	RemovePolicy {
		timeout : Integer,
		gen		: Integer,
		Retry	: RetryPolicy,
		Key		: KeyPolicy
	}

#Constants
		##KeyPolicy
			UNDEF
			DIGEST
			SEND
		2. RetryPolicy
			UNDEF
			NONE
			ONCE
		3. GenerationPolicy
			UNDEF
			IGNORE
			EQ  
			GT  
			DUP 
		4. ExistsPolicy
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
