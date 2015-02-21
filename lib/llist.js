LargeList = function(key, binName, writePolicy, createModule) {

	LargeList.client= this;
	LargeList.key = key;
	LargeList.writePolicy = writePolicy;
	LargeList.binName = binName;
	LargeList.module = "llist";
	LargeList.createModule = null;

	// Handle all the variations of add function.
	// 1. val can be a single value
	// 2. val can be an array of values
	// 3. val can be continuous varying length argument.
	LargeList.add = function(val, callback) {
		var arglength = arguments.length;
		if(typeof arguments[arglength-1] != "function")
		{
			console.error("Callback must be a function for add API");
			return;
		}

		var udfargs;
		var udfFunc;
		var udfArgs;
		if( arglength == 2) 
		{
			udfArgs = val;
			if(Array.isArray(arguments[0]))
			{
				udfFunc = "add_all";
			}
			else
			{
				udfFunc = "add";
			}
		}
		else if( arglength > 2)
		{
			udfArgs = new Array;
			for(var i = 0; i < arglength-1; i++)
			{
				udfArgs.push(arguments[i]);
			}
			udfFunc = "add_all";
		}
		udfargs = { module: this.module, funcname: udfFunc, args: [ this.binName, udfArgs, this.createModule]}
		this.client.execute( this.key, udfargs, this.writePolicy, arguments[arglength-1]);
		
	};

	// Handle all the variations of update.
	// same as add variations
	LargeList.update = function(val, callback) {
		var arglength = arguments.length;
		if(typeof arguments[arglength-1] != "function")
		{
			console.error("Callback must be a function for update API");
			return;
		}
		var udfargs;
		var udfFunc;
		var udfArgs;
		if( arglength == 2) 
		{
			udfArgs = val;
			if(Array.isArray(arguments[0]))
			{
				udfFunc = "update_all";
			}
			else
			{
				udfFunc = "update";
			}
		}
		else if( arglength > 2)
		{
			udfArgs = new Array;
			for(var i = 0; i < arglength-1; i++)
			{
				udfArgs.push(arguments[i]);
			}
			udfFunc = "update_all";
		}
		udfargs = { module: this.module, funcname: udfFunc, args: [ this.binName, udfArgs, this.createModule]}
		this.client.execute( this.key, udfargs, this.writePolicy, arguments[arglength-1]);
	}

	
	// Handle all the variations of remove.
	// Same as add variations.
	LargeList.remove = function(val, callback) {
		var arglength = arguments.length;
		if(typeof arguments[arglength-1] != "function")
		{
			console.error("Callback must be a function for remove API");
			return;
		}

		var udfargs;
		var udfFunc;
		var udfArgs;
		if( arglength == 2) 
		{
			udfArgs = val;
			if(Array.isArray(arguments[0]))
			{
				udfFunc = "remove_all";
			}
			else
			{
				udfFunc = "remove";
			}
		}
		else if( arglength > 2)
		{
			udfArgs = new Array;
			for(var i = 0; i < arglength-1; i++)
			{
				udfArgs.push(arguments[i]);
			}
			udfFunc = "remove_all";
		}

		udfargs = { module: this.module, funcname: udfFunc, args: [ this.binName, udfArgs, this.createModule]}
		this.client.execute( this.key, udfargs, this.writePolicy, arguments[arglength-1]);
	}

	
	LargeList.removeRange = function(valBegin, valEnd, callback) {
		if( typeof callback != "function"){
			console.error("Callback function must be passed for removeRange function");
			return;
		}
		if(arguments.length != 3) {
			console.error("Wrong number of arguments passed to remove Range function", arguments.length);
		}
		var udfargs = { module: this.module, funcname: "remove_range", args: [this.binName, valBegin, valEnd, this.createModule]}
		this.client.execute(this.key, udfargs, this.writePolicy, callback);
	}

	LargeList.find= function(val, callback) {
		if(typeof callback != "function"){
			console.error("Callback function must be passed for find function");
			return;
		}
		var udfargs = { module: this.module, funcname: "find", args: [this.binName, val, this.createModule]}
		this.client.execute(this.key, udfargs, this.writePolicy, callback);
	}

	// implement find then filter
	LargeList.findThenFilter = function( val, udfArgs, callback) {
		if(typeof callback != "function") {
			console.error("Callback function must be passed for findThenFilter API");
			return;
		}
		var udfargs = { module:this.module, funcname: "filter", args: [this.binName, val, udfArgs.module, udfArgs.funcname, udfArgs.args, this.createModule]}
		this.client.execute(this.key, udfargs, this.writePolicy, callback);
	}
	
	LargeList.range = function(valBegin, valEnd, callback) {
		if( typeof callback != "function") {
			console.error("Callback function must be passed for range API");
			return;
		}
		var udfargs = { module: this.module, funcname: "range", args: [this.binName, valBegin, valEnd, this.createModule]}
		this.client.execute(this.key, udfargs, this.writePolicy, callback);
	}

	LargeList.scan = function(callback) {
		if(typeof callback != "function"){
			console.error("Callback function must be passed for scan API");
			return;
		}
		var udfargs = { module: this.module, funcname:"scan", args: [this.binName, this.createModule]}
		this.client.execute(this.key, udfargs, this.writePolicy, callback);
	}

	LargeList.destroy = function(callback) {
		if(typeof callback != "function"){
			console.error("callback function must be passed for destroy API");
			return;
		}
		var udfargs = { module: this.module, funcname:"destroy", args: [this.binName, this.createModule]}
		this.client.execute(this.key, udfargs, this.writePolicy, callback);
	}

	LargeList.size = function(callback) {
		if(typeof callback != "function") {
			console.error("callback function must be passed for size API");
			return;
		}
		var udfargs = { module: this.module, funcname:"size", args: [this.binName, this.createModule]}
		this.client.execute(this.key, udfargs, this.writePolicy, callback);
	}

	LargeList.getConfig = function(callback) {
		if( typeof callback != "function") {
			console.error("callback must be passed for getConfig API");
			return;
		}
		var udfargs = { module: this.module, funcname:"config", args: [this.binName, this.createModule]}
		this.client.execute(this.key, udfargs, this.writePolicy, callback);
	}
	
	LargeList.setCapacity = function(capacity, callback) {
		if(typeof callback != "function") {
			console.error("Callback must be passed for setCapacity API");
			return;
		}
		var udfargs = { module: this.module, funcname:"set_capacity", args: [this.binName, capacity, this.createModule]}
		this.client.execute(this.key, udfargs, this.writePolicy, callback);
	}

	LargeList.getCapacity = function( callback) {
		if(typeof callback != "function") {
			console.error("Callback must be passed for getCapacity API");
			return;
		}
		var udfargs = { module: this.module, funcname:"get_capacity", args: [this.binName, this.createModule ]}
		this.client.execute(this.key, udfargs, this.writePolicy, callback);
	}

	return LargeList;
}
module.exports = LargeList;
