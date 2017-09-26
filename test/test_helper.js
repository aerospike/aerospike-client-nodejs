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
// ****************************************************************************

'use strict'

const Aerospike = require('../lib/aerospike')
const Info = require('../lib/info')
const utils = require('../lib/utils')
const options = require('./util/options')
const expect = require('expect.js')
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
}

UDFHelper.prototype.register = function (filename) {
  let script = path.join(__dirname, filename)
  return this.client.udfRegister(script)
    .then(job => job.wait(50))
}

UDFHelper.prototype.remove = function (filename) {
  return this.client.udfRemove(filename)
    .then(job => job.wait(50))
    .catch(error => {
      if (error.code !== Aerospike.status.AEROSPIKE_ERR_UDF) {
        return Promise.reject(error)
      }
    })
}

function IndexHelper (client) {
  this.client = client
}

IndexHelper.prototype.create = function (indexName, setName, binName, dataType, indexType) {
  let index = {
    ns: options.namespace,
    set: setName,
    bin: binName,
    index: indexName,
    type: indexType || Aerospike.indexType.DEFAULT,
    datatype: dataType
  }
  return this.client.createIndex(index)
    .then(job => job.wait(10))
    .catch(error => {
      if (error.code === Aerospike.status.AEROSPIKE_ERR_INDEX_FOUND) {
        // ignore - index already exists
      } else {
        return Promise.reject(error)
      }
    })
}

IndexHelper.prototype.remove = function (indexName) {
  return this.client.indexRemove(options.namespace, indexName)
    .catch(error => {
      if (error.code === Aerospike.status.AEROSPIKE_ERR_INDEX_NOT_FOUND) {
        // ignore - index does not exist
      } else {
        return Promise.reject(error)
      }
    })
}

function ServerInfoHelper () {
  this.features = new Set()
  this.edition = 'community'
  this.build = ''
  this.nsconfig = {}
  this.cluster = []
}

ServerInfoHelper.prototype.supports_feature = function (feature) {
  return this.features.has(feature)
}

ServerInfoHelper.prototype.is_enterprise = function () {
  return this.edition.match('Enterprise')
}

ServerInfoHelper.prototype.build_gte = function (minVer) {
  return semverCmp(this.build, minVer) >= 0
}

ServerInfoHelper.prototype.fetch_info = function () {
  return client.infoAll('build\nedition\nfeatures')
    .then(results => {
      results.forEach(response => {
        let info = Info.parse(response.info)
        this.edition = info['edition']
        this.build = info['build']
        let features = info['features']
        if (Array.isArray(features)) {
          features.forEach(feature => this.features.add(feature))
        }
      })
    })
}

ServerInfoHelper.prototype.fetch_namespace_config = function (ns) {
  let nsKey = 'namespace/' + ns
  return client.infoAny(nsKey)
    .then(results => {
      let info = Info.parse(results)
      this.nsconfig = info[nsKey]
    })
}

ServerInfoHelper.prototype.randomNode = function () {
  return client.infoAny('service')
    .then(response => {
      let service = Info.parse(response).service
      if (Array.isArray(service)) {
        service = service.pop()
      }
      let host = utils.parseHostString(service)
      return host
    })
}

var udfHelper = new UDFHelper(client)
var indexHelper = new IndexHelper(client)
var serverInfoHelper = new ServerInfoHelper(client)

exports.udf = udfHelper
exports.index = indexHelper
exports.cluster = serverInfoHelper

exports.fail = function fail (message) {
  if (typeof message !== 'string') {
    message = util.inspect(message)
  }
  expect().fail(message)
}

/* global before */
before(() => client.connect()
  .then(() => serverInfoHelper.fetch_info())
  .then(() => serverInfoHelper.fetch_namespace_config(options.namespace))
)

/* global after */
after(function (done) {
  client.close()
  done()
})

function semverCmp (a, b) {
  var pa = a.split('.')
  var pb = b.split('.')
  for (var i = 0; i < 4; i++) {
    var na = Number(pa[i])
    var nb = Number(pb[i])
    if (na > nb) return 1
    if (nb > na) return -1
    if (!isNaN(na) && isNaN(nb)) return 1
    if (isNaN(na) && !isNaN(nb)) return -1
  }
  return 0
}
