// *****************************************************************************
// Copyright 2013-2024 Aerospike, Inc.
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

const net = require('net')
const policy = require('./policy')
const AerospikeError = require('./error')

const inspect = Symbol.for('nodejs.util.inspect.custom')

// Defaults the discovery checks use when an option is not set. They match the
// values the native layer passes to the C client: the tend interval and the
// DNS timeout are the C client's, the refresh timeout and the AWS timeout are
// the Java client's.
const DEFAULT_TEND_INTERVAL_MS = 1000
const DEFAULT_REFRESH_INTERVAL_MS = 30000
const DEFAULT_REFRESH_TIMEOUT_MS = 2000
const DEFAULT_TEND_REFRESH_DEADLINE_MS = 100
const DEFAULT_DNS_TIMEOUT_MS = 80
const DEFAULT_AWS_TIMEOUT_MS = 2000

// Discovery, translation and ipMap errors are AerospikeError with code
// ERR_CLIENT (-1), as in the Java client.
function configError (message) {
  return new AerospikeError(message)
}

// Copies obj without the keys whose value is null or undefined, which mean
// "use the default".
function withoutUnset (obj) {
  const copy = {}
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null) {
      copy[key] = value
    }
  }
  return copy
}

function validateIpMap (ipMap, name = 'ipMap') {
  if (typeof ipMap !== 'object' || Array.isArray(ipMap)) {
    throw configError(`${name} must be an object mapping host strings to host strings`)
  }
  for (const [orig, alt] of Object.entries(ipMap)) {
    if (orig === '' || typeof alt !== 'string' || alt === '') {
      throw configError(`${name} entry "${orig}" must map a non-empty host to a non-empty host string`)
    }
  }
}

function checkKeys (obj, name, allowed) {
  for (const key of Object.keys(obj)) {
    if (!allowed.includes(key)) {
      throw configError(`${name}.${key} is not a valid option; expected one of ${allowed.join(', ')}`)
    }
  }
}

function checkEnum (value, name, allowed) {
  if (value !== undefined && !allowed.includes(value)) {
    throw configError(`${name} must be one of ${allowed.map(v => `'${v}'`).join(', ')}`)
  }
}

function checkPositiveInteger (value, name, max = 0xffffffff) {
  if (value !== undefined && (!Number.isInteger(value) || value < 1 || value > max)) {
    throw configError(`${name} must be an integer from 1 to ${max}`)
  }
}

function checkObject (value, name) {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw configError(`${name} must be an object`)
  }
}

function checkNonEmptyString (value, name) {
  if (value !== undefined && (typeof value !== 'string' || value === '')) {
    throw configError(`${name} must be a non-empty string`)
  }
}

function checkStringArray (value, name) {
  if (value !== undefined && (!Array.isArray(value) || value.some(v => typeof v !== 'string' || v === ''))) {
    throw configError(`${name} must be an array of non-empty strings`)
  }
}

// A DNS server is an IP address with an optional port: "10.0.0.2",
// "10.0.0.2:53", "2001:db8::1" or "[2001:db8::1]:53", as in the Java client.
function checkDnsServer (server) {
  let host = server
  let port
  if (server.startsWith('[')) {
    const end = server.indexOf(']')
    if (end < 0 || (end + 1 < server.length && server[end + 1] !== ':')) {
      throw configError(`Invalid DNS seed provider server: '${server}'`)
    }
    host = server.substring(1, end)
    if (end + 1 < server.length) port = server.substring(end + 2)
  } else if (server.indexOf(':') === server.lastIndexOf(':') && server.includes(':')) {
    host = server.substring(0, server.indexOf(':'))
    port = server.substring(server.indexOf(':') + 1)
  }
  if (net.isIP(host) !== (host.includes(':') ? 6 : 4)) {
    throw configError(`Invalid DNS seed provider server: '${server}': expected an IP address`)
  }
  if (port !== undefined && !(/^\d+$/.test(port) && Number(port) >= 1 && Number(port) <= 65535)) {
    throw configError(`Invalid DNS seed provider server: '${server}': invalid port`)
  }
}

function normalizeDns (value) {
  checkObject(value, 'discovery.dns')
  const dns = withoutUnset(value)
  checkKeys(dns, 'discovery.dns', ['names', 'recordType', 'port', 'tlsName', 'timeoutMs', 'servers'])
  if (dns.names === undefined || (Array.isArray(dns.names) && dns.names.length === 0)) {
    throw configError('discovery.dns.names must list at least one DNS name')
  }
  checkStringArray(dns.names, 'discovery.dns.names')
  // Names are compared as absolute names, ignoring case, so "a.example" and
  // "A.example." are the same name.
  const seen = new Set()
  for (const name of dns.names) {
    if (name === '.' || name.includes(' ')) {
      throw configError(`Invalid DNS seed provider name: '${name}'`)
    }
    const absolute = (name.endsWith('.') ? name : name + '.').toLowerCase()
    if (seen.has(absolute)) {
      throw configError(`Invalid DNS seed provider names: duplicate name '${name}'`)
    }
    seen.add(absolute)
  }
  if (typeof dns.recordType === 'string') {
    dns.recordType = dns.recordType.toUpperCase()
  }
  checkEnum(dns.recordType, 'discovery.dns.recordType', ['A', 'SRV'])
  checkPositiveInteger(dns.port, 'discovery.dns.port', 65535)
  checkNonEmptyString(dns.tlsName, 'discovery.dns.tlsName')
  checkPositiveInteger(dns.timeoutMs, 'discovery.dns.timeoutMs')
  checkStringArray(dns.servers, 'discovery.dns.servers')
  if (dns.servers !== undefined) {
    dns.servers.forEach(checkDnsServer)
  }
  return dns
}

function normalizeAws (value) {
  checkObject(value, 'discovery.aws')
  const aws = withoutUnset(value)
  checkKeys(aws, 'discovery.aws', ['region', 'filters', 'addressField', 'port', 'tlsName',
    'timeoutMs', 'endpoint', 'caFile', 'caPath', 'accessKeyId', 'secretAccessKey', 'sessionToken'])
  if (typeof aws.region !== 'string' || !/^[a-z0-9]+(-[a-z0-9]+)+$/.test(aws.region)) {
    throw configError('discovery.aws.region must be an AWS region such as \'us-east-1\'')
  }
  if (!Array.isArray(aws.filters) || aws.filters.length === 0) {
    throw configError('discovery.aws.filters must list at least one filter')
  }
  const names = new Set()
  for (const filter of aws.filters) {
    checkObject(filter, 'discovery.aws.filters entry')
    checkKeys(filter, 'discovery.aws.filters entry', ['name', 'values'])
    if (typeof filter.name !== 'string' || filter.name === '') {
      throw configError('discovery.aws.filters entry name must be a non-empty string')
    }
    if (filter.name === 'instance-state-name') {
      throw configError('discovery.aws.filters must not filter on instance-state-name; only running instances are used')
    }
    if (names.has(filter.name)) {
      throw configError(`discovery.aws.filters lists "${filter.name}" more than once`)
    }
    names.add(filter.name)
    if (!Array.isArray(filter.values) || filter.values.length === 0) {
      throw configError(`discovery.aws.filters "${filter.name}" must list at least one value`)
    }
    checkStringArray(filter.values, `discovery.aws.filters "${filter.name}" values`)
  }
  checkEnum(aws.addressField, 'discovery.aws.addressField', ['privateIp', 'publicIp', 'privateDns', 'publicDns'])
  checkPositiveInteger(aws.port, 'discovery.aws.port', 65535)
  checkNonEmptyString(aws.tlsName, 'discovery.aws.tlsName')
  checkPositiveInteger(aws.timeoutMs, 'discovery.aws.timeoutMs')
  checkNonEmptyString(aws.endpoint, 'discovery.aws.endpoint')
  checkNonEmptyString(aws.caFile, 'discovery.aws.caFile')
  checkNonEmptyString(aws.caPath, 'discovery.aws.caPath')
  checkNonEmptyString(aws.accessKeyId, 'discovery.aws.accessKeyId')
  checkNonEmptyString(aws.secretAccessKey, 'discovery.aws.secretAccessKey')
  if (aws.sessionToken === '') delete aws.sessionToken
  checkNonEmptyString(aws.sessionToken, 'discovery.aws.sessionToken')
  if ((aws.accessKeyId === undefined) !== (aws.secretAccessKey === undefined)) {
    throw configError('discovery.aws.accessKeyId and discovery.aws.secretAccessKey must be set together')
  }
  if (aws.sessionToken !== undefined && aws.accessKeyId === undefined) {
    throw configError('discovery.aws.sessionToken needs discovery.aws.accessKeyId and discovery.aws.secretAccessKey')
  }
  return aws
}

// The limits the Java client checks for a provider that refreshes
// periodically (the dns and aws-tags providers): the refresh interval against
// the tend interval, and the provider's own timeout against the time it may
// take, which is refreshTimeoutMs in thread mode and tendRefreshDeadlineMs in
// tend mode.
function checkDiscoveryLimits (discovery, tendInterval) {
  const interval = discovery.refreshIntervalMs ?? DEFAULT_REFRESH_INTERVAL_MS
  if (interval < tendInterval) {
    throw configError(`Discovery refresh interval ${interval} must be greater or equal to the tend interval ${tendInterval}`)
  }

  const provider = discovery.provider === 'dns'
    ? { label: 'DNS seed provider', timeout: discovery.dns.timeoutMs ?? DEFAULT_DNS_TIMEOUT_MS }
    : { label: 'AWS EC2 seed provider', timeout: discovery.aws.timeoutMs ?? DEFAULT_AWS_TIMEOUT_MS }

  if (discovery.executionMode === 'tend') {
    if (discovery.provider === 'aws-tags') {
      throw configError("discovery.provider 'aws-tags' runs only in discovery.executionMode 'thread'")
    }
    const deadline = discovery.tendRefreshDeadlineMs ?? DEFAULT_TEND_REFRESH_DEADLINE_MS
    if (deadline > tendInterval / 2) {
      throw configError(`Invalid discovery tend refresh deadline: ${deadline}. Must be > 0 and <= tend interval / 2 (${Math.floor(tendInterval / 2)})`)
    }
    if (provider.timeout > deadline) {
      throw configError(`${provider.label} timeout ${provider.timeout} must be less or equal to the discovery tend refresh deadline ${deadline}`)
    }
    return
  }

  const timeout = discovery.refreshTimeoutMs ?? DEFAULT_REFRESH_TIMEOUT_MS
  if (provider.timeout > timeout) {
    throw configError(`${provider.label} timeout ${provider.timeout} must be less or equal to the discovery refresh timeout ${timeout}`)
  }
}

// Returns the discovery settings to pass to the native layer: unset values
// dropped, provider 'static' (the configured hosts only) dropped, and the
// record type in upper case.
function normalizeDiscovery (value, tendInterval) {
  checkObject(value, 'discovery')
  const discovery = withoutUnset(value)
  checkKeys(discovery, 'discovery', ['provider', 'dns', 'aws', 'mergePolicy', 'executionMode',
    'refreshIntervalMs', 'refreshTimeoutMs', 'tendRefreshDeadlineMs'])
  checkEnum(discovery.provider, 'discovery.provider', ['static', 'dns', 'aws-tags'])
  checkEnum(discovery.mergePolicy, 'discovery.mergePolicy', ['merge', 'replace', 'discoveryOnly'])
  checkEnum(discovery.executionMode, 'discovery.executionMode', ['thread', 'tend'])
  checkPositiveInteger(discovery.refreshIntervalMs, 'discovery.refreshIntervalMs')
  checkPositiveInteger(discovery.refreshTimeoutMs, 'discovery.refreshTimeoutMs')
  checkPositiveInteger(discovery.tendRefreshDeadlineMs, 'discovery.tendRefreshDeadlineMs')

  if (discovery.provider === 'static') {
    delete discovery.provider
  }
  if (discovery.dns !== undefined && discovery.provider !== 'dns') {
    throw configError("discovery.dns is only valid with discovery.provider 'dns'")
  }
  if (discovery.aws !== undefined && discovery.provider !== 'aws-tags') {
    throw configError("discovery.aws is only valid with discovery.provider 'aws-tags'")
  }

  if (discovery.provider === 'dns') {
    discovery.dns = normalizeDns(discovery.dns)
  } else if (discovery.provider === 'aws-tags') {
    discovery.aws = normalizeAws(discovery.aws)
  } else {
    return discovery
  }

  checkDiscoveryLimits(discovery, tendInterval)
  return discovery
}

// "host:port", with an IPv6 host in brackets, and a port from 1 to 65535.
function isHostPort (value) {
  const match = /^(\[[^\]]+\]|[^:[\]]+):(\d+)$/.exec(value)
  return match !== null && Number(match[2]) >= 1 && Number(match[2]) <= 65535
}

// Returns the translation settings to pass to the native layer. Provider
// 'static-map' is the ipMap translation, so it is dropped here and its
// staticMap, if any, becomes the ipMap.
function normalizeTranslation (value) {
  checkObject(value, 'translation')
  const translation = withoutUnset(value)
  checkKeys(translation, 'translation', ['provider', 'portMap', 'staticMap', 'onMiss'])
  checkEnum(translation.provider, 'translation.provider', ['static-map', 'port-map', 'pass-through'])
  checkEnum(translation.onMiss, 'translation.onMiss', ['passThrough', 'strict'])

  if (translation.portMap !== undefined && translation.provider !== 'port-map') {
    throw configError("translation.portMap is only valid with translation.provider 'port-map'")
  }
  if (translation.staticMap !== undefined && translation.provider !== 'static-map') {
    throw configError("translation.staticMap is only valid with translation.provider 'static-map'")
  }

  if (translation.provider === 'static-map') {
    if (translation.staticMap !== undefined) {
      validateIpMap(translation.staticMap, 'translation.staticMap')
    }
    delete translation.provider
    return translation
  }

  if (translation.provider === 'port-map') {
    checkObject(translation.portMap, 'translation.portMap')
    for (const [orig, alt] of Object.entries(translation.portMap)) {
      // A key is an advertised host:port, or a node name when it has no ':'.
      if (orig === '' || (orig.includes(':') && !isHostPort(orig))) {
        throw configError(`translation.portMap key "${orig}" must be a host:port or a node name`)
      }
      if (typeof alt !== 'string' || !isHostPort(alt)) {
        throw configError(`translation.portMap entry "${orig}" must map to a host:port string`)
      }
    }
  }
  return translation
}

class Config {
/**
 * @class Config
 * @classdesc config command.
 * The Config class contains the settings for an Aerospike client
 * instance, including the list of seed hosts, default policies, and other
 * settings.
 *
 * @type Class
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
 *       totalTimeout: 0
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
 *
 *
 * // Initializes a new client configuration from the given config values.
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
    // An empty cluster name is the same as none, as in the Java client.
    this.clusterName = config.clusterName === '' ? undefined : config.clusterName

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
     * back to use a default value of "localhost". With a
     * {@link Config#discovery} provider, there is no "localhost" default: the
     * provider can supply every seed host.
     * @type {(Host[] | string)}
     *
     * @example <caption>Setting <code>hosts</code> using a string:</caption>
     *
     * const Aerospike = require('aerospike')
     *
     * const hosts = '192.168.0.1:3000,192.168.0.2:3000'
     * const client = await Aerospike.connect({ hosts })
     *
     * @example <caption>Setting <code>hosts</code> using an array of hostname/port tuples:</caption>
     *
     * const Aerospike = require('aerospike')
     *
     * const hosts = [
     *   { addr: '192.168.0.1', port: 3000 },
     *   { addr: '192.168.0.2', port: 3000 }
     * ]
     * const client = await Aerospike.connect({ hosts })
     *
     * @example <caption>Setting <code>hosts</code> with TLS name using a string:</caption>
     *
     * const Aerospike = require('aerospike')
     *
     * const hosts = '192.168.0.1:example.com:3000,192.168.0.2:example.com:3000'
     * const client = await Aerospike.connect({ hosts })
     *
     * @example <caption>Setting <code>hosts</code> using an array of hostname/port/tlsname tuples:</caption>
     *
     * const Aerospike = require('aerospike')
     *
     * const hosts = [
     *   { addr: '192.168.0.1', port: 3000, tlsname: 'example.com' },
     *   { addr: '192.168.0.2', port: 3000, tlsname: 'example.com' }
     * ]
     * const client = await Aerospike.connect({ hosts })
     */
    // A seed provider other than 'static' finds the seeds, so there is no
    // localhost default.
    const provider = config.discovery !== undefined && config.discovery !== null
      ? config.discovery.provider
      : undefined
    const hasProvider = provider !== undefined && provider !== null && provider !== 'static'
    this.hosts = config.hosts || process.env.AEROSPIKE_HOSTS || (hasProvider ? [] : `localhost:${this.port}`)

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
     * @type {Policies}
     *
     * @example <caption>Setting a default <code>key</code> policy for all write operations</caption>
     *
     * const Aerospike = require('aerospike')
     *
     * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
     * var config = {
     *   hosts: '192.168.33.10:3000',
     *   policies: {
     *     write: new Aerospike.WritePolicy({
     *       key: Aerospike.policy.key.SEND,
     *       socketTimeout : 0,
     *       totalTimeout : 0
     *     })
     *   }
     * }
     *
     * let key = new Aerospike.Key('test', 'demo', 123)
     *
     * Aerospike.connect(config)
     *   .then(client => {
     *     return client.put(key, {int: 42})
     *       .then(() => client.close())
     *       .catch(error => {
     *         throw error
     *         client.close()
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
     *
     * const fs = require('fs')
     *
     * var debuglog = fs.openSync('./debug.log', 'w')
     * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
     * var config = {
     *   hosts: '192.168.33.10:3000',
     *   log: {
     *     level: Aerospike.log.DEBUG,
     *     file: debuglog
     *   }
     * }
     * Aerospike.connect(config, (err, client) => {
     *   if (err) throw err
     *   console.log("Connected. Now closing connection.")
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
     * @name Config#maxSocketIdle
     *
     * @summary Maximum socket idle time in seconds.
     *
     * @description Connection pools will discard sockets that have been idle
     * longer than the maximum. The value is limited to 24 hours (86400).
     *
     * It's important to set this value to a few seconds less than the server's
     * <code>proto-fd-idle-ms</code> (default 60000 milliseconds or 1 minute),
     * so the client does not attempt to use a socket that has already been
     * reaped by the server.
     *
     * Connection pools are now implemented by a LIFO stack. Connections at the
     * tail of the stack will always be the least used. These connections are
     * checked for <code>maxSocketIdle</code> once every 30 tend iterations
     * (usually 30 seconds).
     *
     * @type {number}
     *
     * @default 0 seconds
     */
    if (Number.isInteger(config.maxSocketIdle)) {
      this.maxSocketIdle = config.maxSocketIdle
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
     *
     * @summary Maximum number of asynchronous connections allowed per server node.
     *
     * @description New transactions will be rejected with an {@link
     * module:aerospike/status.ERR_NO_MORE_CONNECTIONS|ERR_NO_MORE_CONNECTIONS}
     * error if the limit would be exceeded.
     *
     * @type {number}
     *
     * @default 100
     */
    if (Number.isInteger(config.maxConnsPerNode)) {
      this.maxConnsPerNode = config.maxConnsPerNode
    }

    /**
     * @name Config#maxErrorRate
     *
     * @summary Maximum number of errors allowed per node per error_rate_window before backoff algorithm returns
     * AEROSPIKE_MAX_ERROR_RATE for database commands to that node. If max_error_rate is zero, there is no error limit.
     * The counted error types are any error that causes the connection to close (socket errors and client timeouts),
     * server device overload and server timeouts.
     *
     * The application should backoff or reduce the transaction load until AEROSPIKE_MAX_ERROR_RATE stops being returned.
     *
     * @description If the backoff algorithm has been activated, transactions will fail with {@link
     * module:aerospike/status.AEROSPIKE_MAX_ERROR_RATE|AEROSPIKE_MAX_ERROR_RATE} until the {@link Config#errorRateWindow} has passed and the
     * error count has been reset.
     *
     * @type {number}
     *
     * @default 100
     */
    if (Number.isInteger(config.maxErrorRate)) {
      this.maxErrorRate = config.maxErrorRate
    }

    /**
     * @name Config#errorRateWindow
     *
     * @summary The number of cluster tend iterations that defines the window for {@link Config#maxErrorRate} to be surpassed. One tend iteration is defined
     * as {@link Config#tendInterval} plus the time to tend all nodes. At the end of the window, the error count is reset to zero and backoff state is removed on all nodes.
     *
     * @type {number}
     *
     * @default 1
     */
    if (Number.isInteger(config.errorRateWindow)) {
      this.errorRateWindow = config.errorRateWindow
    }

    /**
     * @name Config#minConnsPerNode
     *
     * @summary Minimum number of asynchronous connections allowed per server node.
     *
     * @description Preallocate min connections on client node creation. The
     * client will periodically allocate new connections if count falls below
     * min connections.
     *
     * Server <code>proto-fd-idle-ms</code> may also need to be increased
     * substantially if min connections are defined. The
     * <code>proto-fd-idle-ms</code> default directs the server to close
     * connections that are idle for 60 seconds which can defeat the purpose of
     * keeping connections in reserve for a future burst of activity.
     *
     * If server <code>proto-fd-idle-ms</code> is changed, client {@link
     * Config#maxSocketIdle} should also be changed to be a few seconds less
     * than <code>proto-fd-idle-ms</code>.
     *
     * @type {number}
     * @default 0
     */
    if (Number.isInteger(config.minConnsPerNode)) {
      this.minConnsPerNode = config.minConnsPerNode
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
     * data partition maps. Each shared memory segment contains state for one
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
    this.rackIds = config.rackIds

    /**
     * @name Config#ipMap
     * @summary Map of host addresses the server reports to the addresses
     * the client should use instead.
     * @description Applies to seed hosts and to the addresses of peer nodes
     * found while tending the cluster. Useful when the server reports
     * internal addresses that the client can't reach.
     *
     * Only the host is replaced; the port stays the same. Keys must match
     * the address exactly as the server reports it, for example the same
     * IPv6 spelling, or an IP rather than a hostname. An address with no
     * entry is used as it is, unless {@link Config#translation} sets
     * <code>onMiss: 'strict'</code>, which skips that node.
     *
     * The same map can be set as <code>translation.staticMap</code> with
     * <code>translation.provider: 'static-map'</code>; set one or the other.
     *
     * @type {Object<string, string>}
     * @default undefined
     * @throws {AerospikeError} With code {@link module:aerospike/status.ERR_CLIENT}
     * if ipMap is not an object of non-empty strings.
     *
     * @example
     *
     * const config = {
     *   hosts: '10.0.0.5:3000',
     *   ipMap: {
     *     '10.0.0.5': 'gw.example.com',
     *     '10.0.0.6': 'gw2.example.com'
     *   }
     * }
     */
    if (config.ipMap !== undefined && config.ipMap !== null) {
      validateIpMap(config.ipMap)
      this.ipMap = config.ipMap
    }

    /**
     * @name Config#discovery
     * @summary Where the client finds its seed hosts, in addition to or
     * instead of {@link Config#hosts}.
     * @description <code>provider</code> picks the seed provider:
     * <code>'static'</code> (default) uses only <code>hosts</code>;
     * <code>'dns'</code> resolves DNS names to seed hosts; <code>'aws-tags'</code>
     * lists running EC2 instances by tag. The dns and aws-tags providers run
     * at connect and then refresh the seeds while the client runs.
     *
     * The other settings apply to any provider:
     * <ul>
     * <li><code>mergePolicy</code>: how discovered seeds combine with
     * <code>hosts</code>. <code>'merge'</code> (default) uses
     * <code>hosts</code> first, then the discovered seeds; use it while
     * <code>hosts</code> is still a reliable way in. <code>'replace'</code>
     * does the same at connect, then lets each later refresh replace the list
     * (an empty result keeps the previous list); use it when
     * <code>hosts</code> may go stale. <code>'discoveryOnly'</code> uses only
     * the discovered seeds, and <code>hosts</code> when discovery returns
     * none; use it when <code>hosts</code> is only an emergency fallback.</li>
     * <li><code>executionMode</code>: where refreshes run:
     * <code>'thread'</code> (default, a client-owned thread) or
     * <code>'tend'</code> (the tend thread, within
     * <code>tendRefreshDeadlineMs</code>). aws-tags runs only in thread
     * mode.</li>
     * <li><code>refreshIntervalMs</code> (default 30000),
     * <code>refreshTimeoutMs</code> (default 2000, thread mode) and
     * <code>tendRefreshDeadlineMs</code> (default 100, tend mode). A refresh
     * that runs past <code>refreshTimeoutMs</code> is logged, and its result
     * is still used when it arrives.</li>
     * </ul>
     *
     * <code>dns</code> options: <code>names</code> (required; names that
     * differ only in case or a trailing dot are duplicates),
     * <code>recordType</code> (<code>'A'</code> for A and AAAA records, the
     * default, or <code>'SRV'</code>, in either case), <code>port</code> (for
     * A records, default 3000), <code>tlsName</code>, <code>timeoutMs</code>
     * (default 80, for one whole refresh) and <code>servers</code> (resolver
     * IP addresses, each with an optional port; default: the system
     * resolvers).
     *
     * <code>aws</code> options: <code>region</code> and <code>filters</code>
     * (<code>[{ name, values }]</code>, for example
     * <code>{ name: 'tag:aerospike-cluster', values: ['prod'] }</code>) are
     * required; <code>addressField</code> (<code>'privateIp'</code>, the
     * default, <code>'publicIp'</code>, <code>'privateDns'</code> or
     * <code>'publicDns'</code>), <code>port</code> (default 3000),
     * <code>tlsName</code>, <code>timeoutMs</code> (default 2000),
     * <code>endpoint</code>, <code>caFile</code>, <code>caPath</code>, and
     * static credentials <code>accessKeyId</code>,
     * <code>secretAccessKey</code> and <code>sessionToken</code>. Without
     * static credentials the client uses the standard AWS chain: environment
     * variables, the shared credentials file, EKS web identity, ECS and EKS
     * Pod Identity, and EC2 instance metadata.
     *
     * With any policy, a discovery failure at connect falls back to
     * <code>hosts</code>, and a failed refresh after connect keeps the
     * previous seeds. If discovery fails at connect and there are no
     * <code>hosts</code>, connect fails with
     * {@link module:aerospike/status.ERR_SEED_DISCOVERY_FAILED}.
     *
     * For the dns and aws-tags providers, <code>refreshIntervalMs</code> must
     * be at least {@link Config#tenderInterval}, and the provider's
     * <code>timeoutMs</code> must not exceed <code>refreshTimeoutMs</code>
     * (thread mode) or <code>tendRefreshDeadlineMs</code> (tend mode, at most
     * half the tend interval).
     *
     * <code>connect()</code> can wait up to <code>refreshTimeoutMs</code> for
     * the first seeds. The combined seed list has each <code>host:port</code>
     * once; the first occurrence wins, with its TLS name. If the client loses
     * every node, it re-seeds on the next tend and, in thread mode, asks for a
     * refresh at once (at most once per <code>refreshIntervalMs</code>). In
     * tend mode the deadline is declared, not enforced: a refresh that runs
     * past it is logged and discarded, and after three in a row the provider
     * stops and the seeds found at connect are used until a new client is
     * created. The aws-tags provider needs only the
     * <code>ec2:DescribeInstances</code> permission and sees only the
     * credentials' own account and region. These settings are not dynamic
     * config: a config file can't set or change them.
     *
     * @type {Object}
     * @default undefined
     * @throws {AerospikeError} With code {@link module:aerospike/status.ERR_CLIENT}
     * if an option is unknown, has an invalid value, or breaks one of the
     * limits above.
     *
     * @example
     *
     * const config = {
     *   discovery: {
     *     provider: 'dns',
     *     dns: { names: ['_aerospike._tcp.example.com'], recordType: 'SRV' }
     *   }
     * }
     */
    if (config.discovery !== undefined && config.discovery !== null) {
      this.discovery = normalizeDiscovery(config.discovery, this.tenderInterval ?? DEFAULT_TEND_INTERVAL_MS)
    }

    /**
     * @name Config#translation
     * @summary How the client translates the addresses that nodes advertise
     * into addresses it can reach.
     * @description
     * <ul>
     * <li><code>provider: 'static-map'</code> (default): replaces advertised
     * hosts using <code>staticMap</code>, which is the same as
     * {@link Config#ipMap}; set one or the other.</li>
     * <li><code>provider: 'port-map'</code> with <code>portMap</code>: maps an
     * advertised <code>host:port</code>, or a node name, to the
     * <code>host:port</code> to connect to. IPv6 hosts go in brackets.</li>
     * <li><code>provider: 'pass-through'</code>: uses every advertised address
     * as it is.</li>
     * <li><code>onMiss</code>: what happens to an advertised address the
     * provider doesn't map, including with {@link Config#ipMap}:
     * <code>'passThrough'</code> (default) connects to it anyway,
     * <code>'strict'</code> skips that node.</li>
     * </ul>
     *
     * <code>'port-map'</code> and <code>'pass-through'</code> apply to the peer
     * addresses found while tending the cluster, never to configured seed
     * hosts, and while one of them is set {@link Config#ipMap} is ignored (the
     * client logs a warning at connect). <code>portMap</code> keys are the
     * addresses the client reads: the alternate ones when
     * {@link Config#useAlternateAccessAddress} is on. <code>'pass-through'</code>
     * works only when every node advertises an address the client can reach.
     * Translation never changes a node's TLS name. On AWS, a port per node
     * behind one load balancer endpoint allows at most 50 nodes.
     *
     * A node skipped by a <code>'strict'</code> miss is logged at warning
     * level and checked again on every tend; the client keeps serving through
     * the other nodes. When a new node translates to the address of a node the
     * client already uses, the new node is skipped; when two new nodes
     * translate to the same address, both are skipped.
     *
     * Connect fails with {@link module:aerospike/status.ERR_TRANSLATION_MISS}
     * or {@link module:aerospike/status.ERR_TRANSLATION_COLLISION} when no
     * node can be connected because of it, or when a node was skipped for it
     * at connect while another node could not be reached.
     *
     * @type {Object}
     * @default undefined
     * @throws {AerospikeError} With code {@link module:aerospike/status.ERR_CLIENT}
     * if an option is unknown or has an invalid value, or if both
     * <code>staticMap</code> and {@link Config#ipMap} are set.
     *
     * @example
     *
     * const config = {
     *   hosts: 'gw.example.com:31000',
     *   translation: {
     *     provider: 'port-map',
     *     portMap: {
     *       '10.0.0.1:3000': 'gw.example.com:31001',
     *       '10.0.0.2:3000': 'gw.example.com:31002'
     *     },
     *     onMiss: 'strict'
     *   }
     * }
     */
    if (config.translation !== undefined && config.translation !== null) {
      const translation = normalizeTranslation(config.translation)
      if (translation.staticMap !== undefined) {
        if (this.ipMap !== undefined) {
          throw configError('Set translation.staticMap or ipMap, not both')
        }
        this.ipMap = translation.staticMap
        delete translation.staticMap
      }
      this.translation = translation
    }

    this.configProvider = config.configProvider

    this.appId = config.appId
  }

  /**
   * Set default policies from the given policy values.
   *
   * @param {Policies} one or more default policies
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

module.exports = Config
