// *****************************************************************************
// Copyright 2016 Aerospike, Inc.
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

const as = require('../build/Release/aerospike.node')
const LargeList = require('./llist.js')
const Operator = require('./operator.js')
const Query = require('./query.js')
const utils = require('./utils.js')

function Client (config) {
  config = config || {}
  config.hosts = config.hosts || process.env.AEROSPIKE_HOSTS || 'localhost'
  if (typeof config.hosts === 'string') {
    config.hosts = utils.parseHostsString(config.hosts)
  }
  this.config = config
  this.as_client = as.client(config)
  this.callbackHandler = Client.callbackHandler
}

Client.DefaultCallbackHandler = function (cb, err) {
  if (!cb) return
  if (err && err.code !== as.status.AEROSPIKE_OK) {
    cb(err)
  } else {
    var args = Array.prototype.slice.call(arguments, 2)
    args.unshift(null)
    cb.apply(undefined, args)
  }
}

Client.LegacyCallbackHandler = function (cb, err) {
  if (!cb) return
  var args = Array.prototype.slice.call(arguments, 1)
  cb.apply(undefined, args)
}

Client.callbackHandler = Client.DefaultCallbackHandler

Client.setCallbackHandler = function (callbackHandler) {
  this.callbackHandler = callbackHandler
}

Client.prototype.LargeList = function (key, binName, writePolicy, createModule) {
  return new LargeList(this, key, binName, writePolicy, createModule)
}

Client.prototype.batchExists = function (keys, policy, cb) {
  if (typeof policy === 'function') {
    cb = policy
    policy = null
  }
  var self = this
  this.as_client.batchExists(keys, policy, function batchExistsCb (err, results) {
    self.callbackHandler(cb, err, results)
  })
}

Client.prototype.batchGet = function (keys, policy, cb) {
  if (typeof policy === 'function') {
    cb = policy
    policy = null
  }
  var self = this
  this.as_client.batchGet(keys, policy, function batchGetCb (err, results) {
    self.callbackHandler(cb, err, results)
  })
}

Client.prototype.batchSelect = function (keys, bins, policy, cb) {
  if (typeof policy === 'function') {
    cb = policy
    policy = null
  }
  var self = this
  this.as_client.batchSelect(keys, bins, policy, function batchSelectCb (err, results) {
    self.callbackHandler(cb, err, results)
  })
}

Client.prototype.close = function () {
  this.as_client.close()
}

Client.prototype.connect = function (cb) {
  var self = this
  this.as_client.connect(function (err) {
    self.callbackHandler(cb, err, self)
  })
  return this
}

Client.prototype.createIntegerIndex = function (options, cb) {
  var self = this
  this.as_client.indexCreate(
    options.ns,
    options.set,
    options.bin,
    options.index,
    as.indexType.NUMERIC,
    options.policy,
    function createIntegerIndexCb (err) {
      self.callbackHandler(cb, err)
    }
  )
}

Client.prototype.createStringIndex = function (options, cb) {
  var self = this
  this.as_client.indexCreate(
    options.ns,
    options.set,
    options.bin,
    options.index,
    as.indexType.STRING,
    options.policy,
    function createStringIndexCb (err) {
      self.callbackHandler(cb, err)
    }
  )
}

Client.prototype.createGeo2DSphereIndex = function (options, cb) {
  var self = this
  this.as_client.indexCreate(
    options.ns,
    options.set,
    options.bin,
    options.index,
    as.indexType.GEO2DSPHERE,
    options.policy,
    function createGeo2DSphereIndexCb (err) {
      self.callbackHandler(cb, err)
    }
  )
}

Client.prototype.execute = function (key, udfArgs, policy, cb) {
  if (typeof policy === 'function') {
    cb = policy
    policy = null
  }
  var self = this
  this.as_client.execute(key, udfArgs, policy, function executeCb (err, result, key) {
    self.callbackHandler(cb, err, result, key)
  })
}

Client.prototype.exists = function exists (key, policy, cb) {
  if (typeof policy === 'function') {
    cb = policy
    policy = null
  }
  var self = this
  this.as_client.exists(key, policy, function existsCb (err, metadata, key) {
    self.callbackHandler(cb, err, metadata, key)
  })
}

Client.prototype.get = function (key, policy, cb) {
  if (typeof policy === 'function') {
    cb = policy
    policy = null
  }
  var self = this
  this.as_client.get(key, policy, function (err, record, metadata, key) {
    self.callbackHandler(cb, err, record, metadata, key)
  })
}

Client.prototype.indexCreateWait = function (namespace, index, pollInterval, cb) {
  var self = this
  this.as_client.indexCreateWait(namespace, index, pollInterval, function indexCreateWaitCb (err) {
    self.callbackHandler(cb, err)
  })
}

Client.prototype.indexRemove = function (namespace, index, policy, cb) {
  if (typeof policy === 'function') {
    cb = policy
    policy = null
  }
  var self = this
  this.as_client.indexRemove(namespace, index, policy, function indexRemoveCb (err) {
    self.callbackHandler(cb, err)
  })
}

Client.prototype.info = function (request, host, policy, info_cb, done_cb) {
  var argv = (arguments.length === 1 ? [arguments[0]] : Array.apply(null, arguments))
  var argc = arguments.length
  if (typeof argv[argc - 2] === 'function' && typeof argv[argc - 1] === 'function') {
    done_cb = argv.pop()
    info_cb = argv.pop()
  } else if (typeof argv[argc - 1] === 'function') {
    info_cb = argv.pop()
  }

  if (typeof request === 'function') {
    request = null
  }

  if (typeof host === 'function') {
    host = null
  } else if (typeof host === 'object' && !(host.addr && host.port)) {
    policy = host
    host = null
  }

  if (typeof policy === 'function') {
    policy = null
  }

  var self = this
  var result = this.as_client.info(request, host, policy, function infoCb (err, response, host) {
    self.callbackHandler(info_cb, err, response, host)
  }, done_cb)
  return result
}

Client.prototype.operate = function (key, operations, metadata, policy, cb) {
  if (typeof policy === 'function') {
    cb = policy
    policy = null
  } else if (typeof metadata === 'function') {
    cb = metadata
    metadata = null
  }
  var self = this
  this.as_client.operate(key, operations, metadata, policy, function operateCb (err, record, metadata, key) {
    self.callbackHandler(cb, err, record, metadata, key)
  })
}

// Shortcuts for some operators
;['append', 'prepend', 'incr'].forEach(function (op) {
  Client.prototype[op] = function (key, bins, metadata, policy, cb) {
    var ops = Object.keys(bins).map(function (bin) {
      return Operator[op](bin, bins[bin])
    })

    var self = this
    this.operate(key, ops, metadata, policy, function (err, record, metadata, key) {
      self.callbackHandler(cb, err, record, metadata, key)
    })
  }
})

// Add 'add' as alias for 'incr' operation
Client.prototype.add = Client.prototype.incr

Client.prototype.put = function (key, record, metadata, policy, cb) {
  var self = this
  if (typeof metadata === 'function') {
    cb = metadata
    metadata = null
  } else if (typeof policy === 'function') {
    cb = policy
    policy = null
  }
  this.as_client.put(key, record, metadata, policy, function putCb (err, key) {
    self.callbackHandler(cb, err, key)
  })
}

Client.prototype.query = function (ns, set, options) {
  if (typeof set !== 'string') {
    set = ''
  }

  if (!options) {
    options = null
  }

  var query = this.as_client.query(ns, set, options)
  return new Query(query)
}

Client.prototype.remove = function (key, policy, cb) {
  if (typeof policy === 'function') {
    cb = policy
    policy = null
  }
  var self = this
  this.as_client.remove(key, policy, function removeCb (err, key) {
    self.callbackHandler(cb, err, key)
  })
}

Client.prototype.select = function (key, bins, policy, cb) {
  if (typeof policy === 'function') {
    cb = policy
    policy = null
  }
  var self = this
  this.as_client.select(key, bins, policy, function selectCb (err, record, metadata, key) {
    self.callbackHandler(cb, err, record, metadata, key)
  })
}

Client.prototype.udfRegister = function (udfModule, udfType, policy, cb) {
  if (typeof udfType === 'function') {
    cb = udfType
    udfType = null
  } else if (typeof policy === 'function') {
    cb = policy
    policy = null
  }
  if (typeof udfType === 'object') {
    policy = udfType
    udfType = null
  }
  var self = this
  this.as_client.udfRegister(udfModule, udfType, policy, function udfRegisterCb (err) {
    self.callbackHandler(cb, err)
  })
}

Client.prototype.udfRegisterWait = function (udfFilename, pollInterval, policy, cb) {
  if (typeof policy === 'function') {
    cb = policy
    policy = null
  }
  var self = this
  this.as_client.udfRegisterWait(udfFilename, pollInterval, policy, function udfRegisterWaitCb (err) {
    self.callbackHandler(cb, err)
  })
}

Client.prototype.udfRemove = function (udfModule, policy, cb) {
  if (typeof policy === 'function') {
    cb = policy
    policy = null
  }
  var self = this
  this.as_client.udfRemove(udfModule, policy, function udfRemoveCb (err) {
    self.callbackHandler(cb, err)
  })
}

Client.prototype.updateLogging = function (logConfig) {
  this.as_client.updateLogging(logConfig)
}

module.exports = Client
