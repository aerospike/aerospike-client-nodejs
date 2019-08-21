// *****************************************************************************
// Copyright 2013-2019 Aerospike, Inc.
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
const options = require('./util/options')
const semver = require('semver')
const path = require('path')
const runInNewProcessFn = require('./util/run_in_new_process')

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)
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

Aerospike.setDefaultLogging(config.log)

const client = Aerospike.client(config)
exports.client = client

function UDFHelper (client) {
  this.client = client
}

UDFHelper.prototype.register = function (filename) {
  const script = path.join(__dirname, filename)
  return this.client.udfRegister(script)
    .then(job => job.wait(50))
}

UDFHelper.prototype.remove = function (filename) {
  return this.client.udfRemove(filename)
    .then(job => job.wait(50))
    .catch(error => {
      if (error.code !== Aerospike.status.ERR_UDF) {
        return Promise.reject(error)
      }
    })
}

function IndexHelper (client) {
  this.client = client
}

IndexHelper.prototype.create = function (indexName, setName, binName, dataType, indexType) {
  const index = {
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
      if (error.code === Aerospike.status.ERR_INDEX_FOUND) {
        // ignore - index already exists
      } else {
        return Promise.reject(error)
      }
    })
}

IndexHelper.prototype.remove = function (indexName) {
  return this.client.indexRemove(options.namespace, indexName)
    .catch(error => {
      if (error.code === Aerospike.status.ERR_INDEX_NOT_FOUND) {
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

ServerInfoHelper.prototype.hasFeature = function (feature) {
  return this.features.has(feature)
}

ServerInfoHelper.prototype.isEnterprise = function () {
  return this.edition.match('Enterprise')
}

ServerInfoHelper.prototype.isVersionInRange = function (versionRange) {
  let version = process.env.AEROSPIKE_VERSION_OVERRIDE || this.build
  version = semver.coerce(version) // truncate a build number like "4.3.0.2-28-gdd9f506" to just "4.3.0"
  return semver.satisfies(version, versionRange)
}

ServerInfoHelper.prototype.fetchInfo = function () {
  return client.infoAll('build\nedition\nfeatures')
    .then(results => {
      results.forEach(response => {
        const info = Info.parse(response.info)
        this.edition = info.edition
        this.build = info.build
        const features = info.features
        if (Array.isArray(features)) {
          features.forEach(feature => this.features.add(feature))
        }
      })
    })
}

ServerInfoHelper.prototype.fetchNamespaceConfig = function (ns) {
  const nsKey = 'namespace/' + ns
  return client.infoAny(nsKey)
    .then(results => {
      const info = Info.parse(results)
      this.nsconfig = info[nsKey]
    })
}

ServerInfoHelper.prototype.randomNode = function () {
  const nodes = client.getNodes()
  const i = Math.floor(Math.random() * nodes.length)
  return nodes[i]
}

var udfHelper = new UDFHelper(client)
var indexHelper = new IndexHelper(client)
var serverInfoHelper = new ServerInfoHelper(client)

exports.udf = udfHelper
exports.index = indexHelper
exports.cluster = serverInfoHelper

exports.runInNewProcess = function (fn, data) {
  if (data === undefined) {
    data = null
  }
  const env = {
    NODE_PATH: path.join(process.cwd(), 'node_modules')
  }
  return runInNewProcessFn(fn, env, data)
}

function skipConditional (ctx, condition, message) {
  ctx.beforeEach(function () {
    if (condition()) {
      this.skip(message)
    }
  })
}

exports.skipUnlessSupportsFeature = function (feature, ctx) {
  skipConditional(ctx, () => !this.cluster.hasFeature(feature), `requires server feature "${feature}"`)
}

exports.skipUnlessEnterprise = function (ctx) {
  skipConditional(ctx, () => !this.cluster.isEnterprise(), 'requires enterprise edition')
}

exports.skipUnlessVersion = function (versionRange, ctx) {
  skipConditional(ctx, () => !this.cluster.isVersionInRange(versionRange), `cluster version does not meet requirements: "${versionRange}"`)
}

if (process.env.GLOBAL_CLIENT !== 'false') {
  /* global before */
  before(() => client.connect()
    .then(() => serverInfoHelper.fetchInfo())
    .then(() => serverInfoHelper.fetchNamespaceConfig(options.namespace))
    .catch(error => {
      console.error('ERROR:', error)
      console.error('CONFIG:', client.config)
      throw error
    })
  )
}

/* global after */
after(function (done) {
  client.close()
  done()
})
