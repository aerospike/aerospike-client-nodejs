// *****************************************************************************
// Copyright 2026 Aerospike, Inc.
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

const util = require('util')

// Wraps a JavaScript seed provider and an AWS credentials hook for the native
// bridge. The C client calls them on its discovery thread; the native bridge
// hands each call to the JavaScript thread, where these wrappers call the
// user's function, wait for its Promise, check the result and call done()
// exactly once. Only a config with a JavaScript provider or hook goes through
// here, so every other config reaches the native client unchanged.

const MAX_HOST_LENGTH = 255
// More seed hosts than any cluster needs; a longer list is a provider bug.
const MAX_HOSTS = 10000
const DEFAULT_REFRESH_TIMEOUT_MS = 10000
const DEFAULT_REFRESH_INTERVAL_MS = 30000

// The periodic flag computed when the config was checked, with the provider it
// belongs to, so needsPeriodicRefresh() is called once per config and a
// config copied with another provider asks that provider again.
const kPeriodic = Symbol('aerospike.discovery.periodic')

function isProviderObject (provider) {
  return provider !== null && typeof provider === 'object'
}

// The name used in the C client's logs and in ERR_SEED_DISCOVERY_FAILED: the
// provider's class name, or 'js' for a plain object.
function providerName (provider) {
  try {
    const ctor = provider.constructor
    const name = typeof ctor === 'function' ? ctor.name : ''
    return typeof name === 'string' && name && name !== 'Object' && name !== 'Function' && !name.includes('\0') ? name : 'js'
  } catch (err) {
    return 'js'
  }
}

// A message for anything thrown, never throwing itself.
function errorMessage (err) {
  let message
  try {
    message = err === undefined || err === null
      ? ''
      : err instanceof Error ? (err.message || err.name) : String(err)
  } catch (e) {
    message = ''
  }
  return typeof message === 'string' && message !== '' ? message : 'unknown error'
}

// Calls fn(arg) and passes its result, or the Promise's, through check to
// done(error) or done(null, value). done is called exactly once, whatever fn,
// its Promise or check do.
function callChecked (fn, arg, check, done) {
  let called = false
  const finish = (error, value) => {
    if (called) return
    called = true
    if (error !== null) done(error)
    else done(null, value)
  }
  let result
  try {
    result = fn(arg)
  } catch (err) {
    finish(errorMessage(err))
    return
  }
  try {
    // A hostile Promise (a throwing then() or constructor getter) can throw
    // here; its message is kept.
    Promise.resolve(result)
      .then(value => {
        let checked
        try {
          checked = check(value)
        } catch (err) {
          finish(errorMessage(err))
          return
        }
        finish(null, checked)
      }, err => finish(errorMessage(err)))
      .catch(err => finish(errorMessage(err)))
  } catch (err) {
    finish(errorMessage(err))
  }
}

function sameHost (a, b) {
  return a.addr === b.addr && a.port === b.port
}

// Checks one refresh result. Any invalid host fails the whole refresh, naming
// its index (tech spec); a configured seed returned unchanged is not range
// checked, as in the C client. Every index is checked, holes included, and
// fresh plain objects are returned.
function checkHosts (result, configuredSeeds) {
  if (!Array.isArray(result)) {
    throw new Error(`refreshSeedCandidates must return an array of hosts, got ${result === null ? 'null' : typeof result}`)
  }
  if (result.length > MAX_HOSTS) {
    throw new Error(`refreshSeedCandidates returned ${result.length} hosts, more than ${MAX_HOSTS}`)
  }
  const hosts = []
  for (let i = 0; i < result.length; i++) {
    const host = result[i]
    if (host === null || typeof host !== 'object') {
      throw new Error(`invalid host at index ${i}: expected an object { addr, port, tlsname }`)
    }
    const { addr, port, tlsname } = host
    if (typeof addr !== 'string' || addr === '' || addr.includes('\0')) {
      throw new Error(`invalid host at index ${i}: addr must be a non-empty string`)
    }
    if (!Number.isInteger(port)) {
      throw new Error(`invalid host at index ${i}: port must be an integer`)
    }
    if (tlsname !== undefined && tlsname !== null && (typeof tlsname !== 'string' || tlsname.includes('\0'))) {
      throw new Error(`invalid host at index ${i}: tlsname must be a string`)
    }
    const configured = configuredSeeds.some(seed => sameHost(seed, { addr, port }))
    if (!configured) {
      if (port < 1 || port > 65535) {
        throw new Error(`invalid host at index ${i}: port ${port} is outside 1-65535`)
      }
      if (Buffer.byteLength(addr) > MAX_HOST_LENGTH) {
        throw new Error(`invalid host at index ${i}: addr is longer than ${MAX_HOST_LENGTH} bytes`)
      }
    }
    // '' and null mean no TLS name, the same as a missing one.
    hosts.push({ addr, port, tlsname: tlsname || null })
  }
  return hosts
}

// The spec the native client registers for a JavaScript seed provider.
// waitLimitMs bounds how long the bridge waits for one call of a periodic
// provider: a late answer is still used within it (as the C client uses late
// results); past it the call fails, the provider isn't called again until it
// settles, and its answer is dropped, so a Promise that never settles doesn't
// stop later refreshes. A provider that isn't periodic is called once, and its
// late first answer is published as the C client publishes it, so it has no
// limit (0); close and a failed connect still end the wait.
function providerSpec (provider, periodic, waitLimitMs) {
  return {
    name: providerName(provider),
    periodic,
    waitLimitMs,
    // ctx is a new read-only object for each call.
    refresh (ctx, done) {
      const context = Object.freeze({
        clusterName: ctx.clusterName,
        configuredSeeds: Object.freeze(ctx.configuredSeeds.map(seed => Object.freeze(seed))),
        tendIteration: ctx.tendIteration
      })
      callChecked(c => provider.refreshSeedCandidates(c), context,
        hosts => checkHosts(hosts, ctx.configuredSeeds), done)
    },
    // Called once, on the JavaScript thread, after the last refresh has
    // returned. A throw or a rejected Promise is passed to warn (the client
    // log), never thrown.
    close (warn) {
      let result
      try {
        if (typeof provider.close !== 'function') return
        result = provider.close()
      } catch (err) {
        warn(errorMessage(err))
        return
      }
      if (result !== null && (typeof result === 'object' || typeof result === 'function')) {
        Promise.resolve(result).catch(err => warn(errorMessage(err)))
      }
    }
  }
}

const VISIBLE_ASCII = /^[\x21-\x7e]+$/
// Below this, an expiration is in seconds, not milliseconds (it would be
// before 1973).
const MIN_EXPIRATION_MS = 1e11

function checkCredentials (value) {
  if (value === null || typeof value !== 'object') {
    throw new Error('credentialsHook must return an object { accessKeyId, secretAccessKey, sessionToken, expiration }')
  }
  const { accessKeyId, secretAccessKey, sessionToken } = value
  let { expiration } = value
  if (typeof accessKeyId !== 'string' || !/^[A-Za-z0-9]+$/.test(accessKeyId)) {
    throw new Error('credentialsHook returned an invalid accessKeyId: expected letters and digits')
  }
  // Values are never put in a message.
  if (typeof secretAccessKey !== 'string' || !VISIBLE_ASCII.test(secretAccessKey)) {
    throw new Error('credentialsHook returned an invalid secretAccessKey')
  }
  if (sessionToken !== undefined && sessionToken !== null && sessionToken !== '' &&
      (typeof sessionToken !== 'string' || !VISIBLE_ASCII.test(sessionToken))) {
    throw new Error('credentialsHook returned an invalid sessionToken')
  }
  // The AWS SDK returns expiration as a Date (also from another realm).
  if (util.types.isDate(expiration)) {
    expiration = Date.prototype.getTime.call(expiration)
  }
  if (expiration !== undefined && expiration !== null && expiration !== 0 &&
      (!Number.isSafeInteger(expiration) || expiration < MIN_EXPIRATION_MS)) {
    throw new Error('credentialsHook returned an invalid expiration: expected a Date or milliseconds since the epoch, or 0 for none')
  }
  return {
    accessKeyId,
    secretAccessKey,
    sessionToken: sessionToken || null,
    expiration: expiration || 0
  }
}

// The spec the native client registers for a JavaScript credentials hook.
function credentialsHookSpec (hook) {
  return {
    get (timeoutMs, done) {
      callChecked(arg => hook(arg), { timeoutMs }, checkCredentials, done)
    }
  }
}

function hasJsPlugins (config) {
  const discovery = config && config.discovery
  if (!discovery) return false
  return isProviderObject(discovery.provider) ||
    (discovery.aws !== undefined && typeof discovery.aws.credentialsHook === 'function')
}

// The config to pass to the native client: unchanged without a JavaScript
// provider or hook; otherwise a copy whose provider and hook are replaced by
// the specs above.
function forNative (config) {
  if (!hasJsPlugins(config)) return config
  const copy = Object.assign(Object.create(Object.getPrototypeOf(config)), config)
  const discovery = Object.assign({}, config.discovery)
  if (isProviderObject(discovery.provider)) {
    const periodic = config.discovery[kPeriodic].periodic
    const timeout = discovery.refreshTimeoutMs ?? DEFAULT_REFRESH_TIMEOUT_MS
    const interval = discovery.refreshIntervalMs ?? DEFAULT_REFRESH_INTERVAL_MS
    discovery.provider = providerSpec(discovery.provider, periodic, periodic ? Math.max(timeout, interval) : 0)
  }
  if (discovery.aws !== undefined && typeof discovery.aws.credentialsHook === 'function') {
    discovery.aws = Object.assign({}, discovery.aws, { credentialsHook: credentialsHookSpec(discovery.aws.credentialsHook) })
  }
  copy.discovery = discovery
  return copy
}

module.exports = {
  kPeriodic,
  isProviderObject,
  providerName,
  errorMessage,
  checkHosts,
  checkCredentials,
  hasJsPlugins,
  forNative
}
