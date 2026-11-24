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

/* global describe, it, before */
/* eslint-disable no-unused-expressions */

// A seed provider and an AWS credentials hook written in JavaScript (step 6 of
// pluggable discovery). The C client calls them on its discovery thread; the
// client answers from the JavaScript thread, and connects on a worker thread
// so that thread stays free.

import type { Client as Cli, ConfigOptions } from '../../lib/aerospike.js'

import { expect } from 'chai'
import { spawnSync } from 'child_process'
import * as net from 'net'
import * as path from 'path'
import * as Aerospike from '../../lib/aerospike.js'
import * as helper from '../test_helper.ts'
import { connectError } from './helpers.ts'
import { startEc2Server } from './ec2_server.ts'

const Config = Aerospike.Config
const bridge = require('../../lib/discovery_bridge.js')

const log = { level: Aerospike.log.OFF }

async function waitUntil (check: () => boolean, ms: number): Promise<void> {
  const end = Date.now() + ms
  while (!check()) {
    if (Date.now() > end) throw new Error('condition not met in time')
    await new Promise(resolve => setTimeout(resolve, 20))
  }
}

function provider (refresh: (ctx: any) => any, periodic = false, extra: any = {}): any {
  return Object.assign({ refreshSeedCandidates: refresh, needsPeriodicRefresh: () => periodic }, extra)
}

const aws = { region: 'us-east-1', filters: [{ name: 'tag:a', values: ['b'] }] }

describe('JavaScript seed provider config #noserver', function () {
  it('accepts a provider and asks needsPeriodicRefresh() once', function () {
    let asked = 0
    const p = provider(() => [], true, { needsPeriodicRefresh: () => { asked++; return true } })
    const config = new Config({ discovery: { provider: p } })
    expect(config.discovery.provider).to.equal(p)
    // A Config made from a Config doesn't ask again.
    void new Config(config)
    expect(asked).to.equal(1)
  })

  const invalid: Array<[string, any, RegExp]> = [
    ['no refreshSeedCandidates', { needsPeriodicRefresh: () => true }, /refreshSeedCandidates must be a function/],
    ['no needsPeriodicRefresh', { refreshSeedCandidates: () => [] }, /needsPeriodicRefresh must be a function/],
    ['a close that is not a function', provider(() => [], false, { close: 1 }), /discovery.provider.close must be a function/],
    ['a supportsDeadline that is not a function', provider(() => [], false, { supportsDeadline: true }), /supportsDeadline must be a function/],
    ['needsPeriodicRefresh() not returning a boolean', provider(() => [], 'yes' as any), /must return a boolean/],
    ['needsPeriodicRefresh() throwing', provider(() => [], false, { needsPeriodicRefresh: () => { throw new Error('boom') } }), /needsPeriodicRefresh\(\) failed: boom/]
  ]
  for (const [name, p, message] of invalid) {
    it(`rejects ${name}`, function () {
      expect(() => new Config({ discovery: { provider: p } })).to.throw(Aerospike.AerospikeError, message)
    })
  }

  it('rejects tend mode', function () {
    expect(() => new Config({ discovery: { provider: provider(() => []), executionMode: 'tend' } }))
      .to.throw(/runs only in discovery.executionMode 'thread'/)
  })

  it('rejects dns or aws options with a JavaScript provider', function () {
    expect(() => new Config({ discovery: { provider: provider(() => []), dns: { names: ['a'] } } } as any)).to.throw(/discovery.dns is only valid/)
    expect(() => new Config({ discovery: { provider: provider(() => []), aws } } as any)).to.throw(/discovery.aws is only valid/)
  })

  it('checks the refresh interval only for a periodic provider', function () {
    expect(() => new Config({ tenderInterval: 1000, discovery: { provider: provider(() => [], true), refreshIntervalMs: 500 } }))
      .to.throw(/Discovery refresh interval 500 must be greater or equal to the tend interval 1000/)
    expect(() => new Config({ tenderInterval: 1000, discovery: { provider: provider(() => [], false), refreshIntervalMs: 500 } })).to.not.throw()
  })

  it('checks the credentials hook', function () {
    expect(() => new Config({ discovery: { provider: 'aws-tags', aws: Object.assign({ credentialsHook: 'x' }, aws) } } as any))
      .to.throw(/discovery.aws.credentialsHook must be a function/)
    expect(() => new Config({ discovery: { provider: 'aws-tags', aws: Object.assign({ credentialsHook: () => ({}), accessKeyId: 'AKID', secretAccessKey: 's' }, aws) } }))
      .to.throw(/credentialsHook and static keys .* cannot both be set/)
    expect(() => new Config({ discovery: { provider: 'aws-tags', aws: Object.assign({ credentialsHook: () => ({}) }, aws) } })).to.not.throw()
  })

  it('passes a config without a JavaScript provider or hook to the native client unchanged', function () {
    const config = new Config({ discovery: { provider: 'dns', dns: { names: ['a'] } } })
    expect(bridge.forNative(config)).to.equal(config)
    expect(bridge.hasJsPlugins(config)).to.be.false
  })

  it('keeps the message of a Promise whose constructor getter throws', async function () {
    const p = provider(() => {
      const result = Promise.resolve([])
      Object.defineProperty(result, 'constructor', { get () { throw new Error('hostile constructor') } })
      return result
    })
    const spec = bridge.forNative(new Config({ discovery: { provider: p } })).discovery.provider
    const answer = await new Promise<any>(resolve => spec.refresh({ clusterName: null, configuredSeeds: [], tendIteration: 0 }, (err: any, hosts: any) => resolve({ err, hosts })))
    expect(answer.err).to.equal('hostile constructor')
  })

  it('turns anything thrown into a message, never throwing itself', function () {
    expect(bridge.errorMessage(new Error('x'))).to.equal('x')
    expect(bridge.errorMessage(Object.create(null))).to.equal('unknown error')
    expect(bridge.errorMessage({ get message () { throw new Error('getter') }, toString () { throw new Error('toString') } })).to.equal('unknown error')
    expect(bridge.errorMessage('')).to.equal('unknown error')
    expect(bridge.errorMessage(42)).to.equal('42')
  })

  it('asks a provider set on a copy of a config again', function () {
    let asked = 0
    const p1 = provider(() => [], false)
    const p2 = provider(() => [], true, { needsPeriodicRefresh: () => { asked++; return true } })
    const c1 = new Config({ discovery: { provider: p1 } })
    void new Config({ ...c1, discovery: { ...c1.discovery, provider: p2 } } as any)
    expect(asked).to.equal(1)
  })

  it('names the provider after its class, or js, even when that throws', function () {
    const hostile = new Proxy({}, { get (target, key) { if (key === 'constructor') throw new Error('no'); return undefined } })
    expect(bridge.providerName(hostile)).to.equal('js')
  })

  it('names the provider after its class, or js', function () {
    class Consul { refreshSeedCandidates () { return [] } needsPeriodicRefresh () { return true } }
    expect(bridge.providerName(new Consul())).to.equal('Consul')
    expect(bridge.providerName(provider(() => []))).to.equal('js')
  })

  describe('checks each refresh result', function () {
    const seeds = [{ addr: 'seed.example', port: 0 }]
    const cases: Array<[string, any, RegExp]> = [
      ['a non-array', { addr: 'a', port: 3000 }, /must return an array of hosts, got object/],
      ['null', null, /got null/],
      ['a non-object entry', ['a:3000'], /invalid host at index 0: expected an object/],
      ['an empty addr', [{ addr: 'a', port: 3000 }, { addr: '', port: 3000 }], /invalid host at index 1: addr must be a non-empty string/],
      ['a port that is not an integer', [{ addr: 'a', port: '3000' }], /invalid host at index 0: port must be an integer/],
      ['a port outside 1-65535', [{ addr: 'a', port: 70000 }], /invalid host at index 0: port 70000 is outside 1-65535/],
      ['port 0', [{ addr: 'a', port: 0 }], /port 0 is outside 1-65535/],
      ['an addr over 255 bytes', [{ addr: 'a'.repeat(256), port: 3000 }], /longer than 255 bytes/],
      ['a tlsname that is not a string', [{ addr: 'a', port: 3000, tlsname: 1 }], /tlsname must be a string/]
    ]
    for (const [name, value, message] of cases) {
      it(`fails the refresh on ${name}`, function () {
        expect(() => bridge.checkHosts(value, seeds)).to.throw(message)
      })
    }

    it('accepts an empty list, maps an empty tlsname to none, and keeps the order', function () {
      expect(bridge.checkHosts([], seeds)).to.eql([])
      expect(bridge.checkHosts([{ addr: 'b', port: 2, tlsname: '' }, { addr: 'a', port: 1, tlsname: 't' }], seeds))
        .to.eql([{ addr: 'b', port: 2, tlsname: null }, { addr: 'a', port: 1, tlsname: 't' }])
    })

    it('checks every index of a sparse array, and rejects NUL and too many hosts', function () {
      // eslint-disable-next-line no-sparse-arrays
      expect(() => bridge.checkHosts([, { addr: 'a', port: 1 }], seeds)).to.throw(/invalid host at index 0: expected an object/)
      expect(() => bridge.checkHosts(new Array(3), seeds)).to.throw(/invalid host at index 0/)
      expect(() => bridge.checkHosts([{ addr: 'a\0b', port: 1 }], seeds)).to.throw(/addr must be a non-empty string/)
      expect(() => bridge.checkHosts([{ addr: 'a', port: 1, tlsname: 't\0' }], seeds)).to.throw(/tlsname must be a string/)
      expect(() => bridge.checkHosts(new Array(10001).fill({ addr: 'a', port: 1 }), seeds)).to.throw(/returned 10001 hosts, more than 10000/)
    })

    it('does not range check a configured seed returned unchanged', function () {
      expect(bridge.checkHosts([{ addr: 'seed.example', port: 0 }], seeds)).to.eql([{ addr: 'seed.example', port: 0, tlsname: null }])
    })
  })

  describe('checks each credentials hook result', function () {
    it('accepts credentials and maps missing fields', function () {
      expect(bridge.checkCredentials({ accessKeyId: 'AKID1', secretAccessKey: 's/k+1' }))
        .to.eql({ accessKeyId: 'AKID1', secretAccessKey: 's/k+1', sessionToken: null, expiration: 0 })
    })

    it('accepts a Date expiration, as the AWS SDK returns, and rejects seconds or huge values', function () {
      const at = new Date(Date.now() + 3600000)
      expect(bridge.checkCredentials({ accessKeyId: 'AK', secretAccessKey: 's', expiration: at }).expiration).to.equal(at.getTime())
      expect(() => bridge.checkCredentials({ accessKeyId: 'AK', secretAccessKey: 's', expiration: Math.floor(Date.now() / 1000) })).to.throw(/invalid expiration/)
      expect(() => bridge.checkCredentials({ accessKeyId: 'AK', secretAccessKey: 's', expiration: 1e300 })).to.throw(/invalid expiration/)
      expect(bridge.checkCredentials({ accessKeyId: 'AK', secretAccessKey: 's', expiration: 0 }).expiration).to.equal(0)
    })

    it('rejects bad values without putting them in the message', function () {
      expect(() => bridge.checkCredentials(null)).to.throw(/must return an object/)
      expect(() => bridge.checkCredentials({ accessKeyId: 'A-K', secretAccessKey: 's' })).to.throw(/invalid accessKeyId/)
      expect(() => bridge.checkCredentials({ accessKeyId: 'AK', secretAccessKey: 'has space' })).to.throw(/invalid secretAccessKey$/)
      expect(() => bridge.checkCredentials({ accessKeyId: 'AK', secretAccessKey: 's', expiration: -1 })).to.throw(/invalid expiration/)
      expect(() => bridge.checkCredentials({ accessKeyId: 'AK', secretAccessKey: 's', sessionToken: 'has space' })).to.throw(/invalid sessionToken$/)
      expect(() => bridge.checkCredentials({ accessKeyId: 'AK', secretAccessKey: 's', sessionToken: 42 })).to.throw(/invalid sessionToken$/)
    })
  })

  it('closes the provider of a client that never connected, once', function () {
    let closed = 0
    const client = new Aerospike.Client({ hosts: [], log, discovery: { provider: provider(() => [], false, { close: () => { closed++ } }) } })
    // close() of a client that never connected throws when no client of the
    // process registered the event loop (existing behavior); the provider is
    // released first.
    const close = () => {
      try {
        client.close()
      } catch (err: any) {
        if (!/Event loop is not initialized/.test(err.message)) throw err
      }
    }
    close()
    close()
    return new Promise(resolve => setTimeout(resolve, 100)).then(() => expect(closed).to.equal(1))
  })

  it('closes the provider once, without a crash, when the native client rejects its registration', async function () {
    // The JavaScript checks would reject tend mode first; the native client is
    // given the bridge spec directly to reach its own failure path.
    const native = require('../../lib/native.js')
    let closed = 0
    const p = provider(() => [], false, { close: () => { closed++ } })
    const config: any = bridge.forNative(new Config({ discovery: { provider: p } }))
    config.discovery = Object.assign({}, config.discovery, { executionMode: 'tend' })
    // The native constructor fails, which native.client() reports as null.
    expect(native.client(config)).to.be.null
    await new Promise(resolve => setTimeout(resolve, 100))
    expect(closed).to.equal(1)
  })

  it('frees the provider of a closed client', function () {
    // Garbage collection can only take the provider once the native bridge
    // that holds it is freed.
    const script = `
      const Aerospike = require(${JSON.stringify(path.resolve(__dirname, '../../lib/aerospike.js'))})
      let ref
      ;(() => {
        const provider = { refreshSeedCandidates: () => [], needsPeriodicRefresh: () => false }
        ref = new WeakRef(provider)
        const client = new Aerospike.Client({ hosts: [], discovery: { provider } })
        try { client.close() } catch (err) {}
      })()
      setTimeout(() => {
        for (let i = 0; i < 5; i++) global.gc()
        setTimeout(() => {
          global.gc()
          console.log(ref.deref() === undefined ? 'freed' : 'alive')
        }, 100)
      }, 100)
    `
    const result = spawnSync(process.execPath, ['--expose-gc', '-e', script], { timeout: 20000, encoding: 'utf8' })
    expect(result.status, result.stderr).to.equal(0)
    expect(result.stdout.trim()).to.equal('freed')
  })

  it('closes a client that never connected without throwing, in a fresh process', function () {
    const script = `
      const Aerospike = require(${JSON.stringify(path.resolve(__dirname, '../../lib/aerospike.js'))})
      let closed = 0
      const client = new Aerospike.Client({ hosts: [], discovery: { provider: { refreshSeedCandidates: () => [], needsPeriodicRefresh: () => false, close: () => { closed++ } } } })
      client.close()
      new Aerospike.Client({ hosts: '127.0.0.1:3000' }).close()
      setTimeout(() => console.log('closed ' + closed), 100)
    `
    const result = spawnSync(process.execPath, ['-e', script], { timeout: 20000, encoding: 'utf8' })
    expect(result.status, result.stderr).to.equal(0)
    expect(result.stdout.trim()).to.equal('closed 1')
  })

  it('lets the process exit with a client left open', function () {
    // The bridge's handle is unref'd, so an open client doesn't keep the
    // process alive, and exit with one doesn't crash.
    const script = `
      const Aerospike = require(${JSON.stringify(path.resolve(__dirname, '../../lib/aerospike.js'))})
      new Aerospike.Client({ hosts: [], discovery: { provider: { refreshSeedCandidates: () => [], needsPeriodicRefresh: () => true } } })
      console.log('done')
    `
    const result = spawnSync(process.execPath, ['-e', script], { timeout: 10000, encoding: 'utf8' })
    expect(result.status, result.stderr).to.equal(0)
    expect(result.stdout).to.contain('done')
  })
})

describe('JavaScript seed provider', function () {
  this.timeout(30000)

  const hosts: any = helper.config.hosts
  const seed: any = Array.isArray(hosts) ? hosts[0] : null

  before(function () {
    if (!seed || !net.isIP(seed.addr)) this.skip()
  })

  function seedHost (): any {
    return { addr: seed.addr, port: seed.port }
  }

  function config (p: any, discovery: any = {}, extra: any = {}): ConfigOptions {
    return Object.assign({}, helper.config, { hosts: [], log }, extra, {
      discovery: Object.assign({ provider: p, refreshTimeoutMs: 3000 }, discovery)
    })
  }

  it('connects through an async provider alone, without blocking the event loop', async function () {
    let ctx: any
    const p = provider(async (c: any) => {
      ctx = c
      await new Promise(resolve => setTimeout(resolve, 50))
      return [seedHost()]
    })
    let ticks = 0
    const timer = setInterval(() => ticks++, 5)
    const start = Date.now()
    const client: Cli = await Aerospike.connect(config(p))
    const elapsed = Date.now() - start
    clearInterval(timer)
    try {
      // The provider answered the first refresh: no wait for refreshTimeoutMs.
      expect(elapsed).to.be.below(2500)
      expect(ticks).to.be.at.least(3)
      expect(ctx.tendIteration).to.equal(0)
      expect(ctx.configuredSeeds).to.eql([])
      expect(Object.isFrozen(ctx)).to.be.true
      const key = new Aerospike.Key(helper.namespace, helper.set, 'js-provider/async')
      await client.put(key, { i: 1 })
      expect((await client.get(key)).bins.i).to.equal(1)
      await client.remove(key)
    } finally {
      client.close()
    }
  })

  it('frees the native bridge of a client that connected and closed', function () {
    // A connected client object itself is never collected (an existing leak
    // of the cluster-events callback, CLIENT-5899), and its config keeps the
    // provider. The spec built for the bridge is held only by the bridge, so
    // it shows whether the bridge was freed.
    const script = `
      const Aerospike = require(${JSON.stringify(path.resolve(__dirname, '../../lib/aerospike.js'))})
      const bridge = require(${JSON.stringify(path.resolve(__dirname, '../../lib/discovery_bridge.js'))})
      const seed = ${JSON.stringify(seedHost())}
      let ref
      const forNative = bridge.forNative
      bridge.forNative = config => {
        const result = forNative(config)
        if (result !== config) ref = new WeakRef(result.discovery.provider)
        return result
      }
      ;(async () => {
        await (async () => {
          const provider = { refreshSeedCandidates: async () => [seed], needsPeriodicRefresh: () => true }
          const client = await Aerospike.connect({ hosts: [], log: { level: Aerospike.log.OFF }, discovery: { provider, refreshIntervalMs: 1000 } })
          client.close()
        })()
        await new Promise(resolve => setTimeout(resolve, 500))
        for (let i = 0; i < 5; i++) global.gc()
        await new Promise(resolve => setTimeout(resolve, 100))
        global.gc()
        console.log(ref.deref() === undefined ? 'freed' : 'alive')
        Aerospike.releaseEventLoop()
      })()
    `
    const result = spawnSync(process.execPath, ['--expose-gc', '-e', script], { timeout: 20000, encoding: 'utf8' })
    expect(result.status, result.stderr).to.equal(0)
    expect(result.stdout.trim()).to.equal('freed')
  })

  it('wakes a refresh still waiting when connect fails, and connects on the retry once the call settles', async function () {
    // No hosts and a provider that doesn't answer in time: connect gives up
    // after refreshTimeoutMs with the refresh still waiting on the bridge.
    let settle: (hosts: any) => void = () => {}
    let calls = 0
    const p = provider(() => {
      calls++
      return calls === 1 ? new Promise(resolve => { settle = resolve }) : [seedHost()]
    })
    const client = new Aerospike.Client(config(p, { refreshTimeoutMs: 400 }))
    const first = await client.connect().catch((err: any) => err)
    expect(first.code).to.equal(Aerospike.status.ERR_SEED_DISCOVERY_FAILED)
    // The first call hasn't settled: the provider is not called again.
    const second = await client.connect().catch((err: any) => err)
    expect(second.message).to.match(/previous call is still running/)
    expect(calls).to.equal(1)
    settle([seedHost()])
    await new Promise(resolve => setTimeout(resolve, 50))
    await client.connect()
    expect(calls).to.equal(2)
    expect(client.getNodes().length).to.be.at.least(1)
    client.close()
  })

  it('passes the cluster name and configured TLS names in ctx', async function () {
    let ctx: any
    const p = provider((c: any) => { ctx = c; return [seedHost()] })
    const client = new Aerospike.Client(config(p, {}, { hosts: [Object.assign(seedHost(), { tlsname: 'tls-a' })], clusterName: 'not-checked-here' }))
    try {
      await client.connect()
    } catch (err) {
      // A cluster name the server doesn't have can fail connect; ctx is what matters.
    }
    try { client.close() } catch (err) {}
    expect(ctx.clusterName).to.equal('not-checked-here')
    expect(ctx.configuredSeeds).to.eql([Object.assign(seedHost(), { tlsname: 'tls-a' })])
  })

  it('connects through a provider that returns an array directly', async function () {
    const client: Cli = await Aerospike.connect(config(provider(() => [seedHost()])))
    client.close()
  })

  it('passes the configured seeds and cluster name to the provider', async function () {
    let ctx: any
    const p = provider((c: any) => { ctx = c; return [] })
    const client: Cli = await Aerospike.connect(config(p, {}, { hosts: [seedHost()] }))
    client.close()
    expect(ctx.configuredSeeds).to.eql([seedHost()])
    expect(ctx.clusterName === null || typeof ctx.clusterName === 'string').to.be.true
  })

  it('calls a provider that does not refresh periodically once', async function () {
    let calls = 0
    const client: Cli = await Aerospike.connect(config(provider(() => { calls++; return [seedHost()] }, false), { refreshIntervalMs: 300 }, { tenderInterval: 250 }))
    await new Promise(resolve => setTimeout(resolve, 1200))
    client.close()
    expect(calls).to.equal(1)
  })

  it('calls a periodic provider again, with a growing tend iteration', async function () {
    const iterations: number[] = []
    const p = provider((c: any) => { iterations.push(c.tendIteration); return [seedHost()] }, true)
    const client: Cli = await Aerospike.connect(config(p, { refreshIntervalMs: 300 }, { tenderInterval: 250 }))
    await new Promise(resolve => setTimeout(resolve, 1500))
    client.close()
    expect(iterations.length).to.be.at.least(3)
    expect(iterations[0]).to.equal(0)
    expect(iterations[iterations.length - 1]).to.be.above(0)
  })

  const failures: Array<[string, () => any, RegExp]> = [
    ['throws', () => { throw new Error('registry down') }, /registry down/],
    ['rejects', async () => { throw new Error('registry timeout') }, /registry timeout/],
    ['returns an invalid host', () => [{ addr: 'a', port: 70000 }], /invalid host at index 0: port 70000/]
  ]
  for (const [name, refresh, message] of failures) {
    it(`falls back to the configured hosts when the provider ${name}`, async function () {
      const client: Cli = await Aerospike.connect(config(provider(refresh), {}, { hosts: [seedHost()] }))
      client.close()
    })

    it(`fails with ERR_SEED_DISCOVERY_FAILED, naming the provider, when it ${name} and there are no hosts`, async function () {
      class Registry { refreshSeedCandidates (): any { return refresh() } needsPeriodicRefresh (): boolean { return false } }
      const error = await connectError(config(new Registry()))
      expect(error.code).to.equal(Aerospike.status.ERR_SEED_DISCOVERY_FAILED)
      expect(error.message).to.match(/Seed provider Registry failed/)
      expect(error.message).to.match(message)
    })
  }

  it('falls back to the hosts after refreshTimeoutMs when the provider never answers, and closes at once', async function () {
    let closed = 0
    const p = provider(() => new Promise(() => {}), false, { close: () => { closed++ } })
    const start = Date.now()
    const client: Cli = await Aerospike.connect(config(p, { refreshTimeoutMs: 500 }, { hosts: [seedHost()] }))
    expect(Date.now() - start).to.be.within(400, 5000)
    const closeStart = Date.now()
    client.close()
    expect(Date.now() - closeStart).to.be.below(200)
    // The refresh never settles, so the provider is never closed.
    await new Promise(resolve => setTimeout(resolve, 300))
    expect(closed).to.equal(0)
  })

  it('fails connect when close() is called while it runs, and closes the provider once', async function () {
    let closed = 0
    const p = provider(async () => {
      await new Promise(resolve => setTimeout(resolve, 300))
      return [seedHost()]
    }, false, { close: () => { closed++ } })
    const client = new Aerospike.Client(config(p))
    const connecting = client.connect()
    client.close()
    let error: any = null
    try {
      await connecting
    } catch (err) {
      error = err
    }
    expect(error).to.not.be.null
    expect(error.code).to.equal(Aerospike.status.ERR_CLIENT)
    expect(error.message).to.match(/Client closed while connecting|closing/)
    await new Promise(resolve => setTimeout(resolve, 500))
    expect(closed).to.equal(1)
  })

  it('answers other calls safely while a connect runs on its own thread, and normally after', async function () {
    const p = provider(async () => {
      await new Promise(resolve => setTimeout(resolve, 300))
      return [seedHost()]
    })
    const client = new Aerospike.Client(config(p))
    const connecting = client.connect()
    const errors = new Set<string>()
    let rounds = 0
    const poke = setInterval(() => {
      rounds++
      expect(client.getNodes()).to.eql([])
      expect(client.isConnected()).to.be.false
      for (const call of [() => client.stats(), () => client.addSeedHost(seed.addr, seed.port), () => client.removeSeedHost(seed.addr, seed.port)]) {
        try {
          call()
        } catch (err: any) {
          errors.add(err.message.replace(/^\w+: /, ''))
        }
      }
      client.get(new Aerospike.Key(helper.namespace, helper.set, 'js-provider/during')).catch((err: any) => errors.add(err.message))
    }, 5)
    await connecting
    clearInterval(poke)
    expect(rounds).to.be.at.least(10)
    expect([...errors].every(message => /not connected/i.test(message)), [...errors].join('; ')).to.be.true
    try {
      expect(client.getNodes().length).to.be.at.least(1)
      expect(client.isConnected()).to.be.true
      expect(client.stats().nodes.length).to.be.at.least(1)
      client.addSeedHost(seed.addr, seed.port)
      client.removeSeedHost(seed.addr, seed.port)
      const key = new Aerospike.Key(helper.namespace, helper.set, 'js-provider/after')
      await client.put(key, { i: 1 })
      expect((await client.get(key)).bins.i).to.equal(1)
      await client.remove(key)
    } finally {
      client.close()
    }
  })

  const hostile: Array<[string, () => any, RegExp]> = [
    // eslint-disable-next-line no-sparse-arrays
    ['a sparse array', () => [, { addr: '127.0.0.1', port: 3000 }], /invalid host at index 0/],
    ['a non-Error throw', async () => { throw Object.create(null) }, /unknown error/],
    ['an empty throw', () => { throw '' }, /unknown error/] // eslint-disable-line no-throw-literal
  ]
  for (const [name, refresh, message] of hostile) {
    it(`fails the refresh cleanly, never crashing, on ${name}`, async function () {
      const error = await connectError(config(provider(refresh)))
      expect(error.code).to.equal(Aerospike.status.ERR_SEED_DISCOVERY_FAILED)
      expect(error.message).to.match(message)
    })
  }

  it('survives a Promise whose own then() answers and then throws (the built-in then() is used)', async function () {
    const p = provider(() => {
      const result: any = Promise.resolve([seedHost()])
      result.then = (ok: any) => { ok([seedHost()]); throw new Error('boom') }
      return result
    })
    const client: Cli = await Aerospike.connect(config(p))
    expect(client.getNodes().length).to.be.at.least(1)
    client.close()
  })

  it('reads a Promise through the built-in then(), so an overriding then() cannot swallow the answer', async function () {
    const p = provider(() => {
      const result: any = Promise.resolve([seedHost()])
      result.then = () => {} // keeps nothing, calls nothing
      return result
    })
    const client: Cli = await Aerospike.connect(config(p))
    expect(client.getNodes().length).to.be.at.least(1)
    client.close()
  })

  it('keeps the process alive for a client that connects while the last other client closes', function () {
    // B closes (and unrefs the event loop) while A's connect still runs; once
    // A is connected, the idle process must stay alive. Passing = killed by
    // the timeout. (A's cluster events handle also keeps it alive, so this
    // guards the behaviour, not only the re-reference after connect.)
    const script = `
      const Aerospike = require(${JSON.stringify(path.resolve(__dirname, '../../lib/aerospike.js'))})
      const seed = ${JSON.stringify(seedHost())}
      Aerospike.connect({ hosts: [seed], log: { level: Aerospike.log.OFF } }).then(b => {
        const provider = { refreshSeedCandidates: () => new Promise(r => setTimeout(() => r([seed]), 300)), needsPeriodicRefresh: () => false }
        Aerospike.connect({ hosts: [], log: { level: Aerospike.log.OFF }, discovery: { provider } }).then(() => console.log('A connected'))
        b.close()
      })
    `
    const result = spawnSync(process.execPath, ['-e', script], { timeout: 3000, encoding: 'utf8' })
    expect(result.stdout).to.contain('A connected')
    expect(result.signal, 'the process exited although client A is connected').to.equal('SIGTERM')
  })

  it('logs a provider close() that rejects, with no unhandled rejection', async function () {
    let unhandled = 0
    const onUnhandled = () => { unhandled++ }
    process.on('unhandledRejection', onUnhandled)
    try {
      const p = provider(() => [seedHost()], false, { close: async () => { throw new Error('disconnect failed') } })
      const client: Cli = await Aerospike.connect(config(p))
      client.close()
      await new Promise(resolve => setTimeout(resolve, 300))
      expect(unhandled).to.equal(0)
    } finally {
      process.removeListener('unhandledRejection', onUnhandled)
    }
  })

  it('never calls the provider again while a call past its wait limit is pending, and resumes after it settles', async function () {
    let calls = 0
    let inFlight = 0
    let maxInFlight = 0
    const p = provider(async () => {
      calls++
      inFlight++
      maxInFlight = Math.max(maxInFlight, inFlight)
      try {
        if (calls === 2) await new Promise(resolve => setTimeout(resolve, 1500))
        return [seedHost()]
      } finally {
        inFlight--
      }
    }, true)
    const client: Cli = await Aerospike.connect(config(p, { refreshIntervalMs: 300, refreshTimeoutMs: 300 }, { tenderInterval: 250 }))
    try {
      await waitUntil(() => calls >= 2, 5000)
      await new Promise(resolve => setTimeout(resolve, 1000))
      // The slow call is still pending: no other call started.
      expect(calls).to.equal(2)
      await waitUntil(() => calls >= 4, 5000)
      expect(maxInFlight).to.equal(1)
    } finally {
      client.close()
    }
  })

  it('throws "not connected" from addSeedHost and removeSeedHost after close', async function () {
    const client: Cli = await Aerospike.connect(config(provider(() => [seedHost()])))
    client.close()
    expect(() => client.addSeedHost(seed.addr, seed.port)).to.throw(/not connected/)
    expect(() => client.removeSeedHost(seed.addr, seed.port)).to.throw(/not connected/)
  })

  it('runs the provider close() when the script ends right after client.close()', function () {
    for (const connect of [true, false]) {
      const script = `
        const Aerospike = require(${JSON.stringify(path.resolve(__dirname, '../../lib/aerospike.js'))})
        const seed = ${JSON.stringify(seedHost())}
        const provider = { refreshSeedCandidates: () => [seed], needsPeriodicRefresh: () => true, close: () => console.log('provider closed') }
        const options = { hosts: [], log: { level: Aerospike.log.OFF }, discovery: { provider } }
        if (${connect}) {
          Aerospike.connect(options).then(client => client.close())
        } else {
          const client = new Aerospike.Client(options)
          try { client.close() } catch (err) {}
        }
      `
      const result = spawnSync(process.execPath, ['-e', script], { timeout: 20000, encoding: 'utf8' })
      expect(result.status, result.stderr).to.equal(0)
      expect(result.stdout, `connect=${connect}`).to.contain('provider closed')
      expect(result.stderr).to.not.contain('illegal access')
    }
  })

  it('releases the event loop only after a connect still running, from close(true) or Aerospike.releaseEventLoop()', function () {
    for (const how of ['close', 'module']) {
      const script = `
        const Aerospike = require(${JSON.stringify(path.resolve(__dirname, '../../lib/aerospike.js'))})
        const native = require(${JSON.stringify(path.resolve(__dirname, '../../lib/native.js'))})
        const seed = ${JSON.stringify(seedHost())}
        let settled = false
        const release = native.release_as_event_loop
        native.release_as_event_loop = (...args) => { console.log('released, connect settled: ' + settled); return release.apply(native, args) }
        const provider = { refreshSeedCandidates: () => new Promise(r => setTimeout(() => r([seed]), 300)), needsPeriodicRefresh: () => false }
        const client = new Aerospike.Client({ hosts: [], log: { level: Aerospike.log.OFF }, discovery: { provider } })
        client.connect().then(() => { settled = true; client.close() }, err => { settled = true; console.log('connect: ' + err.message) })
        if (${JSON.stringify(how)} === 'close') client.close(true)
        else Aerospike.releaseEventLoop()
      `
      const result = spawnSync(process.execPath, ['-e', script], { timeout: 20000, encoding: 'utf8' })
      expect(result.signal, result.stderr).to.be.null
      expect(result.status, result.stderr).to.equal(0)
      expect(result.stdout, how).to.contain('released, connect settled: true')
      expect(result.stdout, how).to.not.contain('released, connect settled: false')
    }
  })

  it('publishes the late first answer of a provider that is not periodic, as the C client does', function () {
    const script = `
      const fs = require('fs')
      const Aerospike = require(${JSON.stringify(path.resolve(__dirname, '../../lib/aerospike.js'))})
      const seed = ${JSON.stringify(seedHost())}
      const logFile = require('os').tmpdir() + '/js-provider-late-' + process.pid + '.log'
      Aerospike.setDefaultLogging({ level: Aerospike.log.WARN, file: fs.openSync(logFile, 'w') })
      const provider = { refreshSeedCandidates: () => new Promise(r => setTimeout(() => r([seed]), 900)), needsPeriodicRefresh: () => false }
      Aerospike.connect({ hosts: [seed], log: { level: Aerospike.log.WARN }, discovery: { provider, refreshTimeoutMs: 400 } }).then(async client => {
        await new Promise(r => setTimeout(r, 1200))
        client.close()
        Aerospike.releaseEventLoop()
        const text = fs.readFileSync(logFile, 'utf8')
        fs.unlinkSync(logFile)
        // The C client logs the overrun when the call returns to it late.
        console.log(/exceeding refresh_timeout_ms/.test(text) ? 'late answer returned to C' : 'no late answer')
        console.log(/did not answer within/.test(text) ? 'bridge gave up' : 'bridge waited')
      })
    `
    const result = spawnSync(process.execPath, ['-e', script], { timeout: 20000, encoding: 'utf8' })
    expect(result.status, result.stderr).to.equal(0)
    expect(result.stdout).to.contain('late answer returned to C')
    expect(result.stdout).to.contain('bridge waited')
  })

  it('releases a call that can never settle once it is collected, so refreshes and close() go on', function () {
    const script = `
      const Aerospike = require(${JSON.stringify(path.resolve(__dirname, '../../lib/aerospike.js'))})
      const seed = ${JSON.stringify(seedHost())}
      let calls = 0
      let closed = 0
      const provider = {
        refreshSeedCandidates: () => ++calls === 2 ? new Promise(() => {}) : [seed],
        needsPeriodicRefresh: () => true,
        close: () => { closed++ }
      }
      Aerospike.connect({ hosts: [], log: { level: Aerospike.log.OFF }, tenderInterval: 250,
        discovery: { provider, refreshIntervalMs: 300, refreshTimeoutMs: 300 } }).then(async client => {
        while (calls < 2) await new Promise(r => setTimeout(r, 20))
        await new Promise(r => setTimeout(r, 500))
        for (let i = 0; i < 5; i++) global.gc()
        await new Promise(r => setTimeout(r, 1500))
        const after = calls
        client.close()
        await new Promise(r => setTimeout(r, 300))
        console.log('calls ' + after + ' closed ' + closed)
        Aerospike.releaseEventLoop()
      })
    `
    const result = spawnSync(process.execPath, ['--expose-gc', '-e', script], { timeout: 20000, encoding: 'utf8' })
    expect(result.status, result.stderr).to.equal(0)
    const [, calls, closed] = /calls (\d+) closed (\d+)/.exec(result.stdout) as any
    expect(Number(calls)).to.be.at.least(3)
    expect(Number(closed)).to.equal(1)
  })

  it('frees the discovery thread when a call it waits on can never settle and is collected', function () {
    // Not periodic: no wait limit, so C's discovery thread waits on the call;
    // once its Promise can't settle and is collected, the call fails and the
    // provider is closed on close().
    const script = `
      const Aerospike = require(${JSON.stringify(path.resolve(__dirname, '../../lib/aerospike.js'))})
      const seed = ${JSON.stringify(seedHost())}
      let closed = 0
      const provider = { refreshSeedCandidates: () => new Promise(() => {}), needsPeriodicRefresh: () => false, close: () => { closed++ } }
      Aerospike.connect({ hosts: [seed], log: { level: Aerospike.log.OFF }, discovery: { provider, refreshTimeoutMs: 300 } }).then(async client => {
        for (let i = 0; i < 5; i++) { global.gc(); await new Promise(r => setTimeout(r, 100)) }
        client.close()
        await new Promise(r => setTimeout(r, 300))
        console.log('closed ' + closed)
        Aerospike.releaseEventLoop()
      })
    `
    const result = spawnSync(process.execPath, ['--expose-gc', '-e', script], { timeout: 20000, encoding: 'utf8' })
    expect(result.status, result.stderr).to.equal(0)
    expect(result.stdout.trim()).to.equal('closed 1')
  })

  it('rejects a JavaScript provider or hook in a client created in a worker thread', function () {
    const script = `
      const { Worker } = require('worker_threads')
      const lib = ${JSON.stringify(path.resolve(__dirname, '../../lib/aerospike.js'))}
      const worker = new Worker(\`
        const Aerospike = require(\${JSON.stringify(lib)})
        const { parentPort } = require('worker_threads')
        try {
          new Aerospike.Config({ discovery: { provider: { refreshSeedCandidates: () => [], needsPeriodicRefresh: () => false } } })
          parentPort.postMessage('accepted')
        } catch (err) {
          parentPort.postMessage(err.message)
        }
      \`, { eval: true })
      worker.once('message', message => { console.log(message); worker.terminate() })
    `
    const result = spawnSync(process.execPath, ['-e', script], { timeout: 20000, encoding: 'utf8' })
    expect(result.status, result.stderr).to.equal(0)
    expect(result.stdout).to.contain('supported only in a client created on the main thread')
  })

  it('rejects a second connect while one runs', async function () {
    const p = provider(async () => {
      await new Promise(resolve => setTimeout(resolve, 200))
      return [seedHost()]
    })
    const client = new Aerospike.Client(config(p))
    const first = client.connect()
    let error: any = null
    try {
      await client.connect()
    } catch (err) {
      error = err
    }
    await first
    client.close()
    expect(error.message).to.match(/Connect is already running/)
  })

  it('lets the same client connect again after a failed connect, and closes the provider once', async function () {
    let reachable = false
    let closed = 0
    const p = provider(() => [reachable ? seedHost() : { addr: '127.0.0.1', port: 1 }], false, { close: () => { closed++ } })
    const client = new Aerospike.Client(config(p))
    let error: any = null
    try {
      await client.connect()
    } catch (err) {
      error = err
    }
    expect(error).to.not.be.null
    reachable = true
    await client.connect()
    expect(client.getNodes().length).to.be.at.least(1)
    client.close()
    await new Promise(resolve => setTimeout(resolve, 300))
    expect(closed).to.equal(1)
  })

  it('closes a provider shared by two clients once per client', async function () {
    let closed = 0
    const p = provider(() => [seedHost()], false, { close: () => { closed++ } })
    const a: Cli = await Aerospike.connect(config(p))
    const b: Cli = await Aerospike.connect(config(p))
    a.close()
    b.close()
    await new Promise(resolve => setTimeout(resolve, 500))
    expect(closed).to.equal(2)
  })

  it('closes the provider only after a refresh still running settles', async function () {
    const events: string[] = []
    let calls = 0
    const p = provider(async () => {
      calls++
      if (calls > 1) {
        events.push('refresh started')
        await new Promise(resolve => setTimeout(resolve, 600))
        events.push('refresh settled')
      }
      return [seedHost()]
    }, true, { close: () => { events.push('close') } })
    const client: Cli = await Aerospike.connect(config(p, { refreshIntervalMs: 300 }, { tenderInterval: 250 }))
    await waitUntil(() => events.includes('refresh started'), 5000)
    const start = Date.now()
    client.close()
    expect(Date.now() - start).to.be.below(200)
    await waitUntil(() => events.includes('close'), 5000)
    expect(events.slice(events.indexOf('refresh started'))).to.eql(['refresh started', 'refresh settled', 'close'])
  })

  it('logs a provider close() that throws, and keeps going', async function () {
    const p = provider(() => [seedHost()], false, { close: () => { throw new Error('close failed') } })
    const client: Cli = await Aerospike.connect(config(p))
    client.close()
    await new Promise(resolve => setTimeout(resolve, 300))
  })
})

describe('JavaScript AWS credentials hook', function () {
  this.timeout(30000)

  const hosts: any = helper.config.hosts
  const seed: any = Array.isArray(hosts) ? hosts[0] : null

  before(function () {
    if (!seed || !net.isIP(seed.addr)) this.skip()
  })

  function awsConfig (endpoint: string, credentialsHook: any): ConfigOptions {
    return Object.assign({}, helper.config, {
      hosts: [],
      log,
      discovery: {
        provider: 'aws-tags',
        aws: { region: 'us-east-1', filters: [{ name: 'tag:cluster', values: ['test'] }], endpoint, port: seed.port, credentialsHook }
      }
    })
  }

  it('signs EC2 requests with the credentials the hook returns, and passes the time left', async function () {
    const ec2 = await startEc2Server([seed.addr])
    const calls: any[] = []
    try {
      const hook = async (arg: any) => {
        calls.push(arg)
        return { accessKeyId: 'AKIDHOOK', secretAccessKey: 'hook/secret+key', sessionToken: 'token' }
      }
      const client: Cli = await Aerospike.connect(awsConfig(ec2.endpoint, hook))
      client.close()
      expect(calls.length).to.be.at.least(1)
      expect(calls[0].timeoutMs).to.be.a('number').and.above(0)
      const authorizations = await ec2.authorizations()
      expect(authorizations[0]).to.contain('Credential=AKIDHOOK/')
    } finally {
      await ec2.stop()
    }
  })

  it('fails the refresh when the hook does not answer within timeoutMs', async function () {
    const ec2 = await startEc2Server([seed.addr])
    try {
      const config: any = awsConfig(ec2.endpoint, () => new Promise(() => {}))
      config.discovery.aws.timeoutMs = 300
      const start = Date.now()
      const error = await connectError(config)
      expect(Date.now() - start).to.be.below(5000)
      expect(error.code).to.equal(Aerospike.status.ERR_SEED_DISCOVERY_FAILED)
      expect(error.message).to.match(/credentials hook timed out after \d+ ?ms|did not answer within \d+ ms/)
    } finally {
      await ec2.stop()
    }
  })

  it('closes at once while the hook is still waiting', async function () {
    const ec2 = await startEc2Server([seed.addr])
    try {
      let calls = 0
      const hook = () => {
        calls++
        return calls === 1 ? { accessKeyId: 'AKIDHOOK', secretAccessKey: 'secret', expiration: Date.now() + 1000 } : new Promise(() => {})
      }
      const config: any = Object.assign(awsConfig(ec2.endpoint, hook), { tenderInterval: 250 })
      config.discovery.refreshIntervalMs = 300
      config.discovery.aws.timeoutMs = 4000
      const client: Cli = await Aerospike.connect(config)
      // Credentials expire within the 5 minute margin, so the next refresh asks again and waits.
      await waitUntil(() => calls >= 2, 5000)
      const start = Date.now()
      client.close()
      expect(Date.now() - start).to.be.below(200)
    } finally {
      await ec2.stop()
    }
  })

  it('never calls the hook again while a call past its timeout is still running', async function () {
    const ec2 = await startEc2Server([seed.addr])
    let calls = 0
    let release: () => void = () => {}
    try {
      const hook = () => {
        calls++
        // Credentials expiring at once: every refresh asks the hook again.
        if (calls === 2) return new Promise<any>(resolve => { release = () => resolve({ accessKeyId: 'AKIDHOOK', secretAccessKey: 'secret' }) })
        return { accessKeyId: 'AKIDHOOK', secretAccessKey: 'secret', expiration: Date.now() + 1000 }
      }
      const config: any = Object.assign(awsConfig(ec2.endpoint, hook), { tenderInterval: 250 })
      config.discovery.refreshIntervalMs = 300
      config.discovery.aws.timeoutMs = 200
      const client: Cli = await Aerospike.connect(config)
      try {
        await waitUntil(() => calls >= 2, 5000)
        await new Promise(resolve => setTimeout(resolve, 1200))
        expect(calls).to.equal(2)
        release()
        await waitUntil(() => calls >= 3, 5000)
      } finally {
        client.close()
      }
    } finally {
      release()
      await ec2.stop()
    }
  })

  it('reuses credentials with an expiration instead of calling the hook on every refresh', async function () {
    const ec2 = await startEc2Server([seed.addr])
    let calls = 0
    try {
      const hook = () => {
        calls++
        return { accessKeyId: 'AKIDHOOK', secretAccessKey: 'secret', expiration: Date.now() + 3600000 }
      }
      const config: any = Object.assign(awsConfig(ec2.endpoint, hook), { tenderInterval: 250 })
      config.discovery.refreshIntervalMs = 300
      const client: Cli = await Aerospike.connect(config)
      await new Promise(resolve => setTimeout(resolve, 1500))
      client.close()
      expect((await ec2.requests()).length).to.be.at.least(3)
      expect(calls).to.equal(1)
    } finally {
      await ec2.stop()
    }
  })

  it('fails the refresh without leaking the secret when the hook fails', async function () {
    const ec2 = await startEc2Server([seed.addr])
    try {
      const error = await connectError(awsConfig(ec2.endpoint, async () => { throw new Error('sso expired') }))
      expect(error.code).to.equal(Aerospike.status.ERR_SEED_DISCOVERY_FAILED)
      expect(error.message).to.match(/credentials hook failed: .*sso expired/)

      const bad = await connectError(awsConfig(ec2.endpoint, () => ({ accessKeyId: 'AKID', secretAccessKey: 'top secret' })))
      expect(bad.code).to.equal(Aerospike.status.ERR_SEED_DISCOVERY_FAILED)
      expect(bad.message).to.match(/invalid secretAccessKey/)
      expect(bad.message).to.not.contain('top secret')
    } finally {
      await ec2.stop()
    }
  })
})
