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

const aerospike = require('../lib/aerospike')
const options = require('./util/options')

exports.options = options
exports.namespace = options.namespace
exports.set = options.set

exports.keygen = require('./generators/key')
exports.metagen = require('./generators/metadata')
exports.recgen = require('./generators/record')
exports.valgen = require('./generators/value')
exports.putgen = require('./generators/put')

const client = aerospike.client(options.getConfig())
exports.client = client

const check = function (err) {
  if (err && err.code !== 0) throw new Error(err.message)
}

function UDFHelper () { }

UDFHelper.prototype.register = function (filename, cb) {
  var script = __dirname + '/' + filename
  client.udfRegister(script, function (err) {
    check(err)
    client.udfRegisterWait(filename, 50, function (err) {
      check(err)
      if (cb) cb()
    })
  })
}

UDFHelper.prototype.remove = function (filename, cb) {
  client.udfRemove(filename, function (err) {
    check(err)
    if (cb) cb()
  })
}

function ServerInfoHelper () {
  this.features = []
  this.nsconfig = {}
  this.cluster = []
}

function IndexHelper () { }

IndexHelper.prototype.create = function (index_name, bin_name, index_type) {
  var index = {
    ns: options.namespace,
    set: options.set,
    bin: bin_name,
    index: index_name
  }
  var builder
  switch (index_type.toLowerCase()) {
    case 'string': builder = client.createStringIndex; break
    case 'integer': builder = client.createIntegerIndex; break
  }
  builder.call(client, index, function (err) {
    check(err)
    client.indexCreateWait(index.ns, index.index, 100, function (err) {
      check(err)
    })
  })
}

ServerInfoHelper.prototype.supports_feature = function (feature) {
  return this.features.indexOf(feature) >= 0
}

ServerInfoHelper.prototype.ldt_enabled = function () {
  return this.nsconfig['ldt-enabled'] === 'true'
}

ServerInfoHelper.prototype.fetch_info = function () {
  var _this = this
  client.info('features', function (err, result) {
    check(err)
    var features = result.split('\n')[0].split('\t')[1]
    _this.features = features.split(';')
  })
}

ServerInfoHelper.prototype.fetch_namespace_config = function (ns) {
  var _this = this
  client.info('namespace/' + ns, function (err, result) {
    check(err)
    var config = result.split('\n')[0].split('\t')[1]
    config.split(';').forEach(function (nv) {
      nv = nv.split('=')
      _this.nsconfig[nv[0]] = nv[1]
    })
  })
}

var udf_helper = new UDFHelper()
var index_helper = new IndexHelper()
var server_info_helper = new ServerInfoHelper()

exports.udf = udf_helper
exports.index = index_helper
exports.cluster = server_info_helper

/* global before */
before(function (done) {
  client.connect(function (err) {
    if (err && err.code !== aerospike.status.AEROSPIKE_OK) {
      throw new Error(err.message)
    }
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
