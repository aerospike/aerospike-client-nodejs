// *****************************************************************************
// Copyright 2013-2017 Aerospike, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License")
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
// *****************************************************************************

const LLIST_STRACE_RE = /at LargeList\.(\w+) \((.*):(\d+):(\d+)\)/ // pattern for parsing a line of a stack trace

// Creates a new aerospike.error object with the given error code and message.
// The function name, file name and line number for the error are set
// automatically by inspecting the current stack trace and looking for the last
// LargeList function call on it.
function llistError (code, message) {
  var error = { code: code, message: message }
  var strace = new Error().stack.split('\n')
  while (strace.length > 0) {
    var line = strace.shift()
    var match = LLIST_STRACE_RE.exec(line)
    if (match && match[1] !== 'execute') {
      error.func = match[1]
      error.file = match[2]
      error.line = match[3]
      break
    }
  }
  return error
}

function checkArgs (args, expArgLength) {
  // number of arguments passed to the given function.
  var arglength = args.length

  // last argument must always be a callback.
  // error if it is not callback type.
  if (typeof args[arglength - 1] !== 'function') {
    throw new Error('Callback function must be passed for this async API')
  }

  // for functions requiring fixed number of arguments
  // this check is performed.
  // If function does not have fixed number of arguments
  // this check is skipped.
  if (typeof expArgLength !== 'undefined') {
    if (arglength !== expArgLength) {
      var error = llistError(2, 'Invalid number of arguments')
      var callback = args[arglength - 1]
      callback(error, undefined)
      return -1
    }
  }

  return 0
}

/**
 * @class LargeList
 *
 * @classdesc Create and Manage a list within a single bin.
 *
 * For more information, please refer to the section on
 * <a href="http://www.aerospike.com/docs/guide/ldt_guide.html" title="Aerospike Large Data Types">&uArr;Large Data Types (LDT)</a>
 * in the Aerospike technical documentation.
 *
 * ### Large Data Types (LDT) Are Deprecated
 *
 * The Large Data Types (LDT) functionality is deprecated and
 * should no longer be used. All code that uses these interfaces should
 * transition to the List and SortedMaps APIs. Most applications can use a
 * variety of techniques such as bucketing to provide higher performance and
 * reliability using the new APIs. Please check out the
 * <a href="http://www.aerospike.com/docs/guide/ldt_guide.html">&uArr;technical documentation</a>
 * for detailed information on LDT alternatives.
 *
 * The discontinuation of support for the Large Data Type (LDT) feature was
 * announced on November 14, 2016 via the following blog post:
 * <a href="http://www.aerospike.com/blog/aerospike-ldt/">http://www.aerospike.com/blog/aerospike-ldt/</a>.
 *
 * @param {Key} key - The key used to locate the record in the cluster.
 * @param {string} binName - Name of the LDT bin.
 * @param {Client~ApplyPolicy} [policy] - The Apply Policy to use for this operation.
 * @param {string} [createModule] - The LUA function name that initializes the
 * list configuration parameters; pass <code>null</code> for default list.
 *
 * @deprecated since v2.4.4
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 * Aerospike.connect((error, client) => {
 *   if (error) throw error
 *   var key          = new Aerospike.Key('test', 'demo', 'llistKey')
 *   var binName      = 'LDTbin'
 *   var policy       = { timeout: 1000 }
 *   var createModule = 'ListInitializer'
 *   var llist = client.LargeList(key, binName, policy, createModule)
 *   // operate on large list
 *   client.close()
 * })
 *
 */
function LargeList (client, key, binName, writePolicy, createModule) {
  this.key = key
  this.binName = binName
  this.writePolicy = writePolicy
  this.createModule = createModule
  this.module = 'llist'

  var self = this

  // Generic function to execute any LDT function.
  // Invokes udf execute with the corresponding LDT function name, file name as
  // llist - file in which all the LDT functions are implemented. Some function
  // applies an UDF/Filter on values returned by LDT. Those values are passed
  // as {module:" ", funcname:" ", args: " "} object. Parse the above object
  // format and populate UDFArgs accordingly. Position of the UDF arguments is
  // passed to parse effectively.
  this.execute = function (ldtFunc, ldtargs, arglength, udfPosition) {
    if (typeof udfPosition === 'undefined') {
      udfPosition = -1
    }

    if (checkArgs(ldtargs, arglength) !== 0) {
      return -1
    }
    var udfargs = [this.binName]
    for (var i = 0; i < arglength - 1; i++) {
      if (udfPosition === i) {
        udfargs.push(ldtargs[i].module)
        udfargs.push(ldtargs[i].funcname)
        udfargs.push(ldtargs[i].args)
      } else {
        udfargs.push(ldtargs[i])
      }
    }
    udfargs.push(this.createModule)
    var udf = {
      module: this.module,
      funcname: ldtFunc,
      args: udfargs
    }
    var callback = ldtargs[arglength - 1]
    client.execute(self.key, udf, self.writePolicy, callback)
  }
}

/**
 * @function LargeList#add
 *
 * @summary Adds a single value or an array of values to an existing Large
 * List.
 *
 * @description
 *
 * The operation fails if the value's key exists and the list is configured for
 * unique keys.
 *
 * If the value is a map, the key is identified by the <code>key</code> entry.
 * Otherwise, the value is the key. If the large list does not exist, create it
 * using the specified <code>userModule</code> configuration.
 *
 * @param {(*|Array.<*>)} value - Value(s) to add
 * @param {LargeList~valueCallback} callback - The function to call when the operation completes with the result of the operation.
 *
 * @deprecated since v2.4.4
 *
 * @example <caption>Adding a single value</caption>
 *
 * llist.add({'key': 'ldt_key', 'value': 'ldtvalue'}, (error, response) => {
 *   if (error) throw error
 *   // handle success
 * })
 *
 * @example <caption>Adding a list of values</caption>
 *
 * var valArray = [{'key': 'ldt_key', 'value': 'ldtvalue'}, {'key': 'ldt_array', 'value': 'ldtarrayvalue'}]
 * llist.add(valArray, (error, response) => {
 *   if (error) throw error
 *   // handle success
 * })
 */
LargeList.prototype.add = function (value, callback) {
  if (Array.isArray(value)) {
    this.execute('add_all', arguments, 2)
  } else {
    this.execute('add', arguments, 2)
  }
}

/**
 * @function LargeList#update
 *
 * @summary Update/add a single value or array of values depending on if the key exists or not.
 *
 * @description
 *
 * If the value is a map, the key is identified by the <code>key</code> entry.
 * Otherwise, the value is the key. If the large list does not exist, create it
 * using the specified <code>userModule</code> configuration.
 *
 * @param {(*|Array.<*>)} value - Value(s) to update
 * @param {LargeList~valueCallback} callback - The function to call when the operation completes with the result of the operation.
 *
 * @deprecated since v2.4.4
 *
 * @example <caption>Updating a single value</caption>
 *
 * llist.update({'key': 'ldt_key', 'value': 'ldtupdatedvalue'}, (error, response) => {
 *   if (error) throw error
 *   // handle success
 * })
 *
 * @example <caption>Updating a list of values</caption>
 *
 * var valArray = [{'key': 'ldt_key', 'value': 'ldtupdatevalue'}, {'key': 'ldt_array', 'value': 'ldtarrayupdatedvalue'}]
 * llist.update(valArray, (error, response) => {
 *   if (error) throw error
 *   // handle success
 * })
 */
LargeList.prototype.update = function (value, callback) {
  if (Array.isArray(value)) {
    this.execute('update_all', arguments, 2)
  } else {
    this.execute('update', arguments, 2)
  }
}

/**
 * @function LargeList#remove
 *
 * @summary Deletes a single value or a list of values from the Large list.
 *
 * @param {(*|Array.<*>)} value - Value(s) to delete.
 * @param {LargeList~valueCallback} callback - The function to call when the operation completes with the result of the operation.
 *
 * @deprecated since v2.4.4
 *
 * @example <caption>Removing a single value</caption>
 *
 * llist.remove({'key': 'ldt_key'}, (error, response) => {
 *   if (error) throw error
 *   // handle success
 * })
 *
 * @example <caption>Removing a list of values</caption>
 *
 * var valArray = [{'key': 'ldt_key'}, {'key': 'ldt_array'}]
 * llist.remove(valArray, (error, response) => {
 *   if (error) throw error
 *   // handle success
 * })
 */
LargeList.prototype.remove = function (value, callback) {
  if (Array.isArray(value)) {
    this.execute('remove_all', arguments, 2)
  } else {
    this.execute('remove', arguments, 2)
  }
}

/**
 * @function LargeList#removeRange
 *
 * @summary Removes values from the list between a given start and end value.
 *
 * @param {*} valBegin - Low value of the range (inclusive)
 * @param {*} valEnd - High value of the range (inclusive)
 * @param {LargeList~valueCallback} callback - The function to call when the operation completes with the result of the operation.
 *
 * @deprecated since v2.4.4
 *
 * @example
 *
 * llist.remove('begin', 'end', (error, response) => {
 *   if (error) throw error
 *   // handle success
 * })
 */
LargeList.prototype.removeRange = function (valBegin, valEnd, callback) {
  this.execute('remove_range', arguments, 3)
}

/**
 * @function LargeList#find
 *
 * @summary Select values from the list.
 *
 * @param {*} value - Value to select
 * @param {Object} [filterArgs] - UDF arguments for specifying LUA file, function and function arguments.
 * @param {LargeList~listCallback} callback - The function to call when the operation completes with the result of the operation.
 *
 * @deprecated since v2.4.4
 *
 * @example <caption>Selecting a single value</caption>
 *
 * llist.find('search_key', (error, response) => {
 *   if (error) throw error
 *   // handle success
 * })
 *
 * @example <caption>Using a filter function</caption>
 *
 * var filter = {module: 'udf_module', funcname: 'udf_function', args: ['abc', 123, 4.5]}
 * llist.find('search_key', filter, (error, response) => {
 *   if (error) throw error
 *   // handle success
 * })
 */
LargeList.prototype.find = function find (val, filterArgs, callback) {
  var arglength = arguments.length
  if (arglength === 2) {
    this.execute('find', arguments, 2)
  } else if (arglength === 3) {
    this.execute('find', arguments, 3, 1)
  }
}

/**
 * @function LargeList#filter
 *
 * @summary Select values from the list and apply specified LUA filter.
 *
 * @param {Object} filterArgs - UDF arguments for specifying LUA file, function and function arguments.
 * @param {LargeList~listCallback} callback - The function to call when the operation completes with the result of the operation.
 *
 * @deprecated since v2.4.4
 *
 * @example
 *
 * var udfargs = {module: 'udf_module', funcname: 'udf_function', args: ['abc', 123, 4.5]}
 * llist.filter((error, response) => {
 *   if (error) throw error
 *   // handle success
 * })
 */
LargeList.prototype.filter = function (filterArgs, callback) {
  this.execute('filter', arguments, 1, 0)
}

/**
 * @function LargeList#findRange
 *
 * @summary Select a range of values from the Large List.
 *
 * @param {*} valBegin - Low value of the range (inclusive)
 * @param {*} valEnd - High value of the range (inclusive)
 * @param {Object} [filterArgs] - UDF arguments for specifying LUA file, function and function arguments.
 * @param {LargeList~valueCallback} callback - The function to call when the operation completes with the result of the operation.
 *
 * @deprecated since v2.4.4
 *
 * @example <caption>Finding a range of values</caption>
 *
 * llist.findRange('begin', 'end', (error, response) => {
 *   if (error) throw error
 *   // handle success
 * })
 *
 * @example <caption>Finding a range of values then applying a filter on it</caption>
 *
 * var filter = {module: 'udf_module', funcname: 'udf_function', args: ['abc', 123, 4.5]}
 * llist.findRange('begin', 'end', filter, (error, response) => {
 *   if (error) throw error
 *   // handle success
 * })
 */
LargeList.prototype.findRange = function (valBegin, valEnd, filterArgs, callback) {
  var arglength = arguments.length
  if (arglength === 3) {
    this.execute('range', arguments, 3)
  } else if (arglength === 4) {
    this.execute('range', arguments, 4, 2)
  } else {
    throw new Error('LargeList.findRange expects either 3 or 4 arguments')
  }
}

/**
 * @function LargeList#scan
 *
 * @summary Select all the objects in the list.
 *
 * @param {LargeList~listCallback} callback - The function to call when the operation completes with the result of the operation.
 *
 * @deprecated since v2.4.4
 *
 * @example
 *
 * llist.scan((error, response) => {
 *   if (error) throw error
 *   // handle success
 * })
 */
LargeList.prototype.scan = function (callback) {
  this.execute('scan', arguments, 1)
}

/**
 * @function LargeList#destroy
 *
 * @summary Destroy the bin containing the Large List.
 *
 * @param {LargeList~doneCallback} callback - The function to call when the operation completes with the result of the operation.
 *
 * @deprecated since v2.4.4
 *
 * @example
 *
 * llist.destroy((error, response) => {
 *   if (error) throw error
 *   // handle success
 * })
 */
LargeList.prototype.destroy = function (callback) {
  this.execute('destroy', arguments, 1)
}

/**
 * @function LargeList#size
 *
 * @summary Retrieves the size of the list.
 *
 * @param {LargeList~valueCallback} callback - The function to call when the operation completes with the result of the operation.
 *
 * @deprecated since v2.4.4
 *
 * @example
 *
 * llist.size((error, respone) => {
 *   if (error) throw error
 *   // handle success
 * })
 */
LargeList.prototype.size = function (callback) {
  this.execute('size', arguments, 1)
}

/**
 * @function LargeList#getConfig
 *
 * @summary Retrieves the list configuration parameters.
 *
 * @param {LargeList~valueCallback} callback - The function to call when the operation completes with the result of the operation.
 *
 * @deprecated since v2.4.4
 *
 * @example
 *
 * llist.getConfig((error, response) => {
 *   if (error) throw error
 *   // handle success
 * })
 */
LargeList.prototype.getConfig = function (callback) {
  this.execute('config', arguments, 1)
}

/**
 * @callback LargeList~doneCallback
 *
 * @summary Callback function called when an operation has completed.
 *
 * @param {?AerospikeError} error - The error code and message or <code>null</code> if the operation was successful.
 */

/**
 * @callback LargeList~valueCallback
 *
 * @summary Callback function called when an operation has completed.
 *
 * @param {?AerospikeError} error - The error code and message or <code>null</code> if the operation was successful.
 * @param {*} response - Value returned by the UDF function.
 */

/**
 * @callback LargeList~listCallback
 *
 * @summary Callback function called when an operation has completed.
 *
 * @param {?AerospikeError} error - The error code and message or <code>null</code> if the operation was successful.
 * @param {Array.<*>} list - List of entries selected.
 */

module.exports = LargeList
