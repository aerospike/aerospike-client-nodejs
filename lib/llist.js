function checkArgs(args, expArgLength)
{

	// number of arguments passed to the given function.
	var arglength = args.length;

	//last argument must always be a callback.
	//error if it is not callback type.
	if(typeof args[arglength-1] != "function")
	{
		console.error("Callback function must be passed for the operation");
		return -1;
	}

	//for functions requiring fixed number of arguments 
	//this check is performed.
	//If function does not have fixed number of arguments
	//this check is skipped.
	if(typeof expArgLength != "undefined")
	{
		if(arglength != expArgLength)
		{
			var err       = (new Error).stack.split("\n")[3];
			var error     = {};
			error.func    = err.split(".")[2].split("(")[0]
			error.file    = err.split("(")[1].split(":")[0];
			error.line    = err.split(":")[1];
			error.code    = 2;
			error.message = "Number of arguments passed - Invalid";
			var callback  = args[arglength-1];
			callback(error, undefined);
			return -1;
		}
	}

		return 0;
}


// Generic function to execute any LDT function.
// Invokes udf execute with the corresponding LDT 
// function name, file name as llist - file in which
// all the LDT functions are implemented.
// some function applies an UDF/Filter on values returned by LDT.
// Those values are passed as {module:" ", funcname:" ", args: " "}  object.
// Parse the above object format and populate UDFArgs accordingly.
// Position of the UDF arguments is passed to parse effectively.
var executeLDTFunction= function(ldtFunc, ldtargs, arglength, udfPosition)
{
	if(typeof udfPosition == 'undefined')
	{
		udfPosition = -1;
	}

	if(checkArgs(ldtargs, arglength) != 0)
	{
		return -1;
	}
	var udfargs = [this.binName];
	for( var i = 0; i < arglength-1; i++)
	{
		if( udfPosition == i) 
		{
			udfargs.push(ldtargs[i].module);
			udfargs.push(ldtargs[i].funcname);
			udfargs.push(ldtargs[i].args);
		}
		else
		{
			udfargs.push(ldtargs[i]);
		}
	}
	udfargs.push(this.createModule);
	var udf = { module: this.module, funcname: ldtFunc, args: udfargs}
	this.client.execute(this.key, udf, this.writePolicy, ldtargs[arglength-1]);
}

	
LargeList = function(key, binName, writePolicy, createModule) {

	LargeList.client			 = this;
	LargeList.key				 = key;
	LargeList.writePolicy		 = writePolicy;
	LargeList.binName			 = binName;
	LargeList.module			 = "llist";
	LargeList.createModule		 = createModule;
	LargeList.executeLDTFunction = executeLDTFunction;

	// Handle all the variations of add function.
	// 1. val can be a single value
	// 2. val can be an array of values
	LargeList.add = function(val, callback) {
		if(Array.isArray(arguments[0]))
		{
			this.executeLDTFunction("add_all", arguments, 2);
		}
		else
		{
			this.executeLDTFunction("add", arguments, 2);
		}
		
	};

	// Handle all the variations of update.
	// same as add variations
	LargeList.update = function(val, callback) {
		if(Array.isArray(arguments[0]))
		{
			this.executeLDTFunction("update_all", arguments, 2);
		}
		else
		{
			this.executeLDTFunction("update", arguments, 2);
		}
	}

	
	// Handle all the variations of remove.
	// Same as add variations and the following 
	LargeList.remove = function(val, callback) {


		if(Array.isArray(val))
		{
			this.executeLDTFunction("remove_all", arguments, 2);
		}
		else
		{
			this.executeLDTFunction("remove", arguments, 2);
		}
	}
	
	// Can pass a range to remove the values within the range (inclusive).
	LargeList.removeRange = function(valBegin, valEnd, callback) {

		this.executeLDTFunction("remove_range", arguments, 3);
	}

	LargeList.find= function(val, filterArgs, callback) {
		var arglength = arguments.length;

		if( arglength == 2)
		{
			this.executeLDTFunction("find", arguments, 2);
		}
		else if(arglength == 3)
		{
			this.executeLDTFunction("find", arguments, 3, 1);
		}
		else
		{
			return;
		}

	}

	// apply filter - pass all elements through a filter and return all that qualify.
	LargeList.filter = function( filterArgs, callback) {
		this.executeLDTFunction("filter", arguments, 1, 0);
	}
	
	LargeList.findRange = function(valBegin, valEnd, filterArgs, callback) {
		var arglength = arguments.length;

		if( arglength == 3)
		{
			this.executeLDTFunction("range", arguments, 3);
		}
		else if(arglength == 4)
		{
			this.executeLDTFunction("range", arguments, 4, 2);
		}
		else
		{
			return;
		}
	}

	LargeList.scan = function(callback) {
		this.executeLDTFunction("scan", arguments, 1);
	}

	LargeList.destroy = function(callback) {
		this.executeLDTFunction("destroy", arguments, 1);
	}

	LargeList.size = function(callback) {
		this.executeLDTFunction("size", arguments, 1);
	}

	LargeList.getConfig = function(callback) {
		this.executeLDTFunction("config", arguments, 1);
	}
	return LargeList;
}
module.exports = LargeList;
