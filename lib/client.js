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

const path = require('path')
const util = require('util')
const EventEmitter = require('events')

const as = require('bindings')('aerospike.node')
const AerospikeError = require('./error')
const Context = require('./cdt_context')
const Commands = require('./commands')
const Config = require('./config')
const EventLoop = require('./event_loop')
const IndexJob = require('./index_job')
const Query = require('./query')
const Scan = require('./scan')
const UdfJob = require('./udf_job')
const operations = require('./operations')
const utils = require('./utils')

// number of client instances currently connected to any Aerospike cluster
let _connectedClients = 0

// callback function for cluster events (node added/removed, etc.)
function eventsCallback (event) {
  /**
   * @event Client#nodeAdded
   * @type {object}
   * @property {string} nodeName - Name of the cluster node that triggered this event.
   * @property {string} nodeAddress - IP address & port of the cluster node that triggered this event.
   * @since v2.7.0
   */

  /**
   * @event Client#nodeRemoved
   * @type {object}
   * @property {string} nodeName - Name of the cluster node that triggered this event.
   * @property {string} nodeAddress - IP address & port of the cluster node that triggered this event.
   * @since v2.7.0
   */

  /**
   * @event Client#disconnected
   * @since v2.7.0
   *
   * @example
   *
   * const Aerospike = require('aerospike')
   *
   * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
   * var config = {
   *   hosts: '192.168.33.10:3000',
   * }
   *
   * Aerospike.connect(config, (error, client) => {
   *   if (error) throw error
   *
   *   client.on('disconnected', () => {
   *     console.log('Client got disconnected from cluster')
   *   })
   *
   *   // client is now ready to accept commands, e.g. get/put/...
   *   client.close()
   * })
   */
  this.emit(event.name, event)

  /**
   * @event Client#event
   * @description Instead of adding listeners for the {@link
   * event:Client#nodeAdded|nodeAdded}, {@link
   * event:Client#nodeRemoved|nodeRemoved} and {@link
   * event:Client#disconnected|disconnected} events, applications can also
   * subscribe to the <code>event</code> event to receive callbacks for any
   * kind of cluster event.
   *
   * @type {object}
   * @property {string} name - Name of the event.
   * @property {string} [nodeName] - Name of the cluster node that triggered this event.
   * @property {string} [nodeAddress] - IP address & port of the cluster node that triggered this event.
   * @since v2.7.0
   *
   * @example
   *
   * const Aerospike = require('aerospike')
   *
   * Aerospike.connect((error, client) => {
   *   if (error) throw error
   *
   *   client.on('event', (event) => {
   *     var now = new Date().toUTCString()
   *     console.log(now, event.name, event.nodeName)  // Example output:
   *                  // Thu, 13 Jul 2017 06:47:35 GMT nodeAdded BB94DC07D270009
   *                  // Thu, 13 Jul 2017 06:47:35 GMT nodeAdded C1D4DC0AD270002
   *                  // Thu, 13 Jul 2017 06:48:52 GMT nodeRemoved C1D4DC0AD270002
   *                  // Thu, 13 Jul 2017 06:49:08 GMT nodeRemoved BB94DC07D270009
   *                  // Thu, 13 Jul 2017 06:49:08 GMT disconnected
   *   })
   *
   *   // client is now ready to accept commands, e.g. get/put/...
   *   client.close()
   * })
   */
  this.emit('event', event)
}

/**
 * @class Client
 * @classdesc Aerospike client
 *
 * @summary Construct a new Aerospike client instance.
 *
 * @param {Config} config - Configuration used to initialize the client.
 */
function Client (config) {
  EventEmitter.call(this)

  /**
   * @name Client#config
   *
   * @summary A copy of the configuration with which the client was initialized.
   *
   * @type {Config}
   */
  this.config = new Config(config)

  /** @private */
  this.as_client = as.client(this.config)

  /** @private */
  this.connected = false

  /**
   * @name Client#captureStackTraces
   *
   * @summary Set to <code>true</code> to enable capturing of debug stacktraces for
   * every database command.
   *
   * @description The client will capture a stacktrace before each database
   * command is executed, instead of capturing the stacktrace only when an
   * error is raised. This generally results in much more useful stacktraces
   * that include stackframes from the calling application issuing the database
   * command.
   *
   * **Note:** Enabling this feature incurs a significant performance overhead for
   * every database command. It is recommended to leave this feature disabled
   * in production environments.
   *
   * By default, the client will set this flag to true, if the
   * <code>AEROSPIKE_DEBUG_STACKTRACES</code> environment variable is set (to
   * any value).
   *
   * @type {boolean}
   * @default <code>true</code>, if
   * <code>process.env.AEROSPIKE_DEBUG_STACKTRACES</code> is set;
   * <code>false</code> otherwise.
   */
  this.captureStackTraces = !!process.env.AEROSPIKE_DEBUG_STACKTRACES
}

util.inherits(Client, EventEmitter)

/**
 * @private
 */
Client.prototype.asExec = function (cmd, args) {
  return this.as_client[cmd].apply(this.as_client, args)
}

/**
 * @function Client#getNodes
 *
 * @summary Returns a list of all cluster nodes known to the client.
 *
 * @return {Array.<{name: string, address: string}>} List of node objects
 *
 * @since v2.6.0
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 *
 * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
 * var config = {
 *   hosts: '192.168.33.10:3000',
 * }
 *
 * Aerospike.connect(config, (error, client) => {
 *   if (error) throw error
 *   console.log(client.getNodes()) // [ { name: 'SAMPLEADDRESS', address: 'SAMPLENAME' }, ...]
 *   client.close()
 * })
 *
 */
Client.prototype.getNodes = function () {
  return this.as_client.getNodes()
}

/**
 * @function Client#contextToBase64
 *
 * @summary Returns a serialized CDT Context
 *
 * @param {Object} context - {@link CdtContext}
 *
 * @return {String} serialized context - base64 representation of the CDT Context
 *
 * @since v5.6.0
 *
 * @example <caption>How to use CDT context serialization</caption>
 *
 * const Aerospike = require('aerospike');
 * const Context = Aerospike.cdt.Context
 * // Define host configuration
 * let config = {
 *   hosts: '192.168.33.10:3000',
 *   policies: {
 *     operate : new Aerospike.OperatePolicy({socketTimeout : 0, totalTimeout : 0}),
 *     write : new Aerospike.WritePolicy({socketTimeout : 0, totalTimeout : 0}),
 *     read : new Aerospike.ReadPolicy({socketTimeout : 0, totalTimeout : 0})
 *   }
 * }
 *
 *
 * Aerospike.connect(config, async (error, client) => {
 *   // Create a context
 *   let context = new Context().addMapKey('nested')
 *
 *   // Create keys for records to be written
 *   let recordKey = new Aerospike.Key('test', 'demo', 'record')
 *   let contextKey = new Aerospike.Key('test', 'demo', 'context')
 *
 *   // Put record with a CDT
 *   await client.put(recordKey, {exampleBin: {nested: {food: 'blueberry', drink: 'koolaid'}}})
 *
 *   // Test the context with client.operate()
 *   var ops = [
 *     Aerospike.maps.getByKey('exampleBin', 'food', Aerospike.maps.returnType.KEY_VALUE).withContext(context)
 *   ]
 *   let results = await client.operate(recordKey, ops)
 *   console.log(results.bins.exampleBin) // [ 'food', 'blueberry' ]
 *
 *   // Serialize CDT Context
 *   let serializedContext = client.contextToBase64(context)
 *
 *   // Put record with bin containing the serialized record
 *   await client.put(contextKey, {context: serializedContext})
 *
 *   // Get context when needed for operation
 *   let contextRecord = await client.get(contextKey)
 *
 *   // Deserialize CDT Context
 *   context = client.contextFromBase64(contextRecord.bins.context)
 *
 *   // Test the context with client.operate()
 *   ops = [
 *     Aerospike.maps.getByKey('exampleBin', 'food', Aerospike.maps.returnType.KEY_VALUE).withContext(context)
 *   ]
 *   results = await client.operate(recordKey, ops)
 *   console.log(results.bins.exampleBin) // [ 'food', 'blueberry' ]
 *
 *   // Close the client
 *   client.close()
 * })
 */
Client.prototype.contextToBase64 = function (context) {
  return this.as_client.contextToBase64({ context })
}

/**
 * @function Client#contextFromBase64
 *
 * @summary Returns a deserialized CDT Context
 *
 * @param {String} serializedContext - base64 serialized {@link CdtContext}
 *
 * @return {CdtContext} Deserialized CDT Context
 *
 * @since v5.6.0
 *
 */
Client.prototype.contextFromBase64 = function (serializedContext) {
  const context = new Context()
  context.items = this.as_client.contextFromBase64({ context: serializedContext })
  return context
}

/**
 * @function Client#changePassword
 *
 * @summary Change a user's password.
 *
 * @param {String} user - User name for the password change.
 * @param {String} password - User password in clear-text format.
 * @param {Object} policy - Optional {@link AdminPolicy}.
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 *
 * function wait (ms) {
 *     return new Promise(resolve => setTimeout(resolve, ms))
 * }
 *
 * ;(async function () {
 *   let client
 *   try {
 *     client = await Aerospike.connect({
 *         hosts: '192.168.33.10:3000',
 *         policies: {
 *           write : new Aerospike.WritePolicy({socketTimeout : 1, totalTimeout : 1}),
 *         },
 *         // Must have security enabled in server configuration before user and password configurations can be used.
 *         user: 'admin',
 *         password: 'admin'
 *     })
 *
 *     // User must be created before password is changed. See {@link Client#createUser} for an example.
 *     client.changePassword("khob", "TryTiger7!", ["Engineer"])
 *   } catch (error) {
 *     console.error('Error:', error)
 *     process.exit(1)
 *   } finally {
 *     if (client) client.close()
 *   }
 * })()
 */
Client.prototype.changePassword = function (user, password, policy) {
  const cmd = new Commands.ChangePassword(this, [user, password, policy, this.config.user])
  cmd.execute()
}

/**
 * @function Client#createUser
 *
 * @summary Create user with password and roles. Clear-text password will be hashed using bcrypt before sending to server.
 *
 * @param {String} user - User name for the new user.
 * @param {String} password - User password in clear-text format.
 * @param {Array.<String>} roles - Optional array of role names. For more information on roles, see {@link Role}.
 * @param {Object} policy - Optional {@link AdminPolicy}.
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 *
 * function wait (ms) {
 *     return new Promise(resolve => setTimeout(resolve, ms))
 * }
 *
 * ;(async function () {
 *   let client
 *   try {
 *     client = await Aerospike.connect({
 *         hosts: '192.168.33.10:3000',
 *         policies: {
 *           write : new Aerospike.WritePolicy({socketTimeout : 1, totalTimeout : 1}),
 *         },
 *         // Must have security enabled in server configuration before user and password configurations can be used.
 *         user: 'admin',
 *         password: 'admin'
 *     })
 *
 *     client.createUser("khob", "MightyMice55!", ["Engineer"])
 *     // Must wait a short length of time of the user to be fully created.
 *     await wait(5)
 *     const user = await client.queryUser("khob", null)
 *     console.log(user)
 *   } catch (error) {
 *     console.error('Error:', error)
 *     process.exit(1)
 *   } finally {
 *     if (client) client.close()
 *   }
 * })()
 */
Client.prototype.createUser = function (user, password, roles, policy) {
  const cmd = new Commands.UserCreate(this, [user, password, roles, policy])
  cmd.execute()
}

/**
 * @function Client#createRole
 *
 * @summary Create user defined role with optional privileges, whitelist and read/write quotas.
 * Quotas require server security configuration "enable-quotas" to be set to true.
 *
 * @param {String} roleName - role name
 * @param {Array.<Privilege>} privileges - List of privileges assigned to a role.
 * @param {Object} policy - Optional {@link AdminPolicy}.
 * @param {Array.<String>} whitelist - Optional list of allowable IP addresses assigned to role. IP addresses can contain wildcards (ie. 10.1.2.0/24).
 * @param {Number} readQuota - Optional maximum reads per second limit, pass in zero for no limit.
 * @param {Number} writeQuota - Optional maximum writes per second limit, pass in zero for no limit.
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 *
 * function wait (ms) {
 *     return new Promise(resolve => setTimeout(resolve, ms))
 * }
 *
 * ;(async function () {
 *   let client
 *   try {
 *     client = await Aerospike.connect({
 *         hosts: '192.168.33.10:3000',
 *         policies: {
 *           write : new Aerospike.WritePolicy({socketTimeout : 1, totalTimeout : 1}),
 *         },
 *         // Must have security enabled in server configuration before user and password configs can be used.
 *         user: 'admin',
 *         password: 'admin'
 *     })
 *
 *     client.createRole("Engineer", [new Aerospike.admin.Privilege(Aerospike.privilegeCode.READ_WRITE), new Aerospike.admin.Privilege(Aerospike.privilegeCode.TRUNCATE)], null)
 *     // Must wait a short length of time of the role to be fully created.
 *     await wait(5)
 *     const role = await client.queryRole("Engineer", null)
 *     console.log(role)
 *   } catch (error) {
 *     console.error('Error:', error)
 *     process.exit(1)
 *   } finally {
 *     if (client) client.close()
 *   }
 * })()
 */
Client.prototype.createRole = function (roleName, privileges, policy, whitelist, readQuota, writeQuota) {
  const cmd = new Commands.RoleCreate(this, [roleName, privileges, policy, whitelist, readQuota, writeQuota])
  cmd.execute()
}

/**
 * @function Client#dropRole
 *
 * @summary Drop user defined role.
 *
 * @param {String} roleName - role name
 * @param {Object} policy - Optional {@link AdminPolicy}.
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 *
 * function wait (ms) {
 *     return new Promise(resolve => setTimeout(resolve, ms))
 * }
 *
 * ;(async function () {
 *   let client
 *   try {
 *     client = await Aerospike.connect({
 *         hosts: '192.168.33.10:3000',
 *         policies: {
 *           write : new Aerospike.WritePolicy({socketTimeout : 1, totalTimeout : 1}),
 *         },
 *         // Must have security enabled in server configuration before user and password configurations can be used.
 *         user: 'admin',
 *         password: 'admin'
 *     })
 *
 *     // A role must be created before a role can be dropped. See {@link Client#createRole} for an example.
 *     client.dropRole("Engineer")
 *     // Must wait a short length of time of the role to be fully dropped.
 *     await wait(5)
 *     let roles = await client.queryRoles()
 *     // 'Engineer' should no longer appear in the logged list of roles
 *     console.log(roles)
 *   } catch (error) {
 *     console.error('Error:', error)
 *     process.exit(1)
 *   } finally {
 *     if (client) client.close()
 *   }
 * })()
 */
Client.prototype.dropRole = function (roleName, policy) {
  const cmd = new Commands.RoleDrop(this, [roleName, policy])
  cmd.execute()
}

/**
 * @function Client#dropUser
 *
 * @summary Remove a User from cluster
 *
 * @param {String} user - User name to be dropped.
 * @param {Object} policy - Optional {@link AdminPolicy}.
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 *
 * function wait (ms) {
 *     return new Promise(resolve => setTimeout(resolve, ms))
 * }
 *
 * ;(async function () {
 *   let client
 *   try {
 *     client = await Aerospike.connect({
 *         hosts: '192.168.33.10:3000',
 *         policies: {
 *           write : new Aerospike.WritePolicy({socketTimeout : 1, totalTimeout : 1}),
 *         },
 *         // Must have security enabled in server configuration before user and password configurations can be used.
 *         user: 'admin',
 *         password: 'admin'
 *     })
 *
 *     // A user must be created before a user can be dropped. See {@link Client#createUser} for an example.
 *     client.dropUser("khob")
 *     // Must wait a short length of time of the role to be fully dropped.
 *     await wait(5)
 *     let users = await client.queryUsers()
 *     // 'khob' should no longer appear in the logged list of roles
 *     console.log(users)
 *   } catch (error) {
 *     console.error('Error:', error)
 *     process.exit(1)
 *   } finally {
 *     if (client) client.close()
 *   }
 * })()
 */
Client.prototype.dropUser = function (user, policy) {
  const cmd = new Commands.UserDrop(this, [user, policy])
  cmd.execute()
}

/**
 * @function Client#grantPrivileges
 *
 * @summary Grant privileges to an user defined role.
 *
 * @param {String} roleName - role name
 * @param {Array.<Privilege>} privileges - list of privileges assigned to a role.
 * @param {Object} policy - Optional {@link AdminPolicy}.
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 *
 * function wait (ms) {
 *     return new Promise(resolve => setTimeout(resolve, ms))
 * }
 *
 * ;(async function () {
 *   let client
 *   try {
 *     client = await Aerospike.connect({
 *         hosts: '192.168.33.10:3000',
 *         policies: {
 *           write : new Aerospike.WritePolicy({socketTimeout : 1, totalTimeout : 1}),
 *         },
 *         // Must have security enabled in server configuration before user and password configurations can be used.
 *         user: 'admin',
 *         password: 'admin'
 *     })
 *
 *     // A role must be created before privileges can be granted. See {@link Client#createUser} for an example.
 *     client.grantPrivileges("Engineer", [new Aerospike.admin.Privilege(Aerospike.privilegeCode.SINDEX_ADMIN)])
 *     // Must wait a short length of time for the privilege to be granted.
 *     await wait(5)
 *     let role = await client.queryRole("Engineer")
 *     console.log(role)
 *   } catch (error) {
 *     console.error('Error:', error)
 *     process.exit(1)
 *   } finally {
 *     if (client) client.close()
 *   }
 * })()
 */
Client.prototype.grantPrivileges = function (roleName, privileges, policy) {
  const cmd = new Commands.PrivilegeGrant(this, [roleName, privileges, policy])
  cmd.execute()
}

/**
 * @function Client#grantRoles
 *
 * @summary Drop user defined role.
 *
 * @param {String} user - User name for granted roles
 * @param {Array.<String>} roles - Optional array of role names. For more information on roles, see {@link Role}.
 * @param {Object} policy - Optional {@link AdminPolicy}.
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 *
 * function wait (ms) {
 *     return new Promise(resolve => setTimeout(resolve, ms))
 * }
 *
 * ;(async function () {
 *   let client
 *   try {
 *     client = await Aerospike.connect({
 *         hosts: '192.168.33.10:3000',
 *         policies: {
 *           write : new Aerospike.WritePolicy({socketTimeout : 1, totalTimeout : 1}),
 *         },
 *         // Must have security enabled in server configuration before user and password configurations can be used.
 *         user: 'admin',
 *         password: 'admin'
 *     })
 *
 *     // A user must be created before roles can be granted. See {@link Client#createUser} for an example.
 *     client.grantRoles("khob", ["Engineer"])
 *     // Must wait a short length of time for the role to be granted
 *     await wait(5)
 *     let user = await client.queryUser("khob")
 *     console.log(user)
 *   } catch (error) {
 *     console.error('Error:', error)
 *     process.exit(1)
 *   } finally {
 *     if (client) client.close()
 *   }
 * })()
 *
 */
Client.prototype.grantRoles = function (user, roles, policy) {
  const cmd = new Commands.RoleGrant(this, [user, roles, policy])
  cmd.execute()
}

/**
 * @function Client#queryRole
 *
 * @summary Retrieves an {@link Role} from the database.
 *
 * @param {String} roleName - role name filter.
 * @param {Object} policy - Optional {@link AdminPolicy}.
 *
 * @returns {Role} - For more information on roles, see {@link Role}.
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 *
 * function wait (ms) {
 *     return new Promise(resolve => setTimeout(resolve, ms))
 * }
 *
 * ;(async function () {
 *   let client
 *   try {
 *     client = await Aerospike.connect({
 *         hosts: '192.168.33.10:3000',
 *         policies: {
 *           write : new Aerospike.WritePolicy({socketTimeout : 1, totalTimeout : 1}),
 *         },
 *         // Must have security enabled in server configuration before user and password configurations can be used.
 *         user: 'admin',
 *         password: 'admin'
 *     })
 *
 *     // A role must be created before a role can be queried. See {@link Client#createRole} for an example.
 *     let role = await client.queryRole("Engineer")
 *     console.log(role)
 *   } catch (error) {
 *     console.error('Error:', error)
 *     process.exit(1)
 *   } finally {
 *     if (client) client.close()
 *   }
 * })()
 */
Client.prototype.queryRole = async function (roleName, policy) {
  const cmd = new Commands.QueryRole(this, [roleName, policy])
  return cmd.execute()
}

/**
 * @function Client#queryRoles
 *
 * @summary Retrieve all roles and role information from the database.
 *
 * @param {Object} policy - Optional {@link AdminPolicy}.
 *
 * @returns {Array.<Role>} - For more information on roles, see {@link Role}.
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 *
 * function wait (ms) {
 *     return new Promise(resolve => setTimeout(resolve, ms))
 * }
 *
 * ;(async function () {
 *   let client
 *   try {
 *     client = await Aerospike.connect({
 *         hosts: '192.168.33.10:3000',
 *         policies: {
 *           write : new Aerospike.WritePolicy({socketTimeout : 1, totalTimeout : 1}),
 *         },
 *         // Must have security enabled in server configuration before user and password configurations can be used.
 *         user: 'admin',
 *         password: 'admin'
 *     })
 *
 *     let roles = await client.queryRoles()
 *     console.log(roles)
 *   } catch (error) {
 *     console.error('Error:', error)
 *     process.exit(1)
 *   } finally {
 *     if (client) client.close()
 *   }
 * })()
 */
Client.prototype.queryRoles = function (policy) {
  const cmd = new Commands.QueryRoles(this, [policy])
  return cmd.execute()
}

/**
 * @function Client#queryUser
 *
 * @summary Retrieves an {@link User} from the database.
 *
 * @param {String} user - User name filter.
 * @param {Object} policy - Optional {@link AdminPolicy}.
 *
 * @returns {User} - For more information on users, see {@link User}.
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 *
 * function wait (ms) {
 *     return new Promise(resolve => setTimeout(resolve, ms))
 * }
 *
 * ;(async function () {
 *   let client
 *   try {
 *     client = await Aerospike.connect({
 *         hosts: '192.168.33.10:3000',
 *         policies: {
 *           write : new Aerospike.WritePolicy({socketTimeout : 1, totalTimeout : 1}),
 *         },
 *         // Must have security enabled in server configuration before user and password configurations can be used.
 *         user: 'admin',
 *         password: 'admin'
 *     })
 *
 *     // A user must be created before a user can be queried. See {@link Client#createUser} for an example.
 *     let user = await client.queryUser("khob")
 *     console.log(user)
 *   } catch (error) {
 *     console.error('Error:', error)
 *     process.exit(1)
 *   } finally {
 *     if (client) client.close()
 *   }
 * })()
 */
Client.prototype.queryUser = function (user, policy) {
  const cmd = new Commands.QueryUser(this, [user, policy])
  return cmd.execute()
}

/**
 * @function Client#queryUsers
 *
 * @summary Retrieves All user and user information from the database.
 *
 * @param {Object} policy - Optional {@link AdminPolicy}.
 *
 * @returns {Array.<User>} - For more information on users, see {@link User}.
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 *
 * function wait (ms) {
 *     return new Promise(resolve => setTimeout(resolve, ms))
 * }
 *
 * ;(async function () {
 *   let client
 *   try {
 *     client = await Aerospike.connect({
 *         hosts: '192.168.33.10:3000',
 *         policies: {
 *           write : new Aerospike.WritePolicy({socketTimeout : 1, totalTimeout : 1}),
 *         },
 *         // Must have security enabled in server configuration before user and password configurations can be used.
 *         user: 'admin',
 *         password: 'admin'
 *     })
 *
 *     let users = await client.queryUsers()
 *     console.log(users)
 *   } catch (error) {
 *     console.error('Error:', error)
 *     process.exit(1)
 *   } finally {
 *     if (client) client.close()
 *   }
 * })()
 */
Client.prototype.queryUsers = function (policy) {
  const cmd = new Commands.QueryUsers(this, [policy])
  return cmd.execute()
}

/**
 * @function Client#revokePrivileges
 *
 * @summary Revoke privileges from an user defined role.
 *
 * @param {String} roleName - role name
 * @param {Array.<Privilege>} privileges - List of privileges assigned to a role.
 * @param {Object} policy - Optional {@link AdminPolicy}.
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 *
 * function wait (ms) {
 *     return new Promise(resolve => setTimeout(resolve, ms))
 * }
 *
 * ;(async function () {
 *   let client
 *   try {
 *     client = await Aerospike.connect({
 *         hosts: '192.168.33.10:3000',
 *         policies: {
 *           write : new Aerospike.WritePolicy({socketTimeout : 1, totalTimeout : 1}),
 *         },
 *         // Must have security enabled in server configuration before user and password configurations can be used.
 *         user: 'admin',
 *         password: 'admin'
 *     })
 *     // A role must be created before privileges can be revoked. See {@link Client#createRole} for an example.
 *     client.revokePrivileges("Engineer", [new Aerospike.admin.Privilege(Aerospike.privilegeCode.SINDEX_ADMIN)])
 *     // Must wait a short length of time for the privilege to be granted.
 *     await wait(5)
 *     let users = await client.queryRole("Engineer")
 *     console.log(users)
 *   } catch (error) {
 *     console.error('Error:', error)
 *     process.exit(1)
 *   } finally {
 *     if (client) client.close()
 *   }
 * })()
 */
Client.prototype.revokePrivileges = function (roleName, privileges, policy) {
  const cmd = new Commands.PrivilegeRevoke(this, [roleName, privileges, policy])
  cmd.execute()
}

/**
 * @function Client#revokeRoles
 *
 * @summary Remove roles from user's list of roles.
 *
 * @param {String} user - User name for revoked roles.
 * @param {Array.<String>} roles - Optional array of role names. For more information on roles, see {@link Role}.
 * @param {Object} policy - Optional {@link AdminPolicy}.
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 *
 * function wait (ms) {
 *     return new Promise(resolve => setTimeout(resolve, ms))
 * }
 *
 * ;(async function () {
 *   let client
 *   try {
 *     client = await Aerospike.connect({
 *         hosts: '192.168.33.10:3000',
 *         policies: {
 *           write : new Aerospike.WritePolicy({socketTimeout : 1, totalTimeout : 1}),
 *         },
 *         // Must have security enabled in server configuration before user and password configurations can be used.
 *         user: 'admin',
 *         password: 'admin'
 *     })
 *     // A user must be created before roles can be revoked. See {@link Client#createUser} for an example.
 *     client.revokeRoles("khob", ["Engineer"])
 *     // Must wait a short length of time for the privilege to be granted.
 *     await wait(5)
 *     let user = await client.queryUser("khob")
 *     console.log(user)
 *   } catch (error) {
 *     console.error('Error:', error)
 *     process.exit(1)
 *   } finally {
 *     if (client) client.close()
 *   }
 * })()
 */
Client.prototype.revokeRoles = function (user, roles, policy) {
  const cmd = new Commands.RoleRevoke(this, [user, roles, policy])
  cmd.execute()
}

/**
 * @function Client#setQuotas
 *
 * @summary Set maximum reads/writes per second limits for a role. If a quota is zero, the limit is removed.
 * Quotas require server security configuration "enable-quotas" to be set to true.
 *
 * @param {String} roleName - role name
 * @param {Number} readQuota - maximum reads per second limit, pass in zero for no limit.
 * @param {Number} writeQuota - maximum writes per second limit, pass in zero for no limit.
 * @param {Object} policy - Optional {@link AdminPolicy}.
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 *
 * function wait (ms) {
 *     return new Promise(resolve => setTimeout(resolve, ms))
 * }
 *
 * ;(async function () {
 *   let client
 *   try {
 *     client = await Aerospike.connect({
 *         hosts: '192.168.33.10:3000',
 *         policies: {
 *           write : new Aerospike.WritePolicy({socketTimeout : 1, totalTimeout : 1}),
 *         },
 *         // Must have security enabled in server configuration before user and password configurations can be used.
 *         user: 'admin',
 *         password: 'admin'
 *     })
 *     // Quotas must be enabled in the server configurations for quotas to be set.
 *     client.setQuotas("Engineer", 200, 300)
 *     // Must wait a short length of time for the privilegee to be granted.
 *     await wait(5)
 *     let role = await client.queryRole("Engineer")
 *     console.log(role)
 *   } catch (error) {
 *     console.error('Error:', error)
 *     process.exit(1)
 *   } finally {
 *     if (client) client.close()
 *   }
 * })()
 *
 */
Client.prototype.setQuotas = function (roleName, readQuota, writeQuota, policy) {
  const cmd = new Commands.RoleSetQuotas(this, [roleName, readQuota, writeQuota, policy])
  cmd.execute()
}

/**
 * @function Client#setWhitelist
 *
 * @summary Set IP address whitelist for a role. If whitelist is null or empty, remove existing whitelist from role.
 *
 * @param {String} roleName - role name
 * @param {Array.<String>} whitelist - Optional list of allowable IP addresses assigned to role.
 * IP addresses can contain wildcards (ie. 10.1.2.0/24).
 * @param {Object} policy - Optional {@link AdminPolicy}.
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 *
 * function wait (ms) {
 *     return new Promise(resolve => setTimeout(resolve, ms))
 * }
 *
 * ;(async function () {
 *   let client
 *   try {
 *     client = await Aerospike.connect({
 *         hosts: '192.168.33.10:3000',
 *         policies: {
 *           write : new Aerospike.WritePolicy({socketTimeout : 1, totalTimeout : 1}),
 *         },
 *         // Must have security enabled in server configuration before user and password configurations can be used.
 *         user: 'admin',
 *         password: 'admin'
 *     })
 *     // Quotas must be enabled in the server configurations for quotas to be set.
 *     client.setWhitelist("Engineer", ["172.17.0.2"])
 *     // Must wait a short length of time for the privilegee to be granted.
 *     await wait(5)
 *     let role = await client.queryRole("Engineer")
 *     console.log(role)
 *   } catch (error) {
 *     console.error('Error:', error)
 *     process.exit(1)
 *   } finally {
 *     if (client) client.close()
 *   }
 * })()
 *
 */
Client.prototype.setWhitelist = function (roleName, whitelist, policy) {
  const cmd = new Commands.RoleSetWhitelist(this, [roleName, whitelist, policy])
  cmd.execute()
}

/**
 * @function Client#addSeedHost
 *
 * @summary Adds a seed host to the cluster.
 *
 * @param {String} hostname - Hostname/IP address of the new seed host
 * @param {Number} [port=3000] - Port number; defaults to {@link Config#port} or 3000.
 *
 * @since v2.6.0
 */
Client.prototype.addSeedHost = function (hostname, port) {
  port = port || this.config.port
  this.as_client.addSeedHost(hostname, port)
}

/**
 * @function Client#removeSeedHost
 *
 * @summary Removes a seed host from the cluster.
 *
 * @param {String} hostname - Hostname/IP address of the seed host
 * @param {Number} [port=3000] - Port number; defaults to {@link Config#port} or 3000.
 *
 * @since v2.6.0
 */
Client.prototype.removeSeedHost = function (hostname, port) {
  port = port || this.config.port
  this.as_client.removeSeedHost(hostname, port)
}

/**
 * @function Client#batchExists
 *
 * @summary Checks the existence of a batch of records from the database cluster.
 *
 * @param {Key[]} keys - An array of Keys used to locate the records in the cluster.
 * @param {BatchPolicy} [policy] - The Batch Policy to use for this operation.
 * @param {batchRecordsCallback} [callback] - The function to call when
 * the operation completes, with the results of the batch operation.
 *
 * @returns {?Promise} - If no callback function is passed, the function
 * returns a Promise that resolves to the results of the batch operation.
 *
 * @deprecated since v2.0 - use {@link Client#batchRead} instead.
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 * const Key = Aerospike.Key
 *
 * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
 * var config = {
 *   hosts: '192.168.33.10:3000',
 *   // Timeouts disabled, latency dependent on server location. Configure as needed.
 *   policies: {
 *     batch : new Aerospike.BatchPolicy({socketTimeout : 0, totalTimeout : 0}),
 *   }
 * }
 *
 * var keys = [
 *   new Key('test', 'demo', 'key1'),
 *   new Key('test', 'demo', 'key2'),
 *   new Key('test', 'demo', 'key3')
 * ]
 *
 * ;(async () => {
 *     // Establishes a connection to the server
 *     let client = await Aerospike.connect(config);
 *
 *     // Place some records for demonstration
 *     await client.put(keys[0], {example: 30})
 *     await client.put(keys[1], {example: 35})
 *     await client.put(keys[2], {example: 40})
 *
 *     let results = await client.batchExists(keys)
 *     results.forEach((result) => {
 *         switch (result.status) {
 *             case Aerospike.status.OK:
 *                 console.log("Record found")
 *                 break
 *             case Aerospike.status.ERR_RECORD_NOT_FOUND:
 *                 console.log("Record not found")
 *                 break
 *             default:
 *                 // error while reading record
 *                 console.log("Other error")
 *                 break
 *         }
 *     })
 *
 *     // Close the connection to the server
 *     await client.close();
 * })();
 *
 *
 */
Client.prototype.batchExists = function (keys, policy, callback) {
  if (typeof policy === 'function') {
    callback = policy
    policy = null
  }

  const cmd = new Commands.BatchExists(this, [keys, policy], callback)
  return cmd.execute()
}

/**
 * @function Client#batchGet
 *
 * @summary Reads a batch of records from the database cluster.
 *
 * @param {Key[]} keys - An array of keys, used to locate the records in the cluster.
 * @param {BatchPolicy} [policy] - The Batch Policy to use for this operation.
 * @param {batchRecordsCallback} [callback] - The function to call when
 * the operation completes, with the results of the batch operation.
 *
 * @returns {?Promise} - If no callback function is passed, the function
 * returns a Promise that resolves to the results of the batch operation.
 *
 * @deprecated since v2.0 - use {@link Client#batchRead} instead.
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 * const Key = Aerospike.Key
 *
 * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
 * var config = {
 *   hosts: '192.168.33.10:3000',
 *   // Timeouts disabled, latency dependent on server location. Configure as needed.
 *   policies: {
 *     batch : new Aerospike.BatchPolicy({socketTimeout : 0, totalTimeout : 0}),
 *   }
 * }
 *
 * var keys = [
 *   new Key('test', 'demo', 'key1'),
 *   new Key('test', 'demo', 'key2'),
 *   new Key('test', 'demo', 'key3')
 * ]
 *
 * ;(async () => {
 *     // Establishes a connection to the server
 *     let client = await Aerospike.connect(config);
 *
 *     // Place some records for demonstration
 *     await client.put(keys[0], {example: 30})
 *     await client.put(keys[1], {example: 35})
 *     await client.put(keys[2], {example: 40})
 *
 *     let results = await client.batchGet(keys)
 *     results.forEach((result) => {
 *         switch (result.status) {
 *             case Aerospike.status.OK:
 *                 console.log("Record found")
 *                 break
 *             case Aerospike.status.ERR_RECORD_NOT_FOUND:
 *                 console.log("Record not found")
 *                 break
 *             default:
 *                 // error while reading record
 *                 console.log("Other error")
 *                 break
 *         }
 *     })
 *
 *     // Close the connection to the server
 *     await client.close();
 * })();
 *
 */
Client.prototype.batchGet = function (keys, policy, callback) {
  if (typeof policy === 'function') {
    callback = policy
    policy = null
  }

  const cmd = new Commands.BatchGet(this, [keys, policy], callback)
  return cmd.execute()
}

/**
 * @function Client#batchRead
 *
 * @summary Read multiple records for specified batch keys in one batch call.
 *
 * @description
 *
 * This method allows different namespaces/bins to be requested for each key in
 * the batch. This method requires server >= 3.6.0.
 *
 * @param {object[]} records - {@link Record} List of keys and bins to retrieve.
 * @param {number} records[].type - {@link Record#type} Batch type.
 * @param {Key} records[].key - Record Key.
 * @param {string[]} [records[].bins] - List of bins to retrieve.
 * @param {boolean} [records[].readAllBins] - Whether to retrieve all bins or
 * just the meta data of the record. If true, ignore <code>bins</code> and read
 * all bins; if false and <code>bins</code> is specified, read specified bins;
 * if false and <code>bins</code> is not specified, read only record meta data
 * (generation, expiration, etc.)
 * @param {Object[]} [records[].ops] - List of {@link module:aerospike/operations|operations}
 * @param {BatchPolicy} [policy] - The Batch Policy to use for this operation.
 * @param {batchRecordsCallback} [callback] - The function to call when
 * the operation completes, with the results of the batch operation.
 *
 * @returns {?Promise} - If no callback function is passed, the function
 * returns a Promise that resolves to the results of the batch operation.
 *
 * @since v2.0
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 * const batchType = Aerospike.batchType
 * const op = Aerospike.operations
 *
 * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
 * var config = {
 *   hosts: '192.168.33.10:3000',
 *   // Timeouts disabled, latency dependent on server location. Configure as needed.
 *   policies: {
 *     batch : new Aerospike.BatchPolicy({socketTimeout : 0, totalTimeout : 0}),
 *   }
 * }
 *
 * var batchRecords = [
 *   { type: batchType.BATCH_READ,
 *     key: new Aerospike.Key('test', 'demo', 'key1'), bins: ['example'] },
 *   { type: batchType.BATCH_READ,
 *     key: new Aerospike.Key('test', 'demo', 'key2'), readAllBins: true },
 *   { type: batchType.BATCH_READ,
 *     key: new Aerospike.Key('test', 'demo', 'key3'),
 *     ops:[
 *          op.read('example')
 *         ]},
 *   { type: batchType.BATCH_READ,
 *     key: new Aerospike.Key('test', 'demo', 'key4')}
 * ]
 *
 *
 * ;(async () => {
 *     // Establishes a connection to the server
 *     let client = await Aerospike.connect(config);
 *
 *     // Place some records for demonstration
 *     await client.put(batchRecords[0].key, {example: 30})
 *     await client.put(batchRecords[1].key, {example: 35})
 *     await client.put(batchRecords[2].key, {example: 40})
 *     await client.put(batchRecords[3].key, {example: 45})
 *
 *     let results = await client.batchRead(batchRecords)
 *     results.forEach((result) => {
 *
 *         switch (result.status) {
 *             case Aerospike.status.OK:
 *                 console.log("Record found")
 *                 // Since the fourth record didn't specify bins to read,
 *                 // the fourth record will return no bins, eventhough the batchRead succeeded.
 *                 console.log(result.record.bins)
 *                 break
 *             case Aerospike.status.ERR_RECORD_NOT_FOUND:
 *                 console.log("Record not found")
 *                 break
 *             default:
 *                 // error while reading record
 *                 console.log("Other error")
 *                 break
 *         }
 *     })
 *     // Close the connection to the server
 *     await client.close();
 * })();
 */
Client.prototype.batchRead = function (records, policy, callback) {
  if (typeof policy === 'function') {
    callback = policy
    policy = null
  }

  const cmd = new Commands.BatchRead(this, [records, policy], callback)
  return cmd.execute()
}

/**
 * @function Client#batchWrite
 *
 * @summary Read/Write multiple records for specified batch keys in one batch call.
 *
 * @description
 *
 * This method allows different sub-commands for each key in the batch.
 * This method requires server >= 6.0.0.
 *
 * @param {object[]} records - {@link Record} List of batch sub-commands to perform.
 * @param {number} records[].type - {@link Record#type} Batch type.
 * @param {Key} records[].key - Record Key.
 * @param {BatchPolicy} [policy] - The Batch Policy to use for this operation.
 * @param {batchRecordsCallback} [callback] - The function to call when
 * the operation completes, with the results of the batch operation.
 *
 * @returns {?Promise} - If no callback function is passed, the function
 * returns a Promise that resolves to the results of the batch operation.
 *
 * @since v5.0.0
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 * const batchType = Aerospike.batchType
 * const Key = Aerospike.Key
 * const op = Aerospike.operations
 *
 * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
 * var config = {
 *   hosts: '192.168.33.10:3000',
 *   // Timeouts disabled, latency dependent on server location. Configure as needed.
 *   policies: {
 *     batch : new Aerospike.BatchPolicy({socketTimeout : 0, totalTimeout : 0}),
 *   }
 * }
 *
 * const batchRecords = [
 *     {
 *         type: batchType.BATCH_REMOVE,
 *         key: new Key("test", "demo", 'key1')
 *     },
 *     {
 *         type: batchType.BATCH_WRITE,
 *         key: new Key("test", "demo", 'key2'),
 *         ops: [
 *             op.write('example', 30),
 *             op.write('blob', Buffer.from('foo'))
 *         ],
 *         policy: new Aerospike.BatchWritePolicy({
 *             exists: Aerospike.policy.exists.IGNORE
 *         })
 *     },
 *     {
 *         type: batchType.BATCH_WRITE,
 *         key: new Key("test", "demo", 'key3'),
 *         ops: [
 *             op.write('example', 35),
 *             op.write('blob', Buffer.from('bar'))
 *         ],
 *         policy: new Aerospike.BatchWritePolicy({
 *             exists: Aerospike.policy.exists.IGNORE
 *         })
 *     }
 * ]
 *
 * const batchReadRecords = [
 *     {
 *         type: batchType.BATCH_READ,
 *         key: new Key("test", "demo", 'key1'),
 *         readAllBins: true
 *     },
 *     {
 *         type: batchType.BATCH_READ,
 *         key: new Key("test", "demo", 'key2'),
 *         readAllBins: true
 *     },
 *     {
 *         type: batchType.BATCH_READ,
 *         key: new Key("test", "demo", 'key3'),
 *         readAllBins: true
 *     }
 * ]
 *
 * ;(async () => {
 *     // Establishes a connection to the server
 *     let client = await Aerospike.connect(config);
 *
 *     // Place a record for demonstration
 *     await client.put(new Key("test", "demo", 'key1'), {example: 30, user: 'Doug', extra: 'unused'})
 *
 *     let results = await client.batchWrite(batchRecords)
 *     results.forEach((result) => {
 *         switch (result.status) {
 *             case Aerospike.status.OK:
 *                 console.log("Record found")
 *                 break
 *             case Aerospike.status.ERR_RECORD_NOT_FOUND:
 *                 console.log("Record not found")
 *                 break
 *             default:
 *                 // error while reading record
 *                 console.log("Other error")
 *                 break
 *         }
 *     })
 *
 *     results = await client.batchWrite(batchRecords)
 *     results.forEach((result) => {
 *         switch (result.status) {
 *             case Aerospike.status.OK:
 *                 console.log("Record found")
 *                 break
 *             case Aerospike.status.ERR_RECORD_NOT_FOUND:
 *                 console.log("Record not found")
 *                 break
 *             default:
 *                 // error while reading record
 *                 console.log("Other error")
 *                 break
 *         }
 *     })
 *     // Close the connection to the server
 *     await client.close();
 * })();
 */
Client.prototype.batchWrite = function (records, policy, callback) {
  if (typeof policy === 'function') {
    callback = policy
    policy = null
  }

  const cmd = new Commands.BatchWrite(this, [records, policy], callback)
  return cmd.execute()
}

/**
 * @function Client#batchApply
 *
 * @summary Apply UDF (user defined function) on multiple keys.
 *
 * @description
 *
 * This method allows multiple sub-commands for each key in the batch.
 * This method requires server >= 6.0.0.
 *
 * @param {Key[]} keys - An array of keys, used to locate the records in the cluster.
 * @param {object[]} udf - Server UDF module/function and argList to apply.
 * @param {BatchPolicy} [batchPolicy] - The Batch Policy to use for this operation.
 * @param {BatchApplyPolicy} [batchApplyPolicy] UDF policy configuration parameters.
 * @param {batchRecordsCallback} [callback] - The function to call when
 * the operation completes, with the results of the batch operation.
 *
 * @returns {?Promise} - If no callback function is passed, the function
 * returns a Promise that resolves to the results of the batch operation.
 *
 * @since v5.0.0
 *
 * @example <caption>Simple batchApply example</caption>
 *
 * const Aerospike = require('aerospike')
 * var path = require('path');
 *
 * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
 * const config = {
 *   hosts: '192.168.33.10:3000',
 *   // Timeouts disabled, latency dependent on server location. Configure as needed.
 *   policies: {
 *     batch : new Aerospike.BatchPolicy({socketTimeout : 0, totalTimeout : 0}),
 *   }
 * }
 *
 * // This must be a path to a UDF file
 * const scriptLocation = path.join(__dirname, 'udf-list.lua')
 *
 * ;(async () => {
 *     // Establishes a connection to the server
 *     let client = await Aerospike.connect(config);
 *
 *     // Place some records for demonstration
 *     await client.put(new Aerospike.Key('test', 'demo', 'key1'), {example: 30})
 *     await client.put(new Aerospike.Key('test', 'demo', 'key2'), {example: 35})
 *     await client.udfRegister(scriptLocation)
 *
 *     // Execute the UDF
 *     let batchResult = await client.batchApply([new Aerospike.Key('test', 'demo', 'key1'), new Aerospike.Key('test', 'demo', 'key2')],
 *         {
 *             module: 'udf-list',
 *             funcname: 'updateRecord',
 *             args: ['example', 45]
 *         }
 *     );
 *
 *     // Access the records
 *     batchResult.forEach(result => {
 *         // Do something
 *         console.info("New value of example bin is %o \n", result.record.bins.SUCCESS);
 *     });
 *
 *     //Additional verfication
 *     let result = await client.get(new Aerospike.Key('test', 'demo', 'key1'))
 *     console.log(result.bins) // { example: 45 }
 *     result = await client.get(new Aerospike.Key('test', 'demo', 'key2'))
 *     console.log(result.bins) // { example: 45 }
 *
 *     // Close the connection to the server
 *     await client.close();
 * })(); *
 *
 * @example <caption>Simple lua script to be used in example above</caption>
 *
 * function updateRecord(rec, binName, binValue)
 *   rec[binName] = binValue
 *   aerospike:update(rec)
 *   return binValue
 * end
 */
Client.prototype.batchApply = function (keys, udf, batchPolicy, batchApplyPolicy, callback) {
  if (typeof batchPolicy === 'function') {
    callback = batchPolicy
    batchPolicy = null
    batchApplyPolicy = null
  } else {
    if (typeof batchApplyPolicy === 'function') {
      callback = batchApplyPolicy
      batchApplyPolicy = null
    }
  }

  const cmd = new Commands.BatchApply(this, [keys, udf, batchPolicy, batchApplyPolicy], callback)
  return cmd.execute()
}

/**
 * @function Client#batchRemove
 *
 * @summary Remove multiple records.
 *
 * @description
 *
 * This method removes the specified records from the database.
 * This method requires server >= 6.0.0.
 *
 * @param {Key[]} keys - {@link Key} An array of keys, used to locate the records in the cluster.
 * @param {BatchPolicy} [batchPolicy] - The Batch Policy to use for this operation.
 * @param {BatchRemovePolicy} [batchRemovePolicy] Remove policy configuration parameters.
 * @param {batchRecordsCallback} [callback] - The function to call when
 * the operation completes, with the results of the batch operation.
 *
 * @returns {?Promise} - If no callback function is passed, the function
 * returns a Promise that resolves to the results of the batch operation.
 *
 * @since v5.0.0
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 * const batchType = Aerospike.batchType
 * const exp = Aerospike.exp
 *
 * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
 * var config = {
 *   hosts: '192.168.33.10:3000',
 *   // Timeouts disabled, latency dependent on server location. Configure as needed.
 *   policies: {
 *     batch : new Aerospike.BatchPolicy({socketTimeout : 0, totalTimeout : 0}),
 *   }
 * }
 *
 * var keys = [
 *     new Aerospike.Key('test', 'demo', 'key1'),
 *     new Aerospike.Key('test', 'demo', 'key2'),
 *     new Aerospike.Key('test', 'demo', 'key3')
 * ]
 *
 *
 * ;(async () => {
 *     // Establishes a connection to the server
 *     let client = await Aerospike.connect(config);
 *
 *     // Place some records for demonstration
 *     await client.put(keys[0], {example: 30})
 *     await client.put(keys[1], {example: 35})
 *
 *     let results = await client.batchRemove(keys)
 *     results.forEach((result) => {
 *         switch (result.status) {
 *             case Aerospike.status.OK:
 *                 console.log("Record deleted")
 *                 break
 *             case Aerospike.status.ERR_RECORD_NOT_FOUND:
 *                 console.log("Record not found")
 *                 break
 *             default:
 *                 // error while reading record
 *                 console.log("Other error")
 *                 break
 *         }
 *     })
 *     // Close the connection to the server
 *     await client.close();
 * })();
 */
Client.prototype.batchRemove = function (keys, batchPolicy, batchRemovePolicy, callback) {
  if (typeof batchPolicy === 'function') {
    callback = batchPolicy
    batchPolicy = null
    batchRemovePolicy = null
  } else {
    if (typeof batchRemovePolicy === 'function') {
      callback = batchRemovePolicy
      batchRemovePolicy = null
    }
  }

  const cmd = new Commands.BatchRemove(this, [keys, batchPolicy, batchRemovePolicy], callback)
  return cmd.execute()
}

/**
 * @function Client#batchSelect
 *
 * @summary Reads a subset of bins for a batch of records from the database cluster.
 *
 * @param {Key[]} keys - An array of keys, used to locate the records in the cluster.
 * @param {string[]} bins - An array of bin names for the bins to be returned for the given keys.
 * @param {BatchPolicy} [policy] - The Batch Policy to use for this operation.
 * @param {batchRecordsCallback} [callback] - The function to call when
 * the operation completes, with the results of the batch operation.
 *
 * @returns {?Promise} - If no callback function is passed, the function
 * returns a Promise that resolves to the results of the batch operation.
 *
 * @deprecated since v2.0 - use {@link Client#batchRead} instead.
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 * const batchType = Aerospike.batchType
 * const exp = Aerospike.exp
 *
 * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
 * var config = {
 *   hosts: '192.168.33.10:3000',
 *   // Timeouts disabled, latency dependent on server location. Configure as needed.
 *   policies: {
 *     batch : new Aerospike.BatchPolicy({socketTimeout : 0, totalTimeout : 0}),
 *   }
 * }
 *
 * var keys = [
 *     new Aerospike.Key('test', 'demo', 'key1'),
 *     new Aerospike.Key('test', 'demo', 'key2'),
 *     new Aerospike.Key('test', 'demo', 'key3')
 * ]
 *
 * var bins = ['example', 'user']
 *
 * ;(async () => {
 *     // Establishes a connection to the server
 *     let client = await Aerospike.connect(config);
 *
 *     // Place some records for demonstration
 *     await client.put(keys[0], {example: 30, user: 'Doug', extra: 'unused'})
 *     await client.put(keys[1], {example: 35})
 *
 *     let results = await client.batchSelect(keys, bins)
 *     results.forEach((result) => {
 *         switch (result.status) {
 *             case Aerospike.status.OK:
 *                 console.log("Record found")
 *                 // Since the fourth record didn't specify bins to read,
 *                 // the fourth record will return no bins, eventhough the batchRead succeeded.
 *                 console.log(result.record.bins)
 *                 break
 *             case Aerospike.status.ERR_RECORD_NOT_FOUND:
 *                 console.log("Record not found")
 *                 break
 *             default:
 *                 // error while reading record
 *                 console.log("Other error")
 *                 break
 *         }
 *     })
 *     // Close the connection to the server
 *     await client.close();
 * })();
 */
Client.prototype.batchSelect = function (keys, bins, policy, callback) {
  if (typeof policy === 'function') {
    callback = policy
    policy = null
  }

  const cmd = new Commands.BatchSelect(this, [keys, bins, policy], callback)
  return cmd.execute()
}

/**
 * @function Client#close
 *
 * @summary Closes the client connection to the cluster.
 *
 * @param {boolean} [releaseEventLoop=false] - Whether to release the event loop handle after the client is closed.
 *
 * @see module:aerospike.releaseEventLoop
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 *
 * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
 * var config = {
 *   hosts: '192.168.33.10:3000',
 * }
 * Aerospike.connect(config)
 *   .then(client => {
 *     // client is ready to accept commands
 *     console.log("Connected. Now Closing Connection.")
 *     client.close()
 *   })
 *   .catch(error => {
  *    client.close()
 *     console.error('Failed to connect to cluster: %s', error.message)
 *   })
 */
Client.prototype.close = function (releaseEventLoop = false) {
  if (this.isConnected(false)) {
    this.connected = false
    this.as_client.close()
    _connectedClients -= 1
  }
  if (_connectedClients === 0) {
    if (releaseEventLoop) {
      EventLoop.releaseEventLoop()
    } else {
      EventLoop.unreferenceEventLoop()
    }
  }
}

/**
 * @function Client#connect
 *
 * @summary Establishes the connection to the cluster.
 *
 * @description
 *
 * Once the client is connected to at least one server node, it will start
 * polling each cluster node regularly to discover the current cluster status.
 * As new nodes are added to the cluster, or existing nodes are removed, the
 * client will establish or close down connections to these nodes. If the
 * client gets disconnected from the cluster, it will keep polling the last
 * known server endpoints, and will reconnect automatically if the connection
 * is reestablished.
 *
 * @param {connectCallback} [callback] - The function to call once the
 * client connection has been established successfully and the client is ready
 * to accept commands.
 *
 * @return {?Promise} If no callback function is passed, the function returns
 * a Promise resolving to the connected client.
 *
 * @throws {AerospikeError} if event loop resources have already been released.
 *
 * @see {@link Config#connTimeoutMs} - Initial host connection timeout in milliseconds.
 * @see {@link module:aerospike.connect} - Initial host connection timeout in milliseconds.
 * @see module:aerospike.releaseEventLoop
 *
 * @example <caption>A connection established using callback function.</caption>
 *
 * const Aerospike = require('aerospike')
 *
 * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
 * var config = {
 *   hosts: '192.168.33.10:3000',
 * }
 * Aerospike.connect(config, (error, client) => {
 *   if (error) {
 *     console.error('Failed to connect to cluster: %s', error.message)
 *     process.exit()
 *   } else {
 *     // client is ready to accept commands
 *     console.log("Connected. Now closing connection.")
 *     client.close()
 *   }
 * })
 */
Client.prototype.connect = function (callback) {
  EventLoop.registerASEventLoop()

  const eventsCb = eventsCallback.bind(this)
  this.as_client.setupEventCb(eventsCb)

  const cmd = new Commands.Connect(this)
  return cmd.execute()
    .then(() => {
      this.connected = true
      _connectedClients += 1
      if (callback) callback(null, this)
      else return this
    })
    .catch(error => {
      this.as_client.close()
      if (callback) callback(error)
      else throw error
    })
}

/**
 * @function Client#createIndex
 *
 * @summary Creates a secondary index (SI).
 *
 * @description
 *
 * Calling the <code>createIndex</code> method issues an
 * index create command to the Aerospike cluster and returns immediately. To
 * verify that the index has been created and populated with all the data use
 * the {@link IndexJob} instance returned by the callback.
 *
 * Aerospike currently supports indexing of strings, integers and geospatial
 * information in GeoJSON format.
 *
 * ##### String Indexes
 *
 * A string index allows for equality lookups. An equality lookup means that if
 * you query for an indexed bin with value "abc", then only records containing
 * bins with "abc" will be returned.
 *
 * ##### Integer Indexes
 *
 * An integer index allows for either equality or range lookups. An equality
 * lookup means that if you query for an indexed bin with value 123, then only
 * records containing bins with the value 123 will be returned. A range lookup
 * means that if you can query bins within a range. So, if your range is
 * (1...100), then all records containing a value in that range will be
 * returned.
 *
 * ##### Geo 2D Sphere Indexes
 *
 * A geo 2d sphere index allows either "contains" or "within" lookups. A
 * "contains" lookup means that if you query for an indexed bin with GeoJSON
 * point element, then only records containing bins with a GeoJSON element
 * containing that point will be returned. A "within" lookup means that if you
 * query for an indexed bin with a GeoJSON polygon element, then all records
 * containing bins with a GeoJSON element wholly contained within that polygon
 * will be returned.
 *
 * @param {Object} options - Options for creating the index.
 * @param {string} options.ns - The namespace on which the index is to be created.
 * @param {string} options.set - The set on which the index is to be created.
 * @param {string} options.bin - The name of the bin which values are to be indexed.
 * @param {string} options.index - The name of the index to be created.
 * @param {module:aerospike.indexType} [options.type] - Type of index to be
 * created based on the type of values stored in the bin. This option needs to
 * be specified if the bin to be indexed contains list or map values and the
 * individual entries of the list or keys/values of the map should be indexed.
 * @param {module:aerospike.indexDataType} options.datatype - The data type of
 * the index to be created, e.g. Numeric, String or Geo.
 * @param {Object} options.context - The {@link CdtContext} on which the index is to be created.
 * @param {InfoPolicy} [policy] - The Info Policy to use for this operation.
 * @param {jobCallback} [callback] - The function to call when the operation completes.
 *
 * @returns {?Promise} - If no callback function is passed, the function
 * returns a Promise that will resolve to an {@link IndexJob} instance.
 *
 * @see {@link module:aerospike.indexType} for enumeration of supported index types.
 * @see {@link module:aerospike.indexDataType} for enumeration of supported data types.
 * @see {@link IndexJob}
 *
 * @since v2.0
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 * const Context = Aerospike.cdt.Context
 *
 * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
 * var config = {
 *   hosts: '192.168.33.10:3000',
 * }
 *
 * Aerospike.connect(config, (error, client) => {
 *   if (error) throw error
 *
 *   // create index over user's recent locations
 *   let namespace = 'test'
 *   let set = 'demo'
 *   let binName = 'rloc' // recent locations
 *   let indexName = 'recentLocationsIdx'
 *   let indexType = Aerospike.indexType.LIST
 *   let dataType = Aerospike.indexDataType.GEO2DSPHERE
 *   let context = new Context().addListIndex(0)
 *   let options = { ns: namespace,
 *                   set: set,
 *                   bin: binName,
 *                   index: indexName,
 *                   type: indexType,
 *                   datatype: dataType,
 *                   context: context }
 *
 *   let policy = new Aerospike.InfoPolicy({ timeout: 100 })
 *
 *   client.createIndex(options, policy, (error, job) => {
 *     if (error) throw error
 *
 *     // wait for index creation to complete
 *     var pollInterval = 100
 *     job.waitUntilDone(pollInterval, (error) => {
 *       if (error) throw error
 *       console.info('SI %s on %s was created successfully', indexName, binName)
 *       client.close()
 *     })
 *   })
 * })
 */
Client.prototype.createIndex = function (options, policy, callback) {
  if (typeof policy === 'function') {
    callback = policy
    policy = null
  }

  const args = [
    options.ns,
    options.set,
    options.bin,
    options.index,
    options.type || as.indexType.DEFAULT,
    options.datatype,
    { context: options.context },
    policy
  ]

  const cmd = new Commands.IndexCreate(this, args, callback)
  cmd.convertResult = () => new IndexJob(this, options.ns, options.index)
  return cmd.execute()
}

/**
 * @function Client#createIntegerIndex
 *
 * @summary Creates a SI of type Integer.
 *
 * @description This is a short-hand for calling {@link Client#createIndex}
 * with the <code>datatype</code> option set to <code>Aerospike.indexDataType.NUMERIC</code>.
 *
 * @param {Object} options - Options for creating the index.
 * @param {string} options.ns - The namespace on which the index is to be created.
 * @param {string} options.set - The set on which the index is to be created.
 * @param {string} options.bin - The name of the bin which values are to be indexed.
 * @param {string} options.index - The name of the index to be created.
 * @param {module:aerospike.indexType} [options.type] - Type of index to be
 * created based on the type of values stored in the bin. This option needs to
 * be specified if the bin to be indexed contains list or map values and the
 * individual entries of the list or keys/values of the map should be indexed.
 * @param {InfoPolicy} [policy] - The Info Policy to use for this operation.
 * @param {jobCallback} [callback] - The function to call when the operation completes.
 *
 * @returns {?Promise} - If no callback function is passed, the function
 * returns a Promise that will resolve to an {@link IndexJob} instance.
 *
 * @see {@link Client#indexCreate}
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 *
 * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
 * var config = {
 *   hosts: '192.168.33.10:3000',
 * }
 *
 * Aerospike.connect(config, (error, client) => {
 *   if (error) throw error
 *
 *   var binName = 'age'
 *   var indexName = 'ageIndex'
 *   var options = { ns: 'test',
 *                   set: 'demo',
 *                   bin: binName,
 *                   index: indexName }
 *
 *   client.createIntegerIndex(options, function (error) {
 *     if (error) throw error
 *     console.info('SI %s on %s was created successfully', indexName, binName)
 *     client.close()
 *   })
 * })
 */
Client.prototype.createIntegerIndex = function (options, policy, callback) {
  options.datatype = as.indexDataType.NUMERIC
  return this.createIndex(options, policy, callback)
}

/**
 * @function Client#createStringIndex
 *
 * @summary Creates a SI of type String.
 *
 * @description This is a short-hand for calling {@link Client#createIndex}
 * with the <code>datatype</code> option set to <code>Aerospike.indexDataType.STRING</code>.
 *
 * @param {Object} options - Options for creating the index.
 * @param {string} options.ns - The namespace on which the index is to be created.
 * @param {string} options.set - The set on which the index is to be created.
 * @param {string} options.bin - The name of the bin which values are to be indexed.
 * @param {string} options.index - The name of the index to be created.
 * @param {module:aerospike.indexType} [options.type] - Type of index to be
 * created based on the type of values stored in the bin. This option needs to
 * be specified if the bin to be indexed contains list or map values and the
 * individual entries of the list or keys/values of the map should be indexed.
 * @param {InfoPolicy} [policy] - The Info Policy to use for this operation.
 * @param {jobCallback} [callback] - The function to call when the operation completes.
 *
 * @returns {?Promise} - If no callback function is passed, the function
 * returns a Promise that will resolve to an {@link IndexJob} instance.
 *
 * @see {@link Client#indexCreate}
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 *
 * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
 * var config = {
 *   hosts: '192.168.33.10:3000',
 * }
 *
 * Aerospike.connect(config, (error, client) => {
 *   if (error) throw error
 *
 *   var binName = 'name'
 *   var indexName = 'nameIndex'
 *   var options = { ns: 'test',
 *                   set: 'demo',
 *                   bin: binName,
 *                   index: indexName }
 *
 *   client.createStringIndex(options, function (error) {
 *     if (error) throw error
 *     console.info('SI %s on %s was created successfully', indexName, binName)
 *     client.close()
 *   })
 * })
 */
Client.prototype.createStringIndex = function (options, policy, callback) {
  options.datatype = as.indexDataType.STRING
  return this.createIndex(options, policy, callback)
}

/**
 * @function Client#createGeo2DSphereIndex
 *
 * @summary Creates a geospatial secondary secondary index.
 *
 * @description This is a short-hand for calling {@link Client#createIndex}
 * with the <code>datatype</code> option set to <code>Aerospike.indexDataType.GEO2DSPHERE</code>.
 *
 * @param {Object} options - Options for creating the index.
 * @param {string} options.ns - The namespace on which the index is to be created.
 * @param {string} options.set - The set on which the index is to be created.
 * @param {string} options.bin - The name of the bin which values are to be indexed.
 * @param {string} options.index - The name of the index to be created.
 * @param {module:aerospike.indexType} [options.type] - Type of index to be
 * created based on the type of values stored in the bin. This option needs to
 * be specified if the bin to be indexed contains list or map values and the
 * individual entries of the list or keys/values of the map should be indexed.
 * @param {InfoPolicy} [policy] - The Info Policy to use for this operation.
 * @param {jobCallback} [callback] - The function to call when the operation completes.
 *
 * @returns {?Promise} - If no callback function is passed, the function
 * returns a Promise that will resolve to an {@link IndexJob} instance.
 *
 * @see {@link Client#indexCreate}
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
 * var config = {
 *   hosts: '192.168.33.10:3000',
 * }
 *
 * Aerospike.connect(config, (error, client) => {
 *   if (error) throw error
 *
 *   var binName = 'location'
 *   var indexName = 'locationIndex'
 *   var options = { ns: 'test',
 *                   set: 'demo',
 *                   bin: binName,
 *                   index: indexName }
 *
 *   client.createGeo2DSphereIndex(options, function (error) {
 *     if (error) throw error
 *     console.info('SI %s on %s was created successfully', indexName, binName)
 *     client.close()
 *   })
 * })
 */
Client.prototype.createGeo2DSphereIndex = function (options, policy, callback) {
  options.datatype = as.indexDataType.GEO2DSPHERE
  return this.createIndex(options, policy, callback)
}

/**
 * @function Client#createBlobIndex
 *
 * @summary Creates a blob secondary index index.
 *
 * @description This is a short-hand for calling {@link Client#createIndex}
 * with the <code>datatype</code> option set to <code>Aerospike.indexDataType.BLOB</code>.
 *
 * @param {Object} options - Options for creating the index.
 * @param {string} options.ns - The namespace on which the index is to be created.
 * @param {string} options.set - The set on which the index is to be created.
 * @param {string} options.bin - The name of the bin which values are to be indexed.
 * @param {string} options.index - The name of the index to be created.
 * @param {module:aerospike.indexType} [options.type] - Type of index to be
 * created based on the type of values stored in the bin. This option needs to
 * be specified if the bin to be indexed contains list or map values and the
 * individual entries of the list or keys/values of the map should be indexed.
 * @param {InfoPolicy} [policy] - The Info Policy to use for this operation.
 * @param {jobCallback} [callback] - The function to call when the operation completes.
 *
 * @returns {?Promise} - If no callback function is passed, the function
 * returns a Promise that will resolve to an {@link IndexJob} instance.
 *
 * @see {@link Client#indexCreate}
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
 * var config = {
 *   hosts: '192.168.33.10:3000',
 * }
 *
 * Aerospike.connect(config, (error, client) => {
 *   if (error) throw error
 *
 *   var binName = 'location'
 *   var indexName = 'locationIndex'
 *   var options = { ns: 'test',
 *                   set: 'demo',
 *                   bin: binName,
 *                   index: indexName }
 *
 *   client.createBlobIndex(options, function (error) {
 *     if (error) throw error
 *     console.info('SI %s on %s was created successfully', indexName, binName)
 *     client.close()
 *   })
 * })
 */
Client.prototype.createBlobIndex = function (options, policy, callback) {
  options.datatype = as.indexDataType.BLOB
  return this.createIndex(options, policy, callback)
}

/**
 * @function Client#apply
 *
 * @summary Applies a User Defined Function (UDF) on a record in the database.
 * @description Use this function to apply a
 * <a href="http://www.aerospike.com/docs/guide/record_udf.html">&uArr;Record UDF</a>
 * on a single record and return the result of the UDF function call. Record
 * UDFs can be used to augment both read and write behavior.
 *
 * For additional information please refer to the section on
 * <a href="https://www.aerospike.com/docs/udf/developing_record_udfs.html">&uArr;Developing Record UDFs</a>
 * in the Aerospike technical documentation.
 *
 * @param {Key} key - The key, used to locate the record in the cluster.
 * @param {Object} udfArgs - Parameters used to specify which UDF function to execute.
 * @param {string} udfArgs.module - The name of the UDF module that was registered with the cluster.
 * @param {string} udfArgs.funcname - The name of the UDF function within the module.
 * @param {Array.<(number|string)>} udfArgs.args - List of arguments to pass to the UDF function.
 * @param {ApplyPolicy} [policy] - The Apply Policy to use for this operation.
 * @param {valueCallback} [callback] - This function will be called with the
 * result returned by the Record UDF function call.
 *
 * @returns {?Promise} If no callback function is passed, the function returns
 * a Promise that resolves to the value returned by the UDF.
 *
 * @since v2.0
 *
 * @see {@link Client#udfRegister} to register a UDF module to use with <code>apply()</code>.
 * @see {@link Query#background} and {@link Scan#background} to apply a Record UDF function to multiple records instead.
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
 * const config = {
 *   hosts: '192.168.33.10:3000',
 *   // Timeouts disabled, latency dependent on server location. Configure as needed.
 *   policies: {
 *     apply : new Aerospike.ApplyPolicy({socketTimeout : 0, totalTimeout : 0}),
 *   }
 * }
 *
 * var key = new Aerospike.Key('test', 'demo', 'value')
 *
 * var udfArgs = {
 *   module: 'my_udf_module',
 *   funcname: 'my_udf_function',
 *   args: ['abc', 123, 4.5]
 * }
 *
 * Aerospike.connect(config, (error, client) => {
 *   if (error) throw error
 *   client.apply(key, udfArgs, (error, result) => {
 *     if (error) throw error
 *
 *     console.log('Result of calling my_udf_function:', result)
 *   })
 * })
 */
Client.prototype.apply = function (key, udfArgs, policy, callback) {
  if (typeof policy === 'function') {
    callback = policy
    policy = null
  }

  const cmd = new Commands.Apply(this, [key, udfArgs, policy], callback)
  return cmd.execute()
}

/**
 * @function Client#exists
 *
 * @summary Checks the existance of a record in the database cluster.
 *
 * @param {Key} key - The key of the record to check for existance.
 * @param {ReadPolicy} [policy] - The Read Policy to use for this operation.
 * @param {valueCallback} [callback] - The function to call when the
 * operation completes; the passed value is <code>true</code> if the record
 * exists or <code>false</code> otherwise.
 *
 * @returns {?Promise} If no callback function is passed, the function returns
 * a Promise that resolves to <code>true</code> if the record exists or
 * <code>false</code> otherwise.
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
 * var config = {
 *   hosts: '192.168.33.10:3000',
 *   policies: {
 *     read : new Aerospike.ReadPolicy({socketTimeout : 0, totalTimeout : 0}),
 *   }
 * }
 *
 * let key = new Aerospike.Key('test', 'demo', 'key1')
 * Aerospike.connect(config)
 *   .then(client => {
 *     return client.exists(key)
 *       .then(exists => console.info('Key "%s" exists: %s', key.key, exists))
 *       .then(() => client.close())
 *       .catch(error => {
 *         console.error('Error checking existance of key:', error)
 *         client.close()
 *       })
 *   })
 *   .catch(error => {
 *     console.error('Error connecting to cluster:', error)
 *   })
 */
Client.prototype.exists = function exists (key, policy, callback) {
  if (typeof policy === 'function') {
    callback = policy
    policy = null
  }

  const cmd = new Commands.Exists(this, null, [key, policy], callback)
  return cmd.execute()
}

Client.prototype.existsWithMetadata = function exists (key, policy, callback) {
  if (typeof policy === 'function') {
    callback = policy
    policy = null
  }

  const cmd = new Commands.Exists(this, key, [policy], callback)
  return cmd.execute()
}

/**
 * @function Client#get
 *
 * @summary Using the key provided, reads a record from the database cluster.
 *
 * @param {Key} key - The key used to locate the record in the cluster.
 * @param {ReadPolicy} [policy] - The Read Policy to use for this operation.
 * @param {recordCallback} [callback] - The function to call when the
 * operation completes with the results of the operation; if no callback
 * function is provided, the method returns a <code>Promise<code> instead.
 *
 * @returns {?Promise} If no callback function is passed, the function returns
 * a <code>Promise</code> that resolves to a {@link Record}.
 *
 * @example
 * const Aerospike = require('aerospike')
 * var key = new Aerospike.Key('test', 'demo', 'key1')
 *
 * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
 * var config = {
 *   hosts: '192.168.33.10:3000',
 *   policies: {
 *     read : new Aerospike.ReadPolicy({socketTimeout : 0, totalTimeout : 0}),
 *   }
 * }
 *
 * Aerospike.connect(config, (error, client) => {
 *   if (error) throw error
 *   client.get(key, (error, record) => {
 *     if (error) throw error
 *     console.log(record)
 *     client.close()
 *   })
 * })
 *
 */
Client.prototype.get = function (key, policy, callback) {
  if (typeof policy === 'function') {
    callback = policy
    policy = null
  }

  const cmd = new Commands.Get(this, key, [policy], callback)
  return cmd.execute()
}

/**
 * @function Client#indexRemove
 *
 * @summary Removes the specified index.
 *
 * @param {string} namespace - The namespace on which the index was created.
 * @param {string} index - The name of the index.
 * @param {InfoPolicy} [policy] - The Info Policy to use for this operation.
 * @param {doneCallback} [callback] - The function to call when the
 * operation completes with the result of the operation.
 *
 * @returns {?Promise} If no callback function is passed, the function returns
 * a <code>Promise</code> that resolves once the operation completes.
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 *
 * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
 * var config = {
 *   hosts: '192.168.33.10:3000',
 * }
 * Aerospike.connect(config, (error, client) => {
 *   client.indexRemove('location', 'locationIndex', (error) => {
 *     if (error) throw error
 *     client.close()
 *   })
 * })
 */
Client.prototype.indexRemove = function (namespace, index, policy, callback) {
  if (typeof policy === 'function') {
    callback = policy
    policy = null
  }

  const cmd = new Commands.IndexRemove(this, [namespace, index, policy], callback)
  return cmd.execute()
}

/**
 * @function Client#info
 *
 * @summary Sends an info query to a specific cluster node.
 *
 * @description The <code>request</code> parameter is a string representing an
 * info request. If it is not specified, a default set of info values will be
 * returned.
 *
 * Please refer to the
 * <a href="http://www.aerospike.com/docs/reference/info">Info Command Reference</a>
 * for a list of all available info commands.
 *
 * @param {?String} request - The info request to send.
 * @param {Object} host - The address of the cluster host to send the request to.
 * @param {string} host.addr - The IP address or host name of the host.
 * @param {number} [host.port=3000] - The port of the host.
 * @param {InfoPolicy} [policy] - The Info Policy to use for this operation.
 * @param {infoCallback} [callback] - The function to call when an info response from a cluster host is received.
 *
 * @see <a href="http://www.aerospike.com/docs/reference/info" title="Info Command Reference">&uArr;Info Command Reference</a>
 *
 * @deprecated since v3.11.0 - use {@link Client#infoNode} or {@link Client#infoAny} instead.
 *
 * @example <caption>Sending a 'statistics' info query to a single host</caption>
 *
 * const Aerospike = require('aerospike')
 *
 * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
 * var config = {
 *   hosts: '192.168.33.10:3000',
 * }
 *
 * Aerospike.connect(config, (error, client) => {
 *   if (error) throw error
 *   client.info('statistics', {addr: '192.168.33.10', port: 3000}, (error, response) => {
 *     if (error) throw error
 *     console.log(response)
 *     client.close()
 *   })
 * })
 *
 */
Client.prototype.info = function (request, host, policy, callback) {
  if (typeof policy === 'function') {
    callback = policy
    policy = null
  }

  if (typeof host === 'string') {
    host = utils.parseHostString(host)
  }

  const cmd = new Commands.InfoHost(this, [request, host, policy], callback)
  return cmd.execute()
}

/**
 * @function Client#infoAny
 *
 * @summary Sends an info query to a single, randomly selected cluster node.
 *
 * @description The <code>request</code> parameter is a string representing an
 * info request. If it is not specified, a default set of info values will be
 * returned.
 *
 * @param {string} [request] - The info request to send.
 * @param {InfoPolicy} [policy] - The Info Policy to use for this operation.
 * @param {infoCallback} [callback] - The function to call once the node
 * returns the response to the info command; if no callback function is
 * provided, the method returns a <code>Promise<code> instead.
 *
 * @see <a href="http://www.aerospike.com/docs/reference/info" title="Info Command Reference">&uArr;Info Command Reference</a>
 *
 * @since v2.4.0
 *
 * @example <caption>Sending 'statistics' info command to random cluster node</caption>
 *
 * const Aerospike = require('aerospike')
 *
 * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
 * var config = {
 *   hosts: '192.168.33.10:3000',
 * }
 *
 * Aerospike.connect(config, (error, client) => {
 *   if (error) throw error
 *   client.infoAny('statistics', (error, response) => {
 *     if (error) throw error
 *     console.log(response)
 *     client.close()
 *   })
 * })
 *
 */
Client.prototype.infoAny = function (request, policy, callback) {
  if (typeof request === 'function') {
    callback = request
    request = null
    policy = null
  } else if (typeof policy === 'function') {
    callback = policy
    policy = null
  }

  const cmd = new Commands.InfoAny(this, [request, policy], callback)
  return cmd.execute()
}

/**
 * @function Client#infoAll
 *
 * @summary Sends an info query to all nodes in the cluster and collects the
 * results.
 *
 * @description The <code>request</code> parameter is a string representing an
 * info request. If it is not specified, a default set of info values will be
 * returned.
 *
 * @param {string} [request] - The info request to send.
 * @param {InfoPolicy} [policy] - The Info Policy to use for this operation.
 * @param {infoCallback} [callback] - The function to call once all nodes have
 * returned a response to the info command; if no callback function is
 * provided, the method returns a <code>Promise<code> instead.
 *
 * @see <a href="http://www.aerospike.com/docs/reference/info" title="Info Command Reference">&uArr;Info Command Reference</a>
 *
 * @since v2.3.0
 *
 * @example <caption>Sending info command to whole cluster</caption>
 *
 * const Aerospike = require('aerospike')
 *
 * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
 * var config = {
 *   hosts: '192.168.33.10:3000',
 * }
 *
 * Aerospike.connect(config, (error, client) => {
 *   if (error) throw error
 *   client.infoAll('statistics', (error, response) => {
 *     if (error) throw error
 *     console.log(response)
 *     client.close()
 *   })
 * })
 *
 */
Client.prototype.infoAll = function (request, policy, callback) {
  if (typeof request === 'function') {
    callback = request
    request = null
    policy = null
  } else if (typeof policy === 'function') {
    callback = policy
    policy = null
  }

  const cmd = new Commands.InfoForeach(this, [request, policy], callback)
  return cmd.execute()
}

/**
 * @function Client#infoNode
 *
 * @summary Sends an info query to a single node in the cluster.
 *
 * @description The <code>request</code> parameter is a string representing an
 * info request. If it is not specified, a default set of info values will be
 * returned.
 *
 * @param {?string} request - The info request to send.
 * @param {object} node - The node to send the request to.
 * @param {string} node.name - The node name.
 * @param {InfoPolicy} [policy] - The Info Policy to use for this operation.
 * @param {infoCallback} [callback] - The function to call once the node
 * returns the response to the info command; if no callback function is
 * provided, the method returns a <code>Promise<code> instead.
 *
 * @see <a href="http://www.aerospike.com/docs/reference/info" title="Info Command Reference">&uArr;Info Command Reference</a>
 *
 * @since v3.11.0
 *
 * @example <caption>Sending 'statistics' info command to specific cluster node</caption>
 *
 *
 * const Aerospike = require('aerospike')
 *
 * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
 * var config = {
 *   hosts: '192.168.33.10:3000',
 * }
 *
 * Aerospike.connect(config, (error, client) => {
 *   if (error) throw error
 *   const node = client.getNodes().pop()
 *   client.infoNode('statistics', node, (error, response) => {
 *     if (error) throw error
 *     console.log(response)
 *     client.close()
 *   })
 * })
 *
 */
Client.prototype.infoNode = function (request, node, policy, callback) {
  if (typeof policy === 'function') {
    callback = policy
    policy = null
  }

  const cmd = new Commands.InfoNode(this, [request, node.name, policy], callback)
  return cmd.execute()
}

/**
 * @function Client#isConnected
 *
 * @summary Is client connected to any server nodes.
 *
 * @param {boolean} [checkTenderErrors=true] - Whether to consider a server
 * node connection that has had 5 consecutive info request failures during
 * cluster tender.
 *
 * @returns {boolean} <code>true</code> if the client is currently connected to any server nodes.
 *
 * @since v2.0
 */
Client.prototype.isConnected = function (checkTenderErrors) {
  if (typeof checkTenderErrors === 'undefined') {
    checkTenderErrors = true
  }
  let connected = this.connected
  if (connected && checkTenderErrors) {
    connected = this.as_client.isConnected()
  }
  return connected
}

/**
 * @function Client#operate
 *
 * @summary Performs multiple operations on a single record.
 *
 * @description Operations can be created using the methods in one of the
 * following modules:
 * * {@link module:aerospike/operations} - General operations on all types.
 * * {@link module:aerospike/lists} - Operations on CDT List values.
 * * {@link module:aerospike/maps} - Operations on CDT Map values.
 * * {@link module:aerospike/bitwise} - Operations on Bytes values.
 *
 * @param {Key} key - The key of the record.
 * @param {module:aerospike/operations~Operation[]} operations - List of operations to perform on the record.
 * @param {Object} [metadata] - Meta data.
 * @param {OperatePolicy} [policy] - The Operate Policy to use for this operation.
 * @param {recordCallback} [callback] - The function to call when the
 * operation completes with the results of the operation; if no callback
 * function is provided, the method returns a <code>Promise<code> instead.
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 * const op = Aerospike.operations
 * const key = new Aerospike.Key('test', 'demo', 'mykey1')
 * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
 * var config = {
 *   hosts: '192.168.33.10:3000',
 *   // Timeouts disabled, latency dependent on server location. Configure as needed.
 *   policies: {
 *     operate : new Aerospike.OperatePolicy({socketTimeout : 0, totalTimeout : 0}),
 *     write : new Aerospike.WritePolicy({socketTimeout : 0, totalTimeout : 0}),
 *   }
 * }
 * var ops = [
 *   op.append('a', 'xyz'),
 *   op.incr('b', 10),
 *   op.read('b')
 * ]
 *
 * Aerospike.connect(config, (error, client) => {
 *   if (error) throw error
 *   client.put(key, { a: 'abc', b: 42 }, (error) => {
 *     if (error) throw error
 *     client.operate(key, ops, (error, record) => {
 *       if (error) throw error
 *       console.log(record.bins) // => { b: 52 }
 *       client.close()
 *     })
 *   })
 * })
 *
 */
Client.prototype.operate = function (key, operations, metadata, policy, callback) {
  if (typeof policy === 'function') {
    callback = policy
    policy = null
  } else if (typeof metadata === 'function') {
    callback = metadata
    metadata = null
  }

  const cmd = new Commands.Operate(this, key, [operations, metadata, policy], callback)
  return cmd.execute()
}

/**
 * @function Client#append
 *
 * @summary Shortcut for applying the {@link
 * module:aerospike/operations.append} operation to one or more record bins.
 *
 * @description This function works on bins of type string or bytes; to append
 * a new value (of any type) to a bin containing a list of existing values, use
 * the {@link module:aerospike/lists.append} operation instead.
 *
 * @param {Key} key - The key of the record.
 * @param {Object[]} bins - The key-value mapping of bin names and the
 * corresponding values to append to the bin value. The bins must contain
 * either string or byte array values and the values to append must be of the
 * same type.
 * @param {Object} [metadata] - Meta data.
 * @param {OperatePolicy} [policy] - The Operate Policy to use for this operation.
 * @param {recordCallback} [callback] - The function to call when the
 * operation completes with the results of the operation.
 *
 * @returns {?Promise} - If no callback function is passed, the function
 * returns a Promise that resolves to the results of the opertion.
 *
 * @see {@link Client#operate}
 * @see {@link module:aerospike/operations.append}
 */

/**
 * @function Client#prepend
 *
 * @summary Shortcut for applying the {@link module:aerospike/operations.prepend} operation to one or more record bins.
 *
 * @param {Key} key - The key of the record.
 * @param {Object[]} bins - The key-value mapping of bin names and the corresponding values to prepend to the bin value.
 * @param {Object} [metadata] - Meta data.
 * @param {OperatePolicy} [policy] - The Operate Policy to use for this operation.
 * @param {recordCallback} [callback] - The function to call when the
 * operation completes with the results of the operation.
 *
 * @returns {?Promise} - If no callback function is passed, the function
 * returns a Promise that resolves to the results of the opertion.
 *
 * @see {@link Client#operate}
 * @see {@link module:aerospike/operations.prepend}
 */

/**
 * @function Client#add
 *
 * @summary Shortcut for applying the {@link module:aerospike/operations.add} operation to one or more record bins.
 *
 * @param {Key} key - The key of the record.
 * @param {Object[]} bins - The key-value mapping of bin names and the corresponding values to use to increment the bin values with.
 * @param {Object} [metadata] - Meta data.
 * @param {OperatePolicy} [policy] - The Operate Policy to use for this operation.
 * @param {recordCallback} [callback] - The function to call when the
 * operation completes with the results of the operation.
 *
 * @returns {?Promise} - If no callback function is passed, the function
 * returns a Promise that resolves to the results of the opertion.
 *
 * @since v2.0
 *
 * @see {@link Client#operate}
 * @see {@link module:aerospike/operations.incr}
 */

// Shortcuts for some operations
;['append', 'prepend', 'add'].forEach(op => {
  Client.prototype[op] = function (key, bins, metadata, policy, callback) {
    const ops = Object.keys(bins).map(bin => operations[op](bin, bins[bin]))
    return this.operate(key, ops, metadata, policy, callback)
  }
})

/**
 * @function Client#incr
 *
 * @summary Alias for {@link Client#add}.
 *
 * @param {Key} key - The key of the record.
 * @param {Object[]} bins - The key-value mapping of bin names and the corresponding values to use to increment the bin values with.
 * @param {Object} [metadata] - Meta data.
 * @param {OperatePolicy} [policy] - The Operate Policy to use for this operation.
 * @param {recordCallback} [callback] - The function to call when the
 * operation completes with the results of the operation.
 *
 * @returns {?Promise} - If no callback function is passed, the function
 * returns a Promise that resolves to the results of the opertion.
 */
Client.prototype.incr = Client.prototype.add

/**
 * @function Client#put
 *
 * @summary Writes a record to the database cluster.
 *
 * @description
 * If the record exists, it modifies the record with bins provided.
 * To remove a bin, set its value to <code>null</code>.
 *
 * __Note:__ The client does not perform any automatic data type conversions.
 * Attempting to write an unsupported data type (e.g. boolean) into a record
 * bin will cause an error to be returned. Setting an <code>undefined</code>
 * value will also cause an error.
 *
 * @param {Key} key - The key of the record.
 * @param {object} bins - A record object used for specifying the fields to store.
 * @param {object} [meta] - Meta data.
 * @param {WritePolicy} [policy] - The Write Policy to use for this operation.
 * @param {writeCallback} [callback] - The function to call when the operation completes with the result of the operation.
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 *
 * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
 * var config = {
 *   hosts: '192.168.33.10:3000',
 *   // Timeouts disabled, latency dependent on server location. Configure as needed.
 *   policies: {
 *     read : new Aerospike.ReadPolicy({socketTimeout : 0, totalTimeout : 0}),
 *     write : new Aerospike.WritePolicy({socketTimeout : 0, totalTimeout : 0}),
 *   }
 * }
 *
 * const Key = Aerospike.Key
 *
 * var key = new Key('test', 'demo', 'key1')
 * var bins = {
 *   a: 'xyz',
 *   b: 123
 * }
 * Aerospike.connect(config, (error, client) => {
 *   if (error) throw error
 *   client.put(key, bins, (error) => {
 *     if (error) throw error
 *     client.get(key, (error, record) => {
 *       if (error) throw error
 *       console.log(record)
 *       client.close()
 *     })
 *   })
 * })
 */
Client.prototype.put = function (key, bins, meta, policy, callback) {
  if (typeof meta === 'function') {
    callback = meta
    meta = null
  } else if (typeof policy === 'function') {
    callback = policy
    policy = null
  }

  const cmd = new Commands.Put(this, key, [bins, meta, policy], callback)
  return cmd.execute()
}

/**
 * @function Client#query
 *
 * @summary Creates a new {@link Query} instance, which is used to define query
 * in the database.
 *
 * @param {string} ns - The namespace to be queried.
 * @param {string} set - The set on which the query is to be executed.
 * @param {object} [options] - Query parameters. See {@link Query} constructor for details.
 *
 * @see {@link Query}
 *
 * @example
 *
 * const filter = Aerospike.filter
 *
 * var statement = {}
 * statment.filters: [filter.equal('color', 'blue')]
 *
 * var query = client.query(ns, set, statment)
 * var stream = query.execute()
 */
Client.prototype.query = function (ns, set, options) {
  options = options || {}
  if (!this.isConnected()) {
    throw new AerospikeError('Not connected.')
  }
  return new Query(this, ns, set, options)
}

/**
 * @function Client#remove
 *
 * @summary Removes a record with the specified key from the database cluster.
 *
 * @param {Key} key - The key of the record.
 * @param {RemovePolicy} [policy] - The Remove Policy to use for this operation.
 * @param {writeCallback} [callback] - The function to call when the operation completes with the results of the operation.
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 *
 * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
 * var config = {
 *   hosts: '192.168.33.10:3000',
 *   // Timeouts disabled, latency dependent on server location. Configure as needed.
 *   policies: {
 *     remove : new Aerospike.RemovePolicy({socketTimeout : 0, totalTimeout : 0}),
 *     write : new Aerospike.WritePolicy({socketTimeout : 0, totalTimeout : 0}),
 *   }
 * }
 *
 * const Key = Aerospike.Key
 *
 * var key = new Key('test', 'demo', 'key1')
 * var bins = {
 *   a: 'xyz',
 *   b: 123
 * }
 * Aerospike.connect(config, (error, client) => {
 *   if (error) throw error
 *   client.put(key, bins, (error) => {
 *     if (error) throw error
 *     client.remove(key, (error) => {
 *       if (error) throw error
 *       console.log("Record removed")
 *       client.close()
 *     })
 *   })
 * })
 */
Client.prototype.remove = function (key, policy, callback) {
  if (typeof policy === 'function') {
    callback = policy
    policy = null
  }

  const cmd = new Commands.Remove(this, key, [policy], callback)
  return cmd.execute()
}

/**
 * @function Client#scan
 *
 * @summary Creates a new {@link Scan} instance in order to execute a database
 * scan using the Scan API.
 *
 * @see {@link Scan} constructor for options that can be used to initialize a
 * new instance.
 *
 * @param {string} ns - The namescape.
 * @param {string} set - The name of a set.
 * @param {object} [options] - Scan parameters. See {@link Scan} constructor for details.
 *
 * @since v2.0
 */
Client.prototype.scan = function (ns, set, options) {
  options = options || {}
  if (!this.isConnected()) {
    throw new AerospikeError('Not connected.')
  }
  return new Scan(this, ns, set, options)
}

/**
 * @function Client#select
 *
 * @summary Retrieves selected bins for a record of given key from the database cluster.
 *
 * @param {Key} key - The key of the record.
 * @param {string[]} bins - A list of bin names for the bins to be returned.
 * @param {ReadPolicy} [policy] - The Read Policy to use for this operation.
 * @param {recordCallback} [callback] - The function to call when the
 * operation completes with the results of the operation; if no callback
 * function is provided, the method returns a <code>Promise<code> instead.
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 *
 * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
 * var config = {
 *   hosts: '192.168.33.10:3000',
 *   // Timeouts disabled, latency dependent on server location. Configure as needed.
 *   policies: {
 *     read : new Aerospike.ReadPolicy({socketTimeout : 0, totalTimeout : 0}),
 *     write : new Aerospike.WritePolicy({socketTimeout : 0, totalTimeout : 0}),
 *   }
 * }
 *
 * const Key = Aerospike.Key
 *
 * var key = new Key('test', 'demo', 'key1')
 *
 * var bins = {
 *   a: 'xyz',
 *   b: 123
 * }
 *
 * Aerospike.connect(config, (error, client) => {
 *   if (error) throw error
 *   client.put(key, bins, (error) => {
 *     if (error) throw error
 *     client.select(key, ['a', 'b'], (error, record) => {
 *       if (error) throw error
 *       console.log(record)
 *       client.close()
 *     })
 *   })
 * })
 *
 */
Client.prototype.select = function (key, bins, policy, callback) {
  if (typeof policy === 'function') {
    callback = policy
    policy = null
  }

  const cmd = new Commands.Select(this, key, [bins, policy], callback)
  return cmd.execute()
}

/**
 * @function Client#truncate
 *
 * @summary Removes records in specified namespace/set efficiently.
 *
 * @description This method is many orders of magnitude faster than deleting
 * records one at a time. It requires server 3.12 or later.
 *
 * @param {string} ns - Required namespace.
 * @param {string} set - Optional set name. Set to <code>null</code> to delete
 * all sets in namespace.
 * @param {number} before_nanos - Optionally delete records before given last
 * update time. Units are in nanoseconds since unix epoch (1970-01-01). If
 * specified, the value must be before the current time. Pass in 0 to delete
 * all records in namespace/set regardless of last udpate time.
 * @param {InfoPolicy} [policy] - The Info Policy to use for this operation.
 * @param {doneCallback} [callback] - The function to call when the
 * operation completes with the result of the operation.
 *
 * @see https://www.aerospike.com/docs/reference/info#truncate
 */
Client.prototype.truncate = function (ns, set, beforeNanos, policy, callback) {
  if (typeof set === 'function') {
    callback = set
    set = null
    beforeNanos = 0
    policy = null
  } else if (typeof beforeNanos === 'function') {
    callback = beforeNanos
    beforeNanos = 0
    policy = null
  } else if (typeof policy === 'function') {
    callback = policy
    policy = null
  }

  const cmd = new Commands.Truncate(this, [ns, set, beforeNanos, policy], callback)
  return cmd.execute()
}

/**
 * @function Client#udfRegister
 *
 * @summary Registers a UDF module with the database cluster.
 *
 * @description This method loads a Lua script from the local filesystem into
 * the Aerospike database cluster and registers it for use as a UDF module. The
 * client uploads the module to a single cluster node. It then gets distributed
 * within the whole cluster automatically. The callback function is called once
 * the initial upload into the cluster has completed (or if an error occurred
 * during the upload). One of the callback parameters is a {@link UdfJob}
 * instance that can be used to verify that the module has been registered
 * successfully on the entire cluster.
 *
 * @param {string} path - The file path to the Lua script to load into the server.
 * @param {number} [udfType] - Language of the UDF script. Lua is the default
 * and only supported scripting language for UDF modules at the moment; ref.
 * {@link module:aerospike.language}.
 * @param {InfoPolicy} [policy] - The Info Policy to use for this operation.
 * @param {jobCallback} [callback] - The function to call when the
 * operation completes with the result of the operation.
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 *
 * Aerospike.connect((error, client) => {
 *   if (error) throw error
 *
 *   var path = './udf/my_module.lua'
 *   client.udfRegister(path, (error, job) => {
 *     if (error) throw error
 *
 *     job.waitUntilDone(100, (error) => {
 *       if (error) throw error
 *
 *       // UDF module was successfully registered on all cluster nodes
 *
 *       client.close()
 *     })
 *   })
 * })
 */
Client.prototype.udfRegister = function (udfPath, udfType, policy, callback) {
  if (typeof udfType === 'function') {
    callback = udfType
    udfType = null
  } else if (typeof policy === 'function') {
    callback = policy
    policy = null
  }
  if (typeof udfType === 'object') {
    policy = udfType
    udfType = null
  }

  const cmd = new Commands.UdfRegister(this, [udfPath, udfType, policy], callback)
  cmd.convertResult = () => {
    const module = path.basename(udfPath)
    return new UdfJob(this, module, UdfJob.REGISTER)
  }
  return cmd.execute()
}

/**
 * @function Client#stats
 *
 * @summary Returns runtime stats about the client instance.
 *
 * @returns {ClientStats} client stats
 *
 * @since v3.8.0
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 *
 * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
 * var config = {
 *   hosts: '192.168.33.10:3000',
 * }
 *
 * Aerospike.connect(config, (error, client) => {
 *   if (error) throw error
 *   const stats = client.stats()
 *   console.info(stats) // => { commands: { inFlight: 0, queued: 0 },
 *                       //      nodes:
 *                       //       [ { name: 'BB94DC08D270008',
 *                       //           syncConnections: { inPool: 1, inUse: 0 },
 *                       //           asyncConnections: { inPool: 0, inUse: 0 } },
 *                       //         { name: 'C1D4DC08D270008',
 *                       //           syncConnections: { inPool: 0, inUse: 0 },
 *                       //           asyncConnections: { inPool: 0, inUse: 0 } } ] }
 *   client.close()
 * })
 *
 */
Client.prototype.stats = function () {
  return this.as_client.getStats()
}

/**
 * @function Client#udfRemove
 *
 * @summary Removes a UDF module from the cluster.
 *
 * @description The info command to deregister the UDF module is sent to a
 * single cluster node by the client. It then gets distributed within the whole
 * cluster automatically. The callback function is called once the initial info
 * command has succeeded (or if an error occurred). One of the callback
 * parameters is a {@link UdfJob} instance that can be used to verify that the
 * module has been removed successfully from the entire cluster.
 *
 * For server versions 4.5.0 and before, trying to delete an UDF module that
 * does not exist on the server, will return an error. Starting with server
 * version 4.5.1, the server no longer returns an error and the command will
 * succeed.
 *
 * @param {string} udfModule - The basename of the UDF module, without the
 * local pathname but including the file extension (".lua").
 * @param {InfoPolicy} [policy] - The Info Policy to use for this operation.
 * @param {jobCallback} [callback] - The function to call when the
 * operation completes which the result of the operation.
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 *
 * Aerospike.connect((error, client) => {
 *   if (error) throw error
 *
 *   var module = 'my_module.lua'
 *   client.udfRemove(module, (error, job) => {
 *     if (error) throw error
 *
 *     job.waitUntilDone(100, (error) => {
 *       if (error) throw error
 *
 *       // UDF module was successfully removed from all cluster nodes
 *
 *       client.close()
 *     })
 *   })
 * })
 */
Client.prototype.udfRemove = function (udfModule, policy, callback) {
  if (typeof policy === 'function') {
    callback = policy
    policy = null
  }

  const cmd = new Commands.UdfRemove(this, [udfModule, policy], callback)
  cmd.convertResult = () => new UdfJob(this, udfModule, UdfJob.UNREGISTER)
  return cmd.execute()
}

Client.prototype.updateLogging = function (logConfig) {
  this.as_client.updateLogging(logConfig)
}

module.exports = Client
