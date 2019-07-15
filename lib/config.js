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
// *****************************************************************************

'use strict'

const policy = require('./policy')

const inspect = Symbol.for('nodejs.util.inspect.custom')

/**
 * The Config class contains the settings for an Aerospike client
 * instance, including the list of seed hosts, default policies, and other
 * settings.
 *
 * @throws {TypeError} If invalid config values are passed.
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
  /**
   * Initializes a new client configuration from the given config values.
   *
   * @param {Object} [config] configuration values
   */
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
     * @name Config#authMode
     * @summary Authentication mode used when user/password is defined.
     * @description One of the auth modes defined in {@link module:aerospike.auth}.
     * @type {number}
     * @see module:aerospike.auth
     */
    if (typeof config.authMode === 'number') {
      this.authMode = config.authMode
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
     * @name Config#tls
     * @summary Configure Transport Layer Security (TLS) parameters for secure
     * connections to the database cluster. TLS connections are not supported as
     * of Aerospike Server v3.9 and depend on a future server release.
     * @type {Object}
     * @since v2.4
     *
     * @property {boolean} [enable=true] - Enable TLS for socket connections to
     * cluster nodes. By default TLS is enabled only if the client configuration
     * includes a <code>tls</code> section.
     * @property {string} [cafile] - Path to a trusted CA certificate file. By
     * default TLS will use system standard trusted CA certificates.
     * @property {string} [capath] - Path to a directory of trusted certificates.
     * See the OpenSSL SSL_CTX_load_verify_locations manual page for more
     * information about the format of the directory.
     * @property {string} [protocols] - Specifies enabled protocols. The format is
     * the same as Apache's SSLProtocol documented at
     * https://httpd.apache.org/docs/current/mod/mod_ssl.html#sslprotocol. If not
     * specified, the client will use "-all +TLSv1.2". If you are not sure what
     * protocols to select this option is best left unspecified.
     * @property {string} [cipherSuite] - Specifies enabled cipher suites. The
     * format is the same as OpenSSL's Cipher List Format documented at
     * https://www.openssl.org/docs/manmaster/apps/ciphers.html. If not specified
     * the OpenSSL default cipher suite described in the ciphers documentation
     * will be used. If you are not sure what cipher suite to select this option
     * is best left unspecified.
     * @property {string} [certBlacklist] - Path to a certificate blacklist file.
     * The file should contain one line for each blacklisted certificate. Each
     * line starts with the certificate serial number expressed in hex. Each
     * entry may optionally specify the issuer name of the certificate. (Serial
     * numbers are only required to be unique per issuer.) Example records:
     * <code><br>867EC87482B2 /C=US/ST=CA/O=Acme/OU=Engineering/CN=Test Chain CA<br>
     * E2D4B0E570F9EF8E885C065899886461</code>
     * @property {string} [keyfile] - Path to the client's key for mutual
     * authentication. By default, mutual authentication is disabled.
     * @property {string} [keyfilePassword] - Decryption password for the
     * client's key for mutual authentication. By default, the key is assumed
     * not to be encrypted.
     * @property {string} [certfile] - Path to the client's certificate chain
     * file for mutual authentication. By default, mutual authentication is
     * disabled.
     * @property {boolean} [crlCheck=false] - Enable CRL checking for the
     * certificate chain leaf certificate. An error occurs if a suitable CRL
     * cannot be found. By default CRL checking is disabled.
     * @property {boolean} [crlCheckAll=false] - Enable CRL checking for the
     * entire certificate chain. An error occurs if a suitable CRL cannot be
     * found. By default CRL checking is disabled.
     * @property {boolean} [logSessionInfo=false] - Log session information for
     * each connection.
     * @property {boolean} [forLoginOnly=false] - Use TLS connections only for login
     * authentication. All other communication with the server will be done
     * with non-TLS connections. Default: false (Use TLS connections for all
     * communication with the server.)
     */
    if (typeof config.tls === 'object') {
      this.tls = config.tls
    }

    /**
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
     * @summary Global client policies.
     *
     * @description The configuration defines default policies for the
     * application. Policies define the behavior of the client, which can be
     * global for all uses of a single type of operation, or local to a single
     * use of an operation.
     *
     * Each database operation accepts a policy for that operation as an
     * argument. This is considered a local policy, and is a single use policy.
     * This local policy supersedes any global policy defined.
     *
     * If a value of the policy is not defined, then the rule is to fallback to
     * the global policy for that operation. If the global policy for that
     * operation is undefined, then the global default value will be used.
     *
     * If you find that you have behavior that you want every use of an
     * operation to utilize, then you can specify the default policy as
     * {@link Config#policies}.
     *
     * For example, the {@link Client#put} operation takes a {@link
     * WritePolicy} parameter. If you find yourself setting the {@link
     * WritePolicy#key} policy value for every call to {@link Client.put}, then
     * you may find it beneficial to set the global {@link WritePolicy} in
     * {@link Config#policies}, which all operations will use.
     *
     * @type {Config~Policies}
     *
     * @example <caption>Setting a default <code>key</code> policy for all write operations</caption>
     *
     * const Aerospike = require('aerospike')
     *
     * let config = {
     *   policies: {
     *     write: new Aerospike.WritePolicy({
     *       key: Aerospike.policy.key.SEND
     *     })
     *   }
     * }
     * let key = new Aerospike.Key('test', 'demo', 123)
     *
     * Aerospike.connect(config)
     *   .then(client => {
     *     return client.put(key, {int: 42})
     *       .then(() => client.close())
     *       .catch(error => {
     *         client.close()
     *         throw error
     *       })
     *   })
     *   .catch(console.error)
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
     * @property {Number} [log.level] - Log level; see {@link
     * module:aerospike.log} for details.
     * @property {Number} [log.file] - File descriptor returned by
     * <code>fs.open()</code> or one of <code>process.stdout.fd</code> or
     * <code>process.stderr.fd</code>.
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
     * the cluster for the first time.
     * @type {number}
     * @default 1000
     */
    if (Number.isInteger(config.connTimeoutMs)) {
      this.connTimeoutMs = config.connTimeoutMs
    }

    /**
     * @name Config#loginTimeoutMs
     * @summary Node login timeout in milliseconds.
     * @type {number}
     * @default 5000
     */
    if (Number.isInteger(config.loginTimeoutMs)) {
      this.loginTimeoutMs = config.loginTimeoutMs
    }

    /**
     * @name Config#tenderInterval
     * @summary Polling interval in milliseconds for cluster tender.
     * @type {number}
     * @default 1000
     */
    if (Number.isInteger(config.tenderInterval)) {
      this.tenderInterval = config.tenderInterval
    }

    /**
     * @name Config#maxConnsPerNode
     * @summary Maximum number of asynchronous connections allowed for each node.
     * @description New transactions will be rejected with an {@link
     * module:aerospike/status.ERR_NO_MORE_CONNECTIONS|ERR_NO_MORE_CONNECTIONS}
     * error if the limit would be exceeded.
     * @type {number}
     * @default 300
     */
    if (Number.isInteger(config.maxConnsPerNode)) {
      this.maxConnsPerNode = config.maxConnsPerNode
    }

    if (typeof config.modlua === 'object') {
      /**
       * @summary Configuration values for the mod-lua user path.
       * @description If you are using user-defined functions (UDF) for processing
       * query results (i.e. aggregations), then you will find it useful to set
       * the <code>modlua</code> settings. Of particular importance is the
       * <code>modelua.userPath</code>, which allows you to define a path to where
       * the client library will look for Lua files for processing.
       * @type {Object}
       *
       * @property {string} [modlua.userPath] - Path to user Lua scripts.
       */
      this.modlua = Object.assign({}, config.modlua)
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

    /**
     * @name Config#useAlternateAccessAddress
     * @summary Whether the client should use the server's
     * <code>alternate-access-address</code> instead of the
     * <code>access-address</code>.
     *
     * @type {boolean}
     * @default false
     * @since v3.7.1
     */
    this.useAlternateAccessAddress = Boolean(config.useAlternateAccessAddress)

    /**
     * @name Config#rackAware
     * @summary Track server rack data.
     * @description This field is useful when directing read commands to the
     * server node that contains the key and exists on the same rack as the
     * client. This serves to lower cloud provider costs when nodes are
     * distributed across different racks/data centers.
     *
     * {@link Config#rackId rackId} config, {@link
     * module:aerospike/policy.replica PREFER_RACK} replica policy, and server
     * rack configuration must also be set to enable this functionality.
     *
     * @type {boolean}
     * @default false
     * @since 3.8.0
     */
    this.rackAware = config.rackAware

    /**
     * @name Config#rackId
     * @summary Rack where this client instance resides.
     * @description {@link Config#rackAware rackAware} config, {@link
     * module:aerospike/policy.replica PREFER_RACK} replica policy, and server
     * rack configuration must also be set to enable this functionality.
     *
     * @type {number}
     * @default 0
     * @since 3.8.0
     */
    if (Number.isInteger(config.rackId)) {
      this.rackId = config.rackId
    }
  }

  /**
   * Set default policies from the given policy values.
   *
   * @param {Config~Policies} one or more default policies
   * @throws {TypeError} if any of the properties of the policies object is not
   * a valid policy type
   */
  setDefaultPolicies (policies) {
    for (const type in policies) {
      const values = policies[type]
      this.policies[type] = policy.createPolicy(type, values)
    }
  }

  /**
   * Custom inspector that masks the password property when printing the
   * config.
   *
   * @private
   */
  [inspect] () {
    const copy = Object.assign({}, this)
    if (this.password !== undefined) {
      Object.assign(copy, { password: '[FILTERED]' })
    }
    return copy
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
