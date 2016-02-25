// *****************************************************************************
// Copyright 2013-2016 Aerospike, Inc.
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

// Handle all the variations of add function.
// 1. val can be a single value
// 2. val can be an array of values
LargeList.prototype.add = function (val, callback) {
  if (Array.isArray(arguments[0])) {
    this.execute('add_all', arguments, 2)
  } else {
    this.execute('add', arguments, 2)
  }
}

// Handle all the variations of update.
// same as add variations
LargeList.prototype.update = function (val, callback) {
  if (Array.isArray(arguments[0])) {
    this.execute('update_all', arguments, 2)
  } else {
    this.execute('update', arguments, 2)
  }
}

// Handle all the variations of remove.
// Same as add variations and the following
LargeList.prototype.remove = function (val, callback) {
  if (Array.isArray(val)) {
    this.execute('remove_all', arguments, 2)
  } else {
    this.execute('remove', arguments, 2)
  }
}

// Can pass a range to remove the values within the range (inclusive).
LargeList.prototype.removeRange = function (valBegin, valEnd, callback) {
  this.execute('remove_range', arguments, 3)
}

LargeList.prototype.find = function find (val, filterArgs, callback) {
  var arglength = arguments.length

  if (arglength === 2) {
    this.execute('find', arguments, 2)
  } else if (arglength === 3) {
    this.execute('find', arguments, 3, 1)
  }
}

// apply filter - pass all elements through a filter and return all that qualify.
LargeList.prototype.filter = function (filterArgs, callback) {
  this.execute('filter', arguments, 1, 0)
}

LargeList.prototype.findRange = function (valBegin, valEnd, filterArgs, callback) {
  var arglength = arguments.length

  if (arglength === 3) {
    this.execute('range', arguments, 3)
  } else if (arglength === 4) {
    this.execute('range', arguments, 4, 2)
  } else {
    return
  }
}

LargeList.prototype.scan = function (callback) {
  this.execute('scan', arguments, 1)
}

LargeList.prototype.destroy = function (callback) {
  this.execute('destroy', arguments, 1)
}

LargeList.prototype.size = function (callback) {
  this.execute('size', arguments, 1)
}

LargeList.prototype.getConfig = function (callback) {
  this.execute('config', arguments, 1)
}

module.exports = LargeList
