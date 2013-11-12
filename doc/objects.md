
	
	###Status
		The error codes returned by aerospike server is exposed to nodejs.
		Refer to status.md for all the error codes returned and explanations. 

	##Operators.
		WRITE
		READ
		INCR
		PREPEND
		APPEND
		TOUCH

## Error{}

    Error {
      code: Integer,
      message: String,
      file: String,
      line: Integer,
      func: String
    }

## Config{}

    Config {
      hosts: [ { addr: String, port: Integer } ]
    }

## Key{}

    Key {
      ns: String,
      set: String,
      value: Object,
      digest: Buffer
    }

## Metadata{}

    Metadata {
      ttl: Integer,
      gen: Integer,
    }


## Record{}

    Record {
      key: Key,
      metadata: Metadata,
      bins: [Object]
    }

##RecList[]

	RecList [
		{recstatus : Status,
		 record	  : Record}
	]

##OpList[]

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

		[link KeyPolicy](#KeyPolicy)
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
		### <a name="KeyPolicy"></a>KeyPolicy
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
