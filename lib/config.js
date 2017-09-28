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

'use strict'

const path = require('path')
const Policy = require('./policy')

/**
 * @classdesc The Config class contains the settings for an Aerospike client
 * instance, including the list of seed hosts, default policies, and other
 * settings.
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 *
 * let config = {
 *   hosts: '192.168.1.10,192.168.1.11',
 *   user: process.env.DATABASE_USER,
 *   password: process.env.DATABASE_PASSWORD,
 *   policies: {
 *     read: new Aerospike.ReadPolicy({
 *       totalTimeout: 500
 *     })
 *   },
 *   log: {
 *     level: Aerospike.log.INFO,
 *     file: 2 // log to stderr
 *   }
 * }
 *
 * Aerospike.connect(config)
 *   .then(client => {
 *     // client is ready to accept commands
 *     client.close()
 *   })
 *   .catch(error => {
 *     console.error('Failed to connect to cluster: %s', error.message)
 *   })
 */
class Config {
  constructor (config) {
    config = config || {}

    /**
     * @name Config#user
     * @summary The user name to use when authenticating to the cluster.
     * @description Leave empty for clusters running without access management.
     * (Security features are available in the Aerospike Database Enterprise
     * Edition.)
     * @type {string}
     */
    if (typeof config.user === 'string') {
      this.user = config.user
    }

    /**
     * @name Config#password
     * @summary The password to use when authenticating to the cluster.
     * @type {string}
     */
    if (typeof config.password === 'string') {
      this.password = config.password
    }

    /**
     * @name Config#clusterName
     * @summary Expected Cluster Name.
     * @description If not <code>null</code>, server nodes must return this
     * cluster name in order to join the client's view of the cluster. Should
     * only be set when connecting to servers that support the "cluster-name"
     * info command.
     * @type {string}
     * @since v2.4
     */
    this.clusterName = config.clusterName

    /**
     * @name Config#port
     * @summary Default port to use for any host address, that does not
     * explicitly specify a port number. Default is 3000.
     * @type {number}
     *
     * @since v2.4
     */
    if (typeof config.port === 'number') {
      this.port = config.port
    } else {
      this.port = 3000
    }

    /**
     * @name Config#hosts
     * @summary List of hosts with which the client should attempt to connect.
     * @description If not specified, the client attempts to read the host list
     * from the <code>AEROSPIKE_HOSTS</code> environment variable or else falls
     * back to use a default value of "localhost".
     * @type {(Object[] | string)}
     *
     * @example <caption>Setting <code>hosts</code> using a String</caption>
     *
     * const Aerospike = require('aerospike')
     *
     * var hosts = '192.168.0.1:3000,192.168.0.2:3000'
     * Aerospike.connect({hosts: hosts}, (err, client) => {
     *   if (err) throw err
     *   // ...
     *   client.close()
     * })
     *
     * @example <caption>Setting <code>hosts</code> using an array of hostname/port tuples</caption>
     *
     * const Aerospike = require('aerospike')
     *
     * var hosts = [
     *   { addr: '192.168.0.1', port: 3000 },
     *   { addr: '192.168.0.2', port: 3000 }
     * ]
     * Aerospike.connect({hosts: hosts}, (err, client) => {
     *   if (err) throw err
     *   // ...
     *   client.close()
     * })
     */
    this.hosts = config.hosts || process.env.AEROSPIKE_HOSTS || `localhost:${this.port}`

    /**
     * @summaries Global client policies.
     *
     * @description A policy is a set of values which modify the behavior of an
     * operation, like timeouts or how an operation handles data. The policies
     * defined in the configuration are used as global defaults, which can be
     * overridden by individual operations as needed.
     *
     * @type {Config~Policies}
     *
     * @example <caption>Setting a default timeout value</caption>
     *
     * const Aerospike = require('aerospike')
     *
     * let config = {
     *   policies: {
     *     read: new Aerospike.ReadPolicy({ totalTimeout: 100 }),
     *     write: new Aerospike.WritePolicy({ totalTimeout: 100 })
     *   }
     * }
     * let key = new Aerospike.Key('test', 'demo', 123)
     *
     * Aerospike.connect(config)
     *   .then(client => {
     *     return client.put(key, {x: 42})                       // uses default timeout
     *       .then(() => client.get(key, { totalTimeout: 200 })) // overrides default timeout
     *       .then(record => console.info(record))
     *       .then(() => client.close())
     *       .catch(error => {
     *         client.close()
     *         return Promise.reject(error)
     *       })
     *   })
     *   .catch(error => console.error(error))
     */
    this.policies = {}
    if (typeof config.policies === 'object') {
      this.setDefaultPolicies(config.policies)
    }

    /**
     * @name Config#log
     * @summary Configuration for logging done by the client.
     * @type {Object}
     *
     * @property {number} [log.level] - Log level; see {@link
     * module:aerospike.log} for details.
     * @property {number} [log.file] - File descriptor opened using fs.open();
     * specify 1 for stdout and 2 for stdin.
     *
     * @example <caption>Enabling debug logging to a separate log file</caption>
     *
     * const Aerospike = require('aerospike')
     * const fs = require('fs')
     *
     * var debuglog = fs.openSync('./debug.log')
     * var config = {
     *   log: {
     *     level: Aerospike.log.DEBUG,
     *     file: debuglog
     *   }
     * }
     * Aerospike.connect(config, (err, client) => {
     *   if (err) throw err
     *   // ...
     *   client.close()
     * })
     */
    if (typeof config.log === 'object') {
      this.log = config.log
    }

    /**
     * @name Config#connTimeoutMs
     * @summary Initial host connection timeout in milliseconds.
     * @description The client observes this timeout when opening a connection to
     * the cluster for the first time. Default is 1,000 milliseconds.
     * @type {number}
     */
    if (Number.isInteger(config.connTimeoutMs)) {
      this.connTimeoutMs = config.connTimeoutMs
    }

    /**
     * @name Config#tenderInterval
     * @summary Polling interval in milliseconds for cluster tender. Default is
     * 1,000 milliseconds.
     * @type {number}
     */
    if (Number.isInteger(config.tenderInterval)) {
      this.tenderInterval = config.tenderInterval
    }

    /**
     * @name Config#maxConnsPerNode
     * @summary Maximum number of asynchronous connections allowed for each node.
     * @description New transactions will be rejected with an
     * <code>ERR_NO_MORE_CONNECTIONS</code> error if the limit would be
     * exceeded. Default is 300.
     * @type {number}
     */
    if (Number.isInteger(config.maxConnsPerNode)) {
      this.maxConnsPerNode = config.maxConnsPerNode
    }

    /**
     * @name Config#modlua
     * @summary Configuration values for the mod-lua system and user paths.
     * @description If you are using user-defined functions (UDF) for processing
     * query results (i.e. aggregations), then you will find it useful to set
     * the <code>modlua</code> settings. Of particular importance is the
     * <code>modelua.userPath</code>, which allows you to define a path to where
     * the client library will look for Lua files for processing.
     * @type {Object}
     *
     * @property {string} [modlua.systemPath=defaultLuaSystemPath()] - Path to system Lua scripts.
     * @property {string} [modlua.userPath] - Path to user Lua scripts.
     */
    this.modlua = {
      systemPath: this.defaultLuaSystemPath()
    }
    if (typeof config.modlua === 'object') {
      Object.assign(this.modlua, config.modlua)
    }

    /**
     * @name Config#sharedMemory
     * @summary Shared memory configuration.
     * @description This allows multiple client instances running in separate
     * processes on the same machine to share cluster status, including nodes and
     * data partiton maps. Each shared memory segment contains state for one
     * Aerospike cluster. If there are multiple Aerospike clusters, a different
     * <code>key</code> must be defined for each cluster.
     * @type {Object}
     * @see {@link http://www.aerospike.com/docs/client/c/usage/shm.html#operational-notes|Operational Notes}
     * @tutorial node_clusters
     *
     * @property {boolean} [enable=true] - Whether to enable/disable usage of
     * shared memory.
     * @property {number} key - Identifier for the shared memory segment
     * associated with the target Aerospike cluster; the same key needs to be
     * used on all client instances connecting to the same cluster.
     * @property {number} [maxNodes=16] - Sets the max. number of
     * server nodes in the cluster - this value is required to size the shared
     * memory segment. Ensure that you leave a cushion between actual server node
     * cound and <code>maxNodes</code> so that you can add new nodes without
     * rebooting the client.
     * @property {number} [maxNamespaces=8] - Sets the max. number of
     * namespaces used in the cluster - this value is required to size the shared
     * memory segment. Ensure that you leave a cushion between actual namespace
     * count and <code>maxNamespaces</code> so that you can add new namespaces
     * without rebooking the client.
     * @property {number} [takeoverThresholdSeconds=30] - Expiration
     * time in seconds for the lock on the shared memory segment; if the cluster
     * status has not been updated after this many seconds another client instance
     * will take over the shared memory cluster tending.
     *
     * @example <caption>Using shared memory in a clustered setup</caption>
     *
     * const Aerospike = require('aerospike')
     * const cluster = require('cluster')
     *
     * const config = {
     *   sharedMemory: {
     *     key: 0xa5000000
     *   }
     * }
     * const client = Aerospike.client(config)
     * const noWorkers = 4
     *
     * if (cluster.isMaster) {
     *   // spawn new worker processes
     *   for (var i = 0; i < noWorkers; i++) {
     *     cluster.fork()
     *   }
     * } else {
     *   // connect to Aerospike cluster in each worker process
     *   client.connect((err) => { if (err) throw err })
     *
     *   // handle incoming HTTP requests, etc.
     *   // http.createServer((request, response) => { ... })
     *
     *   // close DB connection on shutdown
     *   client.close()
     * }
     */
    if (typeof config.sharedMemory === 'object') {
      this.sharedMemory = config.sharedMemory
    }
  }

  /**
   * @function Config#defaultLuaSystemPath
   *
   * @summary Returns the default Lua system path
   *
   * @return {string} Default Lua system path
   *
   * @since v2.7.0
   */
  defaultLuaSystemPath () {
    return path.resolve(__dirname, '..', 'modules', 'lua-core', 'src')
  }

  /**
   * @private
   */
  setDefaultPolicies (policies) {
    for (let prop in policies) {
      let policy = policies[prop]
      switch (prop) {
        case 'apply':
          this.policies.apply = createPolicy(policy, Policy.ApplyPolicy)
          break
        case 'batch':
          this.policies.batch = createPolicy(policy, Policy.BatchPolicy)
          break
        case 'info':
          this.policies.info = createPolicy(policy, Policy.InfoPolicy)
          break
        case 'operate':
          this.policies.operate = createPolicy(policy, Policy.OperatePolicy)
          break
        case 'query':
          this.policies.query = createPolicy(policy, Policy.QueryPolicy)
          break
        case 'read':
          this.policies.read = createPolicy(policy, Policy.ReadPolicy)
          break
        case 'remove':
          this.policies.remove = createPolicy(policy, Policy.RemovePolicy)
          break
        case 'scan':
          this.policies.scan = createPolicy(policy, Policy.ScanPolicy)
          break
        case 'write':
          this.policies.write = createPolicy(policy, Policy.WritePolicy)
          break
        default:
          throw new TypeError(`Unsupported default policy value: "${prop}"`)
      }
    }
  }
}

function createPolicy (value, PolicyKlass) {
  if (value === null || typeof value === 'undefined') {
    return undefined
  } else if (value instanceof PolicyKlass) {
    return value
  } else {
    return new PolicyKlass(value)
  }
}

/**
 * @typedef {Object} Config~Policies
 *
 * @property {ApplyPolicy} apply - Default apply policy
 * @property {BatchPolicy} batch - Default batch policy
 * @property {InfoPolicy} info - Default info policy
 * @property {OperatePolicy} operate - Default operate policy
 * @property {ReadPolicy} read - Default read policy
 * @property {RemovePolicy} remove - Default remove policy
 * @property {ScanPolicy} scan - Default scan policy
 * @property {QueryPolicy} query - Default query policy
 * @property {WritePolicy} write - Default write policy
 */

module.exports = Config
