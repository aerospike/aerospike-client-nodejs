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

/**
 * @class Config
 * @classdesc Configuration for an Aerospike client instance.
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 * const config = {
 *   user: process.env.DATABASE_USER,
 *   password: process.env.DATABASE_PASSWORD,
 *   hosts: '192.168.1.42:3000',
 *   log: {
 *     level: Aerospike.log.INFO,
 *     file: 2 // log to stderr
 *   }
 * }
 * Aerospike.connect(config, function (error, client) {
 *   if (error) {
 *     console.error('Failed to connect to cluster: %s', error.message)
 *     process.exit()
 *   }
 *   // client is ready to accept commands
 *   client.close()
 * })
 */
function Config (config) {
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
   * @name Config#clusterID
   * @summary Expected cluster ID.
   * @description If not <code>null</code>, server nodes must return this cluster ID
   * in order to join the client's view of the cluster. Should only be set when
   * connecting to servers that support the "cluster-id" info command.
   * @type {string}
   * @since v2.4
   */
  this.clusterID = config.clusterID

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
  this.hosts = config.hosts || process.env.AEROSPIKE_HOSTS || 'localhost:3000'

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
   * @property {boolean} [encryptOnly=false] - Only encrypt connections; do not
   * verify certificates. By default TLS will verify certificates.
   * @property {string} [cafile] - Path to a trusted CA certificate file. By
   * default TLS will use system standard trusted CA certificates.
   * @property {string} [capath] - Path to a directory of trusted certificates.
   * See the OpenSSL SSL_CTX_load_verify_locations manual page for more
   * information about the format of the directory.
   * @property {string} [protocol] - Specifies enabled protocols. The format is
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
   * @property {boolean} [crlCheck=false] - Enable CRL checking for the
   * certificate chain leaf certificate. An error occurs if a suitable CRL
   * cannot be found. By default CRL checking is disabled.
   * @property {boolean} [crlCheckAll=false] - Enable CRL checking for the
   * entire certificate chain. An error occurs if a suitable CRL cannot be
   * found. By default CRL checking is disabled.
   * @property {string} [certBlacklist] - Path to a certificate blacklist file.
   * The file should contain one line for each blacklisted certificate. Each
   * line starts with the certificate serial number expressed in hex. Each
   * entry may optionally specify the issuer name of the certificate. (Serial
   * numbers are only required to be unique per issuer.) Example records:
   * <code><br>867EC87482B2 /C=US/ST=CA/O=Acme/OU=Engineering/CN=Test Chain CA<br>
   * E2D4B0E570F9EF8E885C065899886461</code>
   *
   */
  if (typeof config.tls === 'object') {
    this.tls = config.tls
  }

  /**
   * @name Config#policies
   * @summaries Global client policies.
   * @description A policy is a set of values which modify the behavior of an
   * operation, like timeouts or how an operation handles data. The policies
   * defined in the configuration are used as global defaults, which can be
   * overridden by individual operations as needed.
   * @type {Object}
   *
   * @example <caption>Setting a default timeout value</caption>
   *
   * const Aerospike = require('aerospike')
   *
   * var config = {
   *   policies: {
   *     timeout: 100
   *   }
   * }
   * Aerospike.connect(config, (err, client) => {
   *   if (err) throw err
   *   var key = new Aerospike.Key('test', 'demo', 123)
   *
   *   // use default timeout policy
   *   client.put(key, {x: 42}, (err) => {
   *     if (err) throw err
   *
   *     // override global timeout policy
   *     client.get(key, { timeout: 200 }, (err, record) => {
   *       if (err) throw err
   *       console.log(record)
   *       client.close()
   *     })
   *   })
   * })
   */
  if (typeof config.policies === 'object') {
    this.policies = config.policies
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
   * <code>AEROSPIKE_ERR_NO_MORE_CONNECTIONS</code> error if the limit would be
   * exceeded. Default is 300.
   * @type {number}
   */
  if (Number.isInteger(config.maxConnsPerNode)) {
    this.maxConnsPerNode = config.maxConnsPerNode
  }

   /**
    * @name Config#modlua
    * @summary Configuration values for the mod-lua system and user paths.
    * @type {Object}
    *
    * @property {string} [modlua.systemPath] - Path to system Lua scripts.
    * @property {string} [modlua.userPath] - Path to user Lua scripts.
    */
  if (typeof config.modlua === 'object') {
    // TODO: reimplement logic to determine default paths (see conversions.cc)
    this.modlua = config.modlua
  }

  /**
   * @name Config#sharedMemory
   * @summary Shared memory configuration.
   * @description This allows multiple client instances running in separate
   * processes on the same machine to share cluster status, including nodes and
   * data partion maps.
   * @type {Object}
   * @see {@link http://www.aerospike.com/docs/client/c/usage/shm.html#operational-notes|Operational Notes}
   * @tutorial node_clusters
   *
   * @property {boolean} [enable=true] - Whether to enable/disable usage of
   * shared memory.
   * @property {number} key - Key used to identify the shared
   * memory segment; the same key needs to be used on all client instances.
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

module.exports = Config
