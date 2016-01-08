var as = require('../build/Release/aerospike.node');
var LargeList = require('./llist.js');
var stream = require('stream');
var inherits = require('util').inherits;

/******************************************************************************
 * RecordStream - used for Scan and Query operations
 *****************************************************************************/

function RecordStream() {}

inherits(RecordStream, stream);

RecordStream.prototype.writable = false;
RecordStream.prototype.readable = true;
RecordStream.prototype._read = function() {};

/******************************************************************************
 * Streaming Scan Operation
 *****************************************************************************/


// wrapper function around query_foreach function.
// This wrapper receives results from V8 layer and emits 'data' event
// to node.js layer.
// On error, emits 'error' event.
// When all the results are consumed it emits 'end' event.
var execute = function() {

	var rs = new RecordStream();

	var self = this;


	var onResult = function(res, key) {
		rs.emit('data', res);
	};

	var onError = function(error) {
		rs.emit('error', error);
	};

	var onEnd = function(end) {
		if (!self.isQuery && self.hasUDF) {
			self.scanId = end;
			rs.emit('end', end);
		} else {
			rs.emit('end');
		}
	};

	if (self.isQuery) // it is a query request.
	{
		if (self.hasUDF) {
			// query UDF is not supported currently.
			throw new Error("Query UDF feature not supported");
		} else {
			// normal query and query aggregation is invoked here.
			self.foreach(onResult, onError, onEnd);
		}

	} else // it is a scan request
	{
		if (self.hasUDF) // scan with a UDF - so background scan.
		{
			// background scan does not return records. So callback for record is NULL.
			self.foreach(null, onError, onEnd);
		} else // it is a foreground scan or scan aggregation.
		{
			self.foreach(onResult, onError, onEnd);
		}

	}
	return rs;

};


var Info = function(scanId, callback) {
	var self = this;
	self.queryInfo(scanId, callback);
};

var query = function(ns, set, options) {


	if (typeof(set) != "string") {
		set = '';
	}

  if(!options) {
      options = null;
  }

  var queryObj = this.createQuery(ns, set, options);

  var queryProto = Object.getPrototypeOf(queryObj);


  if( !queryProto.execute)
  {
	  queryProto.execute = execute;
  }

  if( !queryProto.Info)
  {
	  queryProto.Info = Info;
  }

  return queryObj;
};


var createIntegerIndex = function(options, callback) {
	var policy;
	var set;
	if (options && options.policy) {
		policy = options.policy;
	}
	if (options && options.set) {
		set = options.set;
	}
	this.indexCreate(
		options.ns,
		set,
		options.bin,
		options.index,
		as.indexType.NUMERIC,
		policy,
		callback
	);
};

var createStringIndex = function(options, callback) {
	var policy;
	var set;
	if (options && options.policy) {
		policy = options.policy;
	}
	if (options && options.set) {
		set = options.set;
	}
	this.indexCreate(
		options.ns,
		set,
		options.bin,
		options.index,
		as.indexType.STRING,
		policy,
		callback
	);
};

var createGeo2DSphereIndex = function(options, callback) {
	var policy;
	var set;
	if (options && options.policy) {
		policy = options.policy;
	}
	if (options && options.set) {
		set = options.set;
	}
	this.indexCreate(
		options.ns,
		set,
		options.bin,
		options.index,
		as.indexType.GEO2DSPHERE,
		policy,
		callback
	);
};

var parseOperateArgs = function(args) {
	var arglength = args.length;

	var options = {};
	options.callback = args[arglength - 1];

	if (arglength == 3) {
		options.policy = undefined;
		options.metadata = undefined;
	} else if (arglength == 4) {
		options.metadata = args[arglength - 2];
		options.policy = undefined;
	} else if (arglength == 5) {
		options.policy = args[arglength - 2];
		options.metadata = args[arglength - 3];
	}

	return options;
};

var add = function(key, bins, metadata, policy, callback) {
	var options = parseOperateArgs(arguments);

	// populate ops from bins argument here
	var ops = [];

	for (var prop in bins) {
		ops.push(aerospike.operator.incr(prop, bins[prop]));
	}
	this.operate(key, ops, options.metadata, options.policy, options.callback);

};

var append = function(key, bins, metadata, policy, callback) {
	var options = parseOperateArgs(arguments);

	// populate ops from bins argument here
	var ops = [];

	for (var prop in bins) {
		ops.push(aerospike.operator.append(prop, bins[prop]));
	}
	this.operate(key, ops, options.metadata, options.policy, options.callback);
};

var prepend = function(key, bins, metadata, policy, callback) {
	var options = parseOperateArgs(arguments);

	// populate ops from bins argument here
	var ops = [];

	for (var prop in bins) {
		ops.push(aerospike.operator.prepend(prop, bins[prop]));
	}

	this.operate(key, ops, options.metadata, options.policy, options.callback);
};

/******************************************************************************
 * `aerospike` shim
 *****************************************************************************/

var aerospike = {
	// client:   as.client,
	key: as.key,
	status: as.status,
	policy: as.policy,
	operations: as.operations,
	cdt_operations: as.cdt_operations,
	language: as.language,
	log: as.log,
	scanPriority: as.scanPriority,
	predicates: as.predicates,
	indexType: as.indexType,
	scanStatus: as.scanStatus,
    Double  : as.Double
};

aerospike.client = function(config) {
	var client = as.client(config);
	if (client === null) {
		throw new Error("client object creation failed - null value returned");
	}
	var proto = Object.getPrototypeOf(client);

	if (!proto.createQuery) {
		proto.createQuery = proto.query;
		proto.query = query;
	}

	if (!proto.createIntegerIndex) {
		proto.createIntegerIndex = createIntegerIndex;
	}

	if (!proto.createStringIndex) {
		proto.createStringIndex = createStringIndex;
	}

	if (!proto.createGeo2DSphereIndex) {
		proto.createGeo2DSphereIndex = createGeo2DSphereIndex;
	}

	if (!proto.LargeList) {
		proto.LargeList = LargeList;
	}

	if (!proto.add) {
		proto.add = add;
	}

	if (!proto.append) {
		proto.append = append;
	}

	if (!proto.prepend) {
		proto.prepend = prepend;
	}

	return client;
};

var populate_op = function(op, bin, props) {
  var obj = {};
  obj.operation = op;
  obj.bin = bin;
  for (var prop in props) {
    obj[prop] = props[prop];
  };
  return obj;
};

var populate_cdt_op = function(op, bin, props) {
  var obj = {};
  obj.cdt_operation = op;
  obj.bin = bin;
  for (var prop in props) {
    obj[prop] = props[prop];
  };
  return obj;
}

var read_op = function(bin) {
  return populate_op(as.operations.READ, bin);
};

var write_op = function(bin, value) {
  return populate_op(as.operations.WRITE, bin, {value: value});
};

var incr_op = function(bin, value) {
  return populate_op(as.operations.INCR, bin, {value: value});
};

var append_op = function(bin, value) {
  return populate_op(as.operations.APPEND, bin, {value: value});
};

var prepend_op = function(bin, value) {
  return populate_op(as.operations.PREPEND, bin, {value: value});
};

var touch_op = function(bin, ttl) {
  return populate_op(as.operations.TOUCH, bin, {ttl: ttl});
};

var list_append_op = function(bin, value) {
  return populate_cdt_op(as.cdt_operations.LIST_APPEND, bin, {value: value});
};

var list_append_items_op = function(bin, list) {
  return populate_cdt_op(as.cdt_operations.LIST_APPEND_ITEMS, bin, {list: list});
};

var list_insert_op = function(bin, index, value) {
  return populate_cdt_op(as.cdt_operations.LIST_INSERT, bin, {index: index, value: value});
};

var list_insert_items_op = function(bin, index, list) {
  return populate_cdt_op(as.cdt_operations.LIST_INSERT_ITEMS, bin, {index: index, list: list});
};

var list_pop_op = function(bin, index) {
  return populate_cdt_op(as.cdt_operations.LIST_POP, bin, {index: index});
};

var list_pop_range_op = function(bin, index, count) {
  return populate_cdt_op(as.cdt_operations.LIST_POP_RANGE, bin, {index: index, count: count});
};

var list_remove_op = function(bin, index) {
  return populate_cdt_op(as.cdt_operations.LIST_REMOVE, bin, {index: index});
};

var list_remove_range_op = function(bin, index, count) {
  return populate_cdt_op(as.cdt_operations.LIST_REMOVE_RANGE, bin, {index: index, count: count});
};

var list_clear_op = function(bin) {
  return populate_cdt_op(as.cdt_operations.LIST_CLEAR, bin);
};

var list_set_op = function(bin, index, value) {
  return populate_cdt_op(as.cdt_operations.LIST_SET, bin, {index: index, value: value});
};

var list_trim_op = function(bin, index, count) {
  return populate_cdt_op(as.cdt_operations.LIST_TRIM, bin, {index: index, count: count});
};

var list_get_op = function(bin, index) {
  return populate_cdt_op(as.cdt_operations.LIST_GET, bin, {index: index});
};

var list_get_range_op = function(bin, index, count) {
  return populate_cdt_op(as.cdt_operations.LIST_GET_RANGE, bin, {index: index, count: count});
};

var list_size_op = function(bin) {
  return populate_cdt_op(as.cdt_operations.LIST_SIZE, bin);
};

aerospike.operator = {
	read: read_op,
	write: write_op,
	incr: incr_op,
	append: append_op,
	prepend: prepend_op,
	touch: touch_op,
	listAppend: list_append_op,
	listAppendItems: list_append_items_op,
	listInsert: list_insert_op,
	listInsertItems: list_insert_items_op,
	listPop: list_pop_op,
	listPopRange: list_pop_range_op,
	listRemove: list_remove_op,
	listRemoveRange: list_remove_range_op,
	listClear: list_clear_op,
	listSet: list_set_op,
	listTrim: list_trim_op,
	listGet: list_get_op,
	listGetRange: list_get_range_op,
	listSize: list_size_op
};

var equal_filter = function(args) {
	var obj = {};
	obj.predicate = as.predicates.EQUAL;
	if (typeof(arguments[1]) == "number") {
		obj.type = as.indexType.NUMERIC;
	} else if (typeof(arguments[1]) == "string") {
		obj.type = as.indexType.STRING;
	}
	obj.bin = arguments[0];
	obj.val = arguments[1];
	return obj;
};

var range_filter = function(args) {
	var obj = {};
	obj.predicate = as.predicates.RANGE;
	obj.type = as.indexType.NUMERIC;
	obj.bin = arguments[0];
	obj.min = arguments[1];
	obj.max = arguments[2];
	return obj;
};

var geo_within_filter = function(args) {
	var obj = {};
	obj.predicate = as.predicates.RANGE;
	obj.type = as.indexType.GEO2DSPHERE;
	obj.bin = arguments[0];
	obj.val = arguments[1];
	return obj;
};

var geo_contains_filter = function(args) {
	var obj = {};
	obj.predicate = as.predicates.RANGE;
	obj.type = as.indexType.GEO2DSPHERE;
	obj.bin = arguments[0];
	obj.val = arguments[1];
	return obj;
};

aerospike.filter = {
	equal: equal_filter,
	range: range_filter,
	geoWithin: geo_within_filter,
	geoContains: geo_contains_filter
};

function GeoJSON(strval) {
	if (this instanceof GeoJSON) {
		this.str = strval
	} else {
		return new GeoJSON(strval);
	}
};
aerospike.GeoJSON = GeoJSON;

module.exports = aerospike;
