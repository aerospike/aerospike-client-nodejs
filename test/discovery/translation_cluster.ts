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

/* global describe, it, before, after */
/* eslint-disable no-unused-expressions */

// Local test only, not for CI: needs a multi-node cluster started by hand.
// Address translation and DNS discovery against a multi-node cluster whose
// nodes advertise addresses the client can't reach, each node on its own port.
// Skipped unless IPMAP_CLUSTER_SEED is set, e.g. IPMAP_CLUSTER_SEED=127.0.0.1:4000
// (the same cluster as ip_map_cluster.ts). The TLS tests need IPMAP_CLUSTER_CA,
// the CA of a node certificate for the TLS name "ipmap-tls", served on each
// node's port + 10.

import type { Client as Cli, ConfigOptions } from '../../lib/aerospike.js'
import * as Aerospike from '../../lib/aerospike.js'

import { expect } from 'chai'
import * as fs from 'fs'
import * as net from 'net'
import * as os from 'os'
import * as path from 'path'
import { execFileSync } from 'child_process'
import { info, advertisedPeers, connectError, addresses, waitFor } from './helpers.ts'
import { startDnsServer, DnsServer } from './dns_server.ts'

const seedEnv = process.env.IPMAP_CLUSTER_SEED
const caFile = process.env.IPMAP_CLUSTER_CA
const script = process.env.IPMAP_CLUSTER_SCRIPT
const tlsName = 'ipmap-tls'
const log = { level: Aerospike.log.OFF }

interface ClusterNode { name: string, advertised: string, port: number }

describe('address translation against a multi-node cluster', function () {
  this.timeout(60000)

  if (!seedEnv) {
    it.skip('set IPMAP_CLUSTER_SEED to run')
    return
  }

  const [seedHost, seedPortText] = seedEnv.split(':')
  const seedPort = Number(seedPortText)
  const hosts = [{ addr: seedHost, port: seedPort }]
  let nodes: ClusterNode[] = []

  // Every node's name and advertised address, the seed's included.
  before(async function () {
    const peers = await advertisedPeers(seedHost, seedPort)
    const peerText = await info(seedHost, seedPort, 'peers-clear-std')
    const names = [...peerText.matchAll(/\[([0-9A-F]+),[^,]*,\[([^\]]*)\]\]/g)].map(m => m[1])
    nodes = peers.map((peer, i) => ({ name: names[i], advertised: `${peer.host}:${peer.port}`, port: peer.port }))
    const seedName = await info(seedHost, seedPort, 'node')
    const seedAdvertised = (await info(seedHost, seedPort, 'service-clear-std')).split(';')[0]
    nodes.push({ name: seedName, advertised: seedAdvertised, port: seedPort })
  })

  // The client node addresses every node should end up with.
  function reachable (list: ClusterNode[] = nodes): string[] {
    return list.map(node => `${seedHost}:${node.port}`).sort()
  }

  function portMapByAddress (list: ClusterNode[] = nodes): Record<string, string> {
    return Object.fromEntries(list.map(node => [node.advertised, `${seedHost}:${node.port}`]))
  }

  async function connectedAddresses (config: ConfigOptions, expected: number): Promise<string[]> {
    const client: Cli = await Aerospike.connect(Object.assign({ hosts, log, tenderInterval: 250 }, config))
    try {
      await waitFor(() => client.getNodes().length >= expected, 5000)
      // Let a few more tends run, so a node that shouldn't join has the chance to.
      await new Promise(resolve => setTimeout(resolve, 1000))
      return addresses(client)
    } finally {
      client.close()
    }
  }

  it('fails to connect without translation, because the peers are unreachable', async function () {
    const error = await connectError({ hosts, log })
    expect(error.message).to.match(/Peers not reachable/)
  })

  it('finds every node through port-map keyed by advertised host:port', async function () {
    const translation = { provider: 'port-map' as const, portMap: portMapByAddress() }
    const client: Cli = await Aerospike.connect({ hosts, log, tenderInterval: 250, translation })
    const keys = Array.from({ length: 200 }, (_, i) => new Aerospike.Key('test', 'demo', `translation-cluster/${i}`))
    try {
      expect(await waitFor(() => client.getNodes().length === nodes.length, 5000)).to.be.true
      expect(addresses(client)).to.eql(reachable())
      for (const key of keys) await client.put(key, { i: 1 })
      const records = await client.batchRead(keys.map(key => ({ key, readAllBins: true })))
      expect(records.filter(record => record.status === Aerospike.status.OK)).to.have.lengthOf(keys.length)
    } finally {
      await client.batchRemove(keys).catch(() => {})
      client.close()
    }
  })

  it('finds every node through port-map keyed by node name', async function () {
    const portMap = Object.fromEntries(nodes.map(node => [node.name, `${seedHost}:${node.port}`]))
    expect(await connectedAddresses({ translation: { provider: 'port-map', portMap } }, nodes.length)).to.eql(reachable())
  })

  it('takes port-map from the config file, over the translation set in code', async function () {
    // The C client reads static.client.translation from the file at
    // aerospike_init(); a key in the file wins over the same key set in code.
    // pass-through alone fails here (the peers are unreachable), so every node
    // joining shows the file's port-map was used.
    const lines = nodes.map(node => `        "${node.name}": "${seedHost}:${node.port}"`)
    const yaml = ['version: 1.2.0', 'static:', '  client:', '    translation:', '      provider: port-map',
      '      on_miss: strict', '      port_map:', ...lines, 'dynamic:', '  client:', '    tend_interval: 250', ''].join('\n')
    const file = path.join(os.tmpdir(), `translation-${process.pid}-${Date.now()}.yaml`)
    fs.writeFileSync(file, yaml)
    try {
      const found = await connectedAddresses({ configProvider: { path: file }, translation: { provider: 'pass-through' } }, nodes.length)
      expect(found).to.eql(reachable())
    } finally {
      fs.unlinkSync(file)
    }
  })

  it('uses the host:port entry over the node name entry when both match', async function () {
    // Every node name points at a dead port, so a node joins only through its host:port entry.
    const portMap = portMapByAddress()
    for (const node of nodes) portMap[node.name] = `${seedHost}:1`
    expect(await connectedAddresses({ translation: { provider: 'port-map', portMap } }, nodes.length)).to.eql(reachable())
  })

  it('connects to bracketed IPv6 port-map targets', async function () {
    const reachableOverIpv6 = await new Promise<boolean>(resolve => {
      const socket = net.connect(seedPort, '::1', () => { socket.destroy(); resolve(true) })
      socket.on('error', () => resolve(false))
    })
    if (!reachableOverIpv6) return this.skip()
    const others = nodes.filter(node => node.port !== seedPort)
    const portMap = Object.fromEntries(others.map(node => [node.advertised, `[::1]:${node.port}`]))
    const found = await connectedAddresses({ translation: { provider: 'port-map', portMap } }, nodes.length)
    expect(found).to.eql([`${seedHost}:${seedPort}`, ...others.map(node => `[::1]:${node.port}`)].sort())
  })

  // Connects with C client warnings written to a file, and returns the node
  // addresses and the log text once the tends have run for a while.
  async function connectWithLog (config: ConfigOptions, expected: number, ms = 1500): Promise<{ found: string[], text: string }> {
    const file = path.join(os.tmpdir(), `translation-${process.pid}-${Date.now()}.log`)
    const fd = fs.openSync(file, 'w')
    // C client logging is process wide, so it goes through the default logger.
    Aerospike.setDefaultLogging({ level: Aerospike.log.WARN, file: fd })
    try {
      const client: Cli = await Aerospike.connect(Object.assign({ hosts, tenderInterval: 250 }, config))
      try {
        await waitFor(() => client.getNodes().length >= expected, 5000)
        await new Promise(resolve => setTimeout(resolve, ms))
        return { found: addresses(client), text: fs.readFileSync(file, 'utf8') }
      } finally {
        client.close()
        // The C client finishes closing on its own thread; let its last tend
        // log here rather than in the next test's file.
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    } finally {
      Aerospike.setDefaultLogging(log)
      fs.closeSync(fd)
      fs.unlinkSync(file)
    }
  }

  function count (text: string, pattern: RegExp): number {
    return (text.match(new RegExp(pattern.source, 'g')) ?? []).length
  }

  it('logs a strict miss on every tend, and nothing for the same miss with passThrough', async function () {
    const [unmapped, ...mapped] = nodes.filter(node => node.port !== seedPort)
    const portMap = portMapByAddress([...mapped, nodes[nodes.length - 1]])
    const miss = new RegExp(`Address translator port-map has no mapping for node ${unmapped.name} advertised address ${unmapped.advertised.replace(/[.[\]]/g, '\\$&')} in the standard list`)

    const passThrough = await connectWithLog({ translation: { provider: 'port-map', portMap, onMiss: 'passThrough' } }, nodes.length - 1)
    expect(passThrough.found).to.have.lengthOf(nodes.length - 1)
    expect(passThrough.text).to.not.match(/has no mapping/)

    const strict = await connectWithLog({ translation: { provider: 'port-map', portMap, onMiss: 'strict' } }, nodes.length - 1)
    expect(strict.found).to.have.lengthOf(nodes.length - 1)
    // A strict miss skips the node, and the client checks it again on each tend.
    expect(count(strict.text, miss)).to.be.at.least(3)
    expect(strict.text).to.match(/set translation\.on_miss to pass_through/)
  })

  it('keeps a node in use when a new node translates to its address', async function () {
    // The seed node joins first; another node mapped onto the seed's address
    // is the newcomer, so only it is skipped.
    const other = nodes.find(node => node.port !== seedPort) as ClusterNode
    const seed = nodes[nodes.length - 1]
    const portMap = portMapByAddress()
    portMap[other.advertised] = portMap[seed.advertised]
    const { found, text } = await connectWithLog({ translation: { provider: 'port-map', portMap } }, nodes.length - 1)
    expect(found).to.include(`${seedHost}:${seedPort}`)
    expect(found).to.not.include(`${seedHost}:${other.port}`)
    expect(found).to.have.lengthOf(nodes.length - 1)
    expect(text).to.match(new RegExp(`Peer ${other.name} has no address of its own: ${seedHost}:${seedPort} is used by ${seed.name} \\(address translator port-map\\)`))
  })

  it('connects an unmapped node at its advertised address with onMiss passThrough', async function () {
    // The advertised address is unreachable here, so that node doesn't join.
    const [unmapped, ...mapped] = nodes.filter(node => node.port !== seedPort)
    const portMap = portMapByAddress([...mapped, nodes[nodes.length - 1]])
    const found = await connectedAddresses({ translation: { provider: 'port-map', portMap, onMiss: 'passThrough' } }, nodes.length - 1)
    expect(found).to.not.include(`${seedHost}:${unmapped.port}`)
    expect(found).to.have.lengthOf(nodes.length - 1)
  })

  it('skips an unmapped node with onMiss strict', async function () {
    const [unmapped, ...mapped] = nodes.filter(node => node.port !== seedPort)
    const portMap = portMapByAddress([...mapped, nodes[nodes.length - 1]])
    const found = await connectedAddresses({ translation: { provider: 'port-map', portMap, onMiss: 'strict' } }, nodes.length - 1)
    expect(found).to.not.include(`${seedHost}:${unmapped.port}`)
    expect(found).to.have.lengthOf(nodes.length - 1)
  })

  it('connects to the seed alone when strict skips every peer', async function () {
    // Intended (testing strategy P-11, C test translation_wrong_list_miss): a
    // strict miss skips the peer, logs it and retries every tend. A miss alone
    // never fails connect (the seed is never translated).
    const portMap = { '192.0.2.1:3000': `${seedHost}:1` }
    const found = await connectedAddresses({ translation: { provider: 'port-map', portMap, onMiss: 'strict' } }, 1)
    expect(found).to.eql([`${seedHost}:${seedPort}`])
  })

  // Tech spec: -25 and -26 come from connect only when they are the reason no
  // usable node is left. In the C client that is connect with only the seed
  // joined, a peer that could not be reached, and a miss or collision as the
  // first topology error; otherwise the node is skipped with a warning.
  it('fails connect with ERR_TRANSLATION_MISS when a strict miss leaves only the seed', async function () {
    const [dead, ...unmapped] = nodes.filter(node => node.port !== seedPort)
    expect(unmapped).to.not.be.empty
    // One peer is mapped to a port nothing listens on; the others miss.
    const portMap = { [dead.advertised]: `${seedHost}:1` }
    const error = await connectError({ hosts, log, translation: { provider: 'port-map', portMap, onMiss: 'strict' } })
    expect(error, 'connect should fail').to.not.be.null
    expect(error.code).to.equal(Aerospike.status.ERR_TRANSLATION_MISS)
    expect(error.message).to.match(/has no mapping for node/)
  })

  it('fails connect with ERR_TRANSLATION_COLLISION when a collision leaves only the seed', async function () {
    const others = nodes.filter(node => node.port !== seedPort)
    expect(others).to.have.length.of.at.least(3)
    // Two peers collide on one address; the rest keep their unreachable advertised address.
    const portMap = { [others[0].advertised]: `${seedHost}:1`, [others[1].advertised]: `${seedHost}:1` }
    const error = await connectError({ hosts, log, translation: { provider: 'port-map', portMap } })
    expect(error, 'connect should fail').to.not.be.null
    expect(error.code).to.equal(Aerospike.status.ERR_TRANSLATION_COLLISION)
    expect(error.message).to.match(/has no address of its own: .* is used by .*\(address translator port-map\)/)
  })

  it('drops both nodes that translate to the same address', async function () {
    const others = nodes.filter(node => node.port !== seedPort)
    const portMap = portMapByAddress()
    portMap[others[1].advertised] = portMap[others[0].advertised]
    const found = await connectedAddresses({ translation: { provider: 'port-map', portMap } }, nodes.length - 2)
    expect(found).to.not.include(`${seedHost}:${others[0].port}`)
    expect(found).to.not.include(`${seedHost}:${others[1].port}`)
    expect(found).to.have.lengthOf(nodes.length - 2)
  })

  it('logs both nodes when two new nodes translate to the same address', async function () {
    const others = nodes.filter(node => node.port !== seedPort)
    const portMap = portMapByAddress()
    portMap[others[1].advertised] = portMap[others[0].advertised]
    const { text } = await connectWithLog({ translation: { provider: 'port-map', portMap } }, nodes.length - 2)
    const shared = `${seedHost}:${others[0].port}`
    // Each peer is logged naming the other, and again on each tend.
    expect(count(text, new RegExp(`Peer ${others[0].name} has no address of its own: ${shared} is used by ${others[1].name}`))).to.be.at.least(2)
    expect(count(text, new RegExp(`Peer ${others[1].name} has no address of its own: ${shared} is used by ${others[0].name}`))).to.be.at.least(2)
  })

  it('uses advertised addresses as they are with pass-through', async function () {
    const error = await connectError({ hosts, log, translation: { provider: 'pass-through' } })
    expect(error.message).to.match(/Peers not reachable/)
  })

  it('ignores ipMap while a translator is set', async function () {
    const ipMap = Object.fromEntries(nodes.map(node => [node.advertised.split(':')[0], seedHost]))
    // ipMap alone finds every node ...
    expect(await connectedAddresses({ ipMap }, nodes.length)).to.eql(reachable())
    // ... but not together with pass-through.
    const error = await connectError({ hosts, log, ipMap, translation: { provider: 'pass-through' } })
    expect(error.message).to.match(/Peers not reachable/)
  })

  // A port-map from every address in one of the server's peer lists to the
  // same port on the seed host.
  async function portMapFor (list: string): Promise<Record<string, string>> {
    const peers = await advertisedPeers(seedHost, seedPort, list)
    return Object.fromEntries(peers.map(peer => [`${peer.host}:${peer.port}`, `${seedHost}:${peer.port}`]))
  }

  describe('with useAlternateAccessAddress, where nodes advertise hostnames', function () {
    it('finds every node through port-map keyed by the alternate hostnames', async function () {
      const translation = { provider: 'port-map' as const, portMap: await portMapFor('peers-clear-alt') }
      expect(await connectedAddresses({ useAlternateAccessAddress: true, translation }, nodes.length)).to.eql(reachable())
    })

    it('fails when port-map is keyed by the standard addresses instead', async function () {
      const translation = { provider: 'port-map' as const, portMap: await portMapFor('peers-clear-std') }
      const error = await connectError({ hosts, log, useAlternateAccessAddress: true, translation })
      expect(error.message).to.match(/Peers not reachable/)
    })
  })

  describe('over TLS', function () {
    let tls: any = null
    let dns: DnsServer
    const tlsPort = seedPort + 10

    before(async function () {
      if (!caFile) this.skip()
      tls = { enable: true, cafile: caFile }
      dns = await startDnsServer({ 'tls.cluster.test': { A: [seedHost] } })
    })

    after(async function () {
      if (dns) await dns.stop()
    })

    function tlsReachable (): string[] {
      return nodes.map(node => `${seedHost}:${node.port + 10}`).sort()
    }

    function dnsDiscovery (name: string): any {
      return { provider: 'dns', dns: { names: ['tls.cluster.test'], servers: [dns.address], port: tlsPort, tlsName: name } }
    }

    it('finds every node from DNS seeds with a TLS name, through port-map', async function () {
      const translation = { provider: 'port-map' as const, portMap: await portMapFor('peers-tls-std') }
      expect(await connectedAddresses({ hosts: [], tls, discovery: dnsDiscovery(tlsName), translation }, nodes.length)).to.eql(tlsReachable())
    })

    it('still rejects a certificate that does not match the DNS seeds\' TLS name', async function () {
      const translation = { provider: 'port-map' as const, portMap: await portMapFor('peers-tls-std') }
      const error = await connectError({ hosts: [], log, tls, discovery: dnsDiscovery('not-ipmap-tls'), translation })
      expect(error.code).to.equal(Aerospike.status.ERR_CONNECTION)
    })

    it('finds every node with TLS and alternate hostnames, through port-map', async function () {
      const translation = { provider: 'port-map' as const, portMap: await portMapFor('peers-tls-alt') }
      const tlsHosts = [{ addr: seedHost, port: tlsPort, tlsname: tlsName }]
      expect(await connectedAddresses({ hosts: tlsHosts, tls, useAlternateAccessAddress: true, translation }, nodes.length)).to.eql(tlsReachable())
    })
  })

  describe('with the dns provider', function () {
    let dns: DnsServer

    before(async function () {
      dns = await startDnsServer({
        'seeds.cluster.test': { A: [seedHost] },
        '_aerospike._tcp.cluster.test': { SRV: nodes.slice(0, 2).map((node, i) => ({ target: `n${i}.cluster.test`, port: node.port })) },
        'n0.cluster.test': { A: [seedHost] },
        'n1.cluster.test': { A: [seedHost] }
      })
    })

    after(async function () {
      if (dns) await dns.stop()
    })

    const translation = () => ({ provider: 'port-map' as const, portMap: portMapByAddress() })

    it('finds every node from SRV seeds, with no hosts', async function () {
      const discovery = { provider: 'dns' as const, dns: { names: ['_aerospike._tcp.cluster.test'], recordType: 'SRV' as const, servers: [dns.address] } }
      expect(await connectedAddresses({ hosts: [], discovery, translation: translation() }, nodes.length)).to.eql(reachable())
    })

    it('finds every node from A seeds in tend mode', async function () {
      const discovery = { provider: 'dns' as const, dns: { names: ['seeds.cluster.test'], port: seedPort, servers: [dns.address] }, executionMode: 'tend' as const }
      expect(await connectedAddresses({ hosts: [], discovery, translation: translation() }, nodes.length)).to.eql(reachable())
    })
  })

  // Adds and removes an extra node 7, so the nodes the other tests map by
  // address are never restarted (a restarted container can get a new address).
  describe('with a node added and removed', function () {
    this.timeout(120000)
    const extra = 7
    const extraPort = 4000 + (extra - 1) * 100

    before(function () {
      if (!script) this.skip()
    })

    // A port-map filled in advance for every address of the node subnet and
    // every node port, including the extra node's, which no node has yet.
    function prefilledPortMap (): Record<string, string> {
      const prefix = nodes[0].advertised.split(':')[0].split('.').slice(0, 3).join('.')
      const map: Record<string, string> = {}
      for (let n = 1; n <= extra; n++) {
        const port = 4000 + (n - 1) * 100
        for (let i = 1; i < 255; i++) map[`${prefix}.${i}:${port}`] = `${seedHost}:${port}`
      }
      return map
    }

    function cluster (verb: string): void {
      execFileSync(script as string, [verb, String(extra)], { stdio: 'ignore' })
    }

    it('reaches a new node through a pre-filled port-map with no client change (TC-09A, N-19)', async function () {
      const config: ConfigOptions = { hosts, log, tenderInterval: 250 }
      const covered: Cli = await Aerospike.connect(Object.assign({}, config, { translation: { provider: 'port-map', portMap: prefilledPortMap(), onMiss: 'strict' } }))
      const exact: Cli = await Aerospike.connect(Object.assign({}, config, { translation: { provider: 'port-map', portMap: portMapByAddress(), onMiss: 'strict' } }))
      try {
        expect(await waitFor(() => covered.getNodes().length === nodes.length, 10000)).to.be.true
        cluster('add')
        expect(await waitFor(() => covered.getNodes().length === nodes.length + 1, 60000), 'the new node joins').to.be.true
        expect(addresses(covered)).to.include(`${seedHost}:${extraPort}`)
        // The exact map has no entry for the new node's address, so strict skips it.
        expect(exact.getNodes()).to.have.lengthOf(nodes.length)
        cluster('remove')
        expect(await waitFor(() => covered.getNodes().length === nodes.length, 30000), 'the node leaves').to.be.true
      } finally {
        try { cluster('remove') } catch (err) {}
        covered.close()
        exact.close()
      }
    })

    it('keeps tending while a thread-mode DNS refresh is stalled (TC-15)', async function () {
      // The resolver answers after 8 s. Once a refresh is waiting on it, the
      // extra node is removed: the client drops it within a few tends, which
      // only the tend thread does, so tend was not waiting on the refresh.
      const dns = await startDnsServer({ 'seeds.cluster.test': { A: [seedHost] } })
      let client: Cli | undefined
      try {
        cluster('add')
        const discovery = { provider: 'dns' as const, dns: { names: ['seeds.cluster.test'], port: seedPort, servers: [dns.address], timeoutMs: 9000 }, refreshIntervalMs: 1000, refreshTimeoutMs: 10000 }
        client = await Aerospike.connect({ hosts: [], log, tenderInterval: 250, discovery, translation: { provider: 'port-map', portMap: prefilledPortMap() } })
        const c = client
        expect(await waitFor(() => c.getNodes().length === nodes.length + 1, 60000), 'the extra node joins').to.be.true
        await dns.setDelay(8000)
        const queries = await dns.queries()
        const started = Date.now()
        // Wait for a refresh to reach the stalled resolver.
        while ((await dns.queries()) === queries && Date.now() - started < 3000) await new Promise(resolve => setTimeout(resolve, 50))
        expect(await dns.queries(), 'a refresh is waiting on the resolver').to.be.above(queries)
        const stalledAt = Date.now()
        cluster('remove')
        expect(await waitFor(() => c.getNodes().length === nodes.length, 6000), 'tend drops the removed node').to.be.true
        expect(Date.now() - stalledAt, 'well before the refresh returns').to.be.below(7000)
        const key = new Aerospike.Key('test', 'demo', 'translation-cluster/tc15')
        await c.put(key, { v: 1 })
        await c.remove(key)
      } finally {
        await dns.setDelay(0)
        client?.close()
        try { cluster('remove') } catch (err) {}
        await dns.stop()
      }
    })
  })
})

// TC-02A, N-16, design T3: one address with a port per node, server-advertised.
// Needs the 2-node cluster from discoverydocs/test-cluster/cluster.sh t3-up, whose
// nodes advertise 127.0.0.1 with their own port as the alternate address
// (clear and TLS) and container addresses as the standard one. Local only.
describe('pass-through on one address with a port per node (T3)', function () {
  this.timeout(60000)
  const t3Env = process.env.IPMAP_T3_SEED

  if (!t3Env) {
    it.skip('set IPMAP_T3_SEED to run')
    return
  }

  const [t3Host, t3PortText] = t3Env.split(':')
  const t3Port = Number(t3PortText)
  const ports = [t3Port, t3Port + 100]

  async function useEveryPartition (client: Cli): Promise<void> {
    const keys = Array.from({ length: 200 }, (_, i) => new Aerospike.Key('test', 'demo', `t3/${i}`))
    try {
      for (const key of keys) await client.put(key, { i: 1 })
      const records = await client.batchRead(keys.map(key => ({ key, readAllBins: true })))
      expect(records.filter(record => record.status === Aerospike.status.OK)).to.have.lengthOf(keys.length)
    } finally {
      await client.batchRemove(keys).catch(() => {})
    }
  }

  it('reaches every node at its advertised alternate address with no map', async function () {
    const client: Cli = await Aerospike.connect({ hosts: [{ addr: t3Host, port: t3Port }], log, tenderInterval: 250, useAlternateAccessAddress: true, translation: { provider: 'pass-through' } })
    try {
      expect(await waitFor(() => client.getNodes().length === 2, 5000)).to.be.true
      expect(addresses(client)).to.eql(ports.map(port => `${t3Host}:${port}`))
      await useEveryPartition(client)
    } finally {
      client.close()
    }
  })

  it('does not reach the peer at its standard address, which the host cannot route', async function () {
    // Without the alternate list, pass-through uses the container address.
    const error = await connectError({ hosts: [{ addr: t3Host, port: t3Port }], log, tenderInterval: 250, translation: { provider: 'pass-through' } })
    expect(error, 'connect fails with the peer unreachable').to.not.be.null
    expect(error.message).to.match(/Peers not reachable/)
  })

  it('does the same over TLS, checking each node against its TLS name', async function () {
    if (!caFile) return this.skip()
    const tls = { enable: true, cafile: caFile }
    const client: Cli = await Aerospike.connect({ hosts: [{ addr: t3Host, port: t3Port + 10, tlsname: tlsName }], log, tls, tenderInterval: 250, useAlternateAccessAddress: true, translation: { provider: 'pass-through' } })
    try {
      expect(await waitFor(() => client.getNodes().length === 2, 5000)).to.be.true
      expect(addresses(client)).to.eql(ports.map(port => `${t3Host}:${port + 10}`))
      await useEveryPartition(client)
    } finally {
      client.close()
    }
  })
})
