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

// Wraps a JavaScript seed provider and an AWS credentials hook for the native
// bridge. The C client calls them on its discovery thread; the native bridge
// hands each call to the JavaScript thread, where these wrappers call the
// user's function, wait for its Promise, check the result and call done()
// exactly once. Only a config with a JavaScript provider or hook goes through
// here, so every other config reaches the native client unchanged.

const MAX_HOST_LENGTH = 255

// The periodic flag computed when the config was checked, so the provider's
// needsPeriodicRefresh() is called once per config.
const kPeriodic = Symbol('aerospike.discovery.periodic')

function isProviderObject (provider) {
  return provider !== null && typeof provider === 'object'
}

// The name used in the C client's logs and in ERR_SEED_DISCOVERY_FAILED: the
// provider's class name, or 'js' for a plain object.
function providerName (provider) {
  const ctor = provider.constructor
  const name = typeof ctor === 'function' ? ctor.name : ''
  return name && name !== 'Object' && name !== 'Function' ? name : 'js'
}

function errorMessage (err) {
  if (err instanceof Error) return err.message || err.name
  return String(err)
}

function sameHost (a, b) {
  return a.addr === b.addr && a.port === b.port
}

// Checks one refresh result. Any invalid host fails the whole refresh, naming
// its index (tech spec); a configured seed returned unchanged is not range
// checked, as in the C client.
function checkHosts (result, configuredSeeds) {
  if (!Array.isArray(result)) {
    throw new Error(`refreshSeedCandidates must return an array of hosts, got ${result === null ? 'null' : typeof result}`)
  }
  return result.map((host, i) => {
    if (host === null || typeof host !== 'object') {
      throw new Error(`invalid host at index ${i}: expected an object { addr, port, tlsname }`)
    }
    const { addr, port, tlsname } = host
    if (typeof addr !== 'string' || addr === '') {
      throw new Error(`invalid host at index ${i}: addr must be a non-empty string`)
    }
    if (!Number.isInteger(port)) {
      throw new Error(`invalid host at index ${i}: port must be an integer`)
    }
    if (tlsname !== undefined && tlsname !== null && typeof tlsname !== 'string') {
      throw new Error(`invalid host at index ${i}: tlsname must be a string`)
    }
    const configured = configuredSeeds.some(seed => sameHost(seed, host))
    if (!configured) {
      if (port < 1 || port > 65535) {
        throw new Error(`invalid host at index ${i}: port ${port} is outside 1-65535`)
      }
      if (Buffer.byteLength(addr) > MAX_HOST_LENGTH) {
        throw new Error(`invalid host at index ${i}: addr is longer than ${MAX_HOST_LENGTH} bytes`)
      }
    }
    // '' and null mean no TLS name, the same as a missing one.
    return { addr, port, tlsname: tlsname || null }
  })
}

// The spec the native client registers for a JavaScript seed provider.
function providerSpec (provider, periodic) {
  return {
    name: providerName(provider),
    periodic,
    // ctx is a new read-only object for each call.
    refresh (ctx, done) {
      const context = Object.freeze({
        clusterName: ctx.clusterName,
        configuredSeeds: Object.freeze(ctx.configuredSeeds.map(seed => Object.freeze(seed))),
        tendIteration: ctx.tendIteration
      })
      let result
      try {
        result = provider.refreshSeedCandidates(context)
      } catch (err) {
        done(errorMessage(err))
        return
      }
      Promise.resolve(result).then(
        hosts => {
          let checked
          try {
            checked = checkHosts(hosts, ctx.configuredSeeds)
          } catch (err) {
            done(errorMessage(err))
            return
          }
          done(null, checked)
        },
        err => done(errorMessage(err))
      )
    },
    // Called once, on the JavaScript thread, after the last refresh has
    // returned. Errors are logged by the caller, never thrown.
    close () {
      if (typeof provider.close === 'function') {
        provider.close()
      }
    }
  }
}

const VISIBLE_ASCII = /^[\x21-\x7e]+$/

function checkCredentials (value) {
  if (value === null || typeof value !== 'object') {
    throw new Error('credentialsHook must return an object { accessKeyId, secretAccessKey, sessionToken, expiration }')
  }
  const { accessKeyId, secretAccessKey, sessionToken, expiration } = value
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
  if (expiration !== undefined && expiration !== null &&
      (!Number.isInteger(expiration) || expiration < 0)) {
    throw new Error('credentialsHook returned an invalid expiration: expected milliseconds since the epoch, or 0 for none')
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
      let result
      try {
        result = hook({ timeoutMs })
      } catch (err) {
        done(errorMessage(err))
        return
      }
      Promise.resolve(result).then(
        value => {
          let checked
          try {
            checked = checkCredentials(value)
          } catch (err) {
            done(errorMessage(err))
            return
          }
          done(null, checked)
        },
        err => done(errorMessage(err))
      )
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
    discovery.provider = providerSpec(discovery.provider, config.discovery[kPeriodic])
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
  checkHosts,
  checkCredentials,
  hasJsPlugins,
  forNative
}
