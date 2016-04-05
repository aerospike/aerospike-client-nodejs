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
// ****************************************************************************

const Aerospike = require('../lib/aerospike')
const Info = require('../lib/info')
const options = require('./util/options')
const expect = require('expect.js')
const deasync = require('deasync')
const util = require('util')
const path = require('path')

global.expect = expect

exports.options = options
exports.namespace = options.namespace
exports.set = options.set

exports.keygen = require('./generators/key')
exports.metagen = require('./generators/metadata')
exports.recgen = require('./generators/record')
exports.valgen = require('./generators/value')
exports.putgen = require('./generators/put')

const config = options.getConfig()
exports.config = config

const client = Aerospike.client(config)
exports.client = client

function UDFHelper (client) {
  this.client = client
  this.udfRegister = deasync(this.client.udfRegister).bind(client)
  this.udfRegisterWait = deasync(this.client.udfRegisterWait).bind(client)
  this.udfRemove = deasync(this.client.udfRemove).bind(client)
}

UDFHelper.prototype.register = function (filename, done) {
  var script = path.join(__dirname, filename)
  this.udfRegister(script)
  this.udfRegisterWait(filename, 50)
  if (done) done()
}

UDFHelper.prototype.remove = function (filename, done) {
  try {
    this.udfRemove(filename)
  } catch (error) {
    if (error.code !== Aerospike.status.AEROSPIKE_ERR_UDF) throw error
  }
  if (done) done()
}

function IndexHelper (client) {
  this.client = client
  this.createIndex = deasync(client.createIndex).bind(client)
  this.indexRemove = deasync(client.indexRemove).bind(client)
  this.info = deasync(client.info).bind(client)
}

IndexHelper.prototype.create = function (indexName, setName, binName, dataType, indexType) {
  var index = {
    ns: options.namespace,
    set: setName,
    bin: binName,
    index: indexName,
    type: indexType || Aerospike.indexType.DEFAULT,
    datatype: dataType
  }
  var task = this.createIndex(index)
  deasync(task.waitUntilDone).bind(task)(100)
}

IndexHelper.prototype.remove = function (indexName) {
  this.indexRemove(options.namespace, indexName, {})
}

IndexHelper.prototype.exists = function (indexName) {
  var sindex = 'sindex/' + options.namespace + '/' + indexName
  var exists = false
  var attempts = 0
  while (attempts < 5) {
    attempts++
    this.info(sindex, function (err, info) {
      if (err) throw err
      var indexStats = Info.parseInfo(info)[sindex]
      var noIndexErr = (typeof indexStats === 'string') && indexStats.indexOf('FAIL:201:NO INDEX') >= 0
      exists = exists || !noIndexErr
    })
    if (exists) return exists
    deasync.sleep(5)
  }
  return false
}

function ServerInfoHelper () {
  this.features = []
  this.nsconfig = {}
  this.cluster = []
}

ServerInfoHelper.prototype.supports_feature = function (feature) {
  return this.features.indexOf(feature) >= 0
}

ServerInfoHelper.prototype.ldt_enabled = function () {
  return this.nsconfig['ldt-enabled'] === 'true'
}

ServerInfoHelper.prototype.fetch_info = function () {
  var self = this
  var done = false
  client.info('features', function (err, result) {
    if (err) throw err
    self.features = Info.parseInfo(result)['features']
  }, function () { done = true })
  deasync.loopWhile(function () { return !done })
}

ServerInfoHelper.prototype.fetch_namespace_config = function (ns) {
  var self = this
  var done = false
  var nsKey = 'namespace/' + ns
  client.info(nsKey, function (err, result) {
    if (err) throw err
    self.nsconfig = Info.parseInfo(result)[nsKey]
  }, function () { done = true })
  deasync.loopWhile(function () { return !done })
}

var udf_helper = new UDFHelper(client)
var index_helper = new IndexHelper(client)
var server_info_helper = new ServerInfoHelper(client)

exports.udf = udf_helper
exports.index = index_helper
exports.cluster = server_info_helper

exports.fail = function fail (message) {
  if (typeof message !== 'string') {
    message = util.inspect(message)
  }
  expect().fail(message)
}

/* global before */
before(function (done) {
  client.connect(function (err) {
    if (err) throw err
    server_info_helper.fetch_info()
    server_info_helper.fetch_namespace_config(options.namespace)
    done()
  })
})

/* global after */
after(function (done) {
  client.close()
  done()
})
