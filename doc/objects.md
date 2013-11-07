# Objects
	1. EnumObjects
	2. MapObjects

##ENUMOBJECTS
	
	###Status Enum
		All Error Codes in C. 
		Point to C Error codes link
	
	###Policy.
		1. KeyPolicy 
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

	##Operators.
		WRITE
		READ
		INCR
		PREPEND
		APPEND
		TOUCH

2.MapObjects

## Error

    Error := {
      code: Integer,
      message: String,
      file: String,
      line: Integer,
      func: String
    }

## Config

    Config := {
      hosts: [ { addr: String, port: Integer } ]
    }

## Key

    Key := {
      ns: String,
      set: String,
      value: Object,
      digest: Buffer
    }

## Metadata

    Metadata := {
      ttl: Integer,
      gen: Integer,
    }


## Record

    Record := {
      key: Key,
      metadata: Metadata,
      bins: {
        [bin]: Object
      }
    }

##RecList

	RecList := {
		[recstatus : Status,
		 record	  : Record]
	}

##OpList

	OpList := {
		[operation : Operators,
		 binname   : String,
		 binvalue  : Object]
	}

##WritePolicy
 
	WritePolicy := {
		timeout : Integer,
		Retry	: RetryPolicy,
		Key		: KeyPolicy,
		Gen		: GenerationPolicy,
		Exists	: ExistsPolicy
	}

##ReadPolicy
	
	ReadPolicy := {
		timeout : Integer,
		Key		: keyPolicy,
	}

##OperatePolicy

	OperatePolicy := {
		timeout : Integer,
		Gen		: GenerationPolicy,
		Key		: KeyPolicy,
		Retry	: RetryPolicy
	}

##RemovePolicy
	
	RemovePolicy := {
		timeout : Integer,
		gen		: Integer,
		Retry	: RetryPolicy,
		Key		: KeyPolicy
	}

