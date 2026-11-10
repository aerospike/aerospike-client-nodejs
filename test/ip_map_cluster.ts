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

/* global expect, describe, it, before */
/* eslint-disable no-unused-expressions */

// Local test only, not for CI: needs a multi-node cluster started by hand.
// ipMap against a multi-node cluster whose nodes advertise addresses the client
// can't reach, with each node on its own port. Needs such a cluster, so it is
// skipped unless IPMAP_CLUSTER_SEED is set, e.g. IPMAP_CLUSTER_SEED=127.0.0.1:4000.
// The alternate-address tests expect each node's alternate address to be a hostname
// the client can't resolve. The TLS tests need IPMAP_CLUSTER_CA, the CA of a node
// certificate for the TLS name "ipmap-tls", served on each node's port + 10.
// The scale-out test also needs IPMAP_CLUSTER_SCRIPT, a script taking
// "add <i>" / "remove <i>" where node i listens on port 4000 + (i-1)*100.

import type { Client as Cli, ConfigOptions } from '../lib/aerospike.js'
import * as Aerospike from '../lib/aerospike.js'

import { expect } from 'chai'
import * as net from 'net'
import { execFileSync } from 'child_process'

const seedEnv = process.env.IPMAP_CLUSTER_SEED
const script = process.env.IPMAP_CLUSTER_SCRIPT
const caFile = process.env.IPMAP_CLUSTER_CA
const tlsName = 'ipmap-tls'
const log = { level: Aerospike.log.OFF }

// A minimal info request, so the peer list can be read without a connected client:
// 8-byte header (version 2, type 1, 48-bit body length), then "name\n".
function info (host: string, port: number, name: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const body = Buffer.from(name + '\n')
    const header = Buffer.alloc(8)
    header.writeUInt8(2, 0)
    header.writeUInt8(1, 1)
    header.writeUIntBE(body.length, 2, 6)
    const socket = net.connect(port, host, () => socket.write(Buffer.concat([header, body])))
    let response = Buffer.alloc(0)
    socket.on('data', (data: Buffer) => {
      response = Buffer.concat([response, data])
      if (response.length >= 8 && response.length >= 8 + response.readUIntBE(2, 6)) {
        socket.end()
        const text = response.subarray(8, 8 + response.readUIntBE(2, 6)).toString()
        resolve(text.split('\t')[1].trim())
      }
    })
    socket.on('error', reject)
  })
}

// [{ host, port }] for every peer the seed advertises in the given list
// (peers-clear-std, peers-clear-alt, peers-tls-std or peers-tls-alt), e.g.
// "10,3000,[[BB9..,,[10.89.0.3:4100]],[BB9..,ipmap-tls,[aero-ipmap-2:4110]]]".
async function advertisedPeers (host: string, port: number, list = 'peers-clear-std'): Promise<Array<{ host: string, port: number }>> {
  const peers = await info(host, port, list)
  return [...peers.matchAll(/\[[0-9A-F]+,[^,]*,\[([^\]]*)\]\]/g)].map(m => {
    const address = m[1].split(',')[0]
    const colon = address.lastIndexOf(':')
    return { host: address.slice(0, colon), port: Number(address.slice(colon + 1)) }
  })
}

function mapTo (peers: Array<{ host: string }>, target: string): Record<string, string> {
  return Object.fromEntries(peers.map(peer => [peer.host, target]))
}

async function connectError (config: ConfigOptions): Promise<any> {
  try {
    const client = await Aerospike.connect(config)
    client.close()
  } catch (err) {
    return err
  }
  return null
}

function addresses (client: Cli): string[] {
  return client.getNodes().map(node => node.address).sort()
}

async function waitFor (condition: () => boolean, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (condition()) return true
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  return condition()
}

describe('ipMap against a multi-node cluster', function () {
  this.timeout(60000)

  if (!seedEnv) {
    it.skip('set IPMAP_CLUSTER_SEED to run')
    return
  }

  const [seedHost, seedPortText] = seedEnv.split(':')
  const seedPort = Number(seedPortText)
  const hosts = [{ addr: seedHost, port: seedPort }]
  let peers: Array<{ host: string, port: number }> = []
  let ipMap: Record<string, string> = {}

  before(async function () {
    peers = await advertisedPeers(seedHost, seedPort)
    ipMap = Object.fromEntries(peers.map(peer => [peer.host, seedHost]))
  })

  it('fails to connect without ipMap, because the peers are unreachable', async function () {
    let error: any = null
    try {
      const client = await Aerospike.connect({ hosts, log })
      client.close()
    } catch (err) {
      error = err
    }
    expect(error).to.be.instanceof(Aerospike.AerospikeError)
    expect(error.message).to.match(/Peers not reachable/)
  })

  it('finds every node through ipMap, each keeping its own port', async function () {
    const client: Cli = await Aerospike.connect({ hosts, log, ipMap, tenderInterval: 250 })
    try {
      const expected = [`${seedHost}:${seedPort}`, ...peers.map(peer => `${seedHost}:${peer.port}`)].sort()
      expect(await waitFor(() => client.getNodes().length === expected.length, 5000)).to.be.true
      expect(addresses(client)).to.eql(expected)
    } finally {
      client.close()
    }
  })

  it('runs commands on every node through ipMap', async function () {
    const client: Cli = await Aerospike.connect({ hosts, log, ipMap, tenderInterval: 250 })
    const keys = Array.from({ length: 300 }, (_, i) => new Aerospike.Key('test', 'demo', `ip-map-cluster/${i}`))
    try {
      expect(await waitFor(() => client.getNodes().length === peers.length + 1, 5000)).to.be.true
      for (const key of keys) {
        await client.put(key, { i: 1 })
      }
      const records = await client.batchRead(keys.map(key => ({ key, readAllBins: true })))
      expect(records.filter(record => record.status === Aerospike.status.OK)).to.have.lengthOf(keys.length)
    } finally {
      await client.batchRemove(keys).catch(() => {})
      client.close()
    }
  })

  describe('with useAlternateAccessAddress, where nodes advertise hostnames', function () {
    let altPeers: Array<{ host: string, port: number }> = []

    before(async function () {
      altPeers = await advertisedPeers(seedHost, seedPort, 'peers-clear-alt')
    })

    it('fails to connect without ipMap, because the hostnames don\'t resolve', async function () {
      const error = await connectError({ hosts, log, useAlternateAccessAddress: true })
      expect(error).to.be.instanceof(Aerospike.AerospikeError)
      expect(error.message).to.match(/Peers not reachable/)
    })

    it('ignores an ipMap keyed by the standard addresses', async function () {
      const error = await connectError({ hosts, log, useAlternateAccessAddress: true, ipMap })
      expect(error).to.be.instanceof(Aerospike.AerospikeError)
      expect(error.message).to.match(/Peers not reachable/)
    })

    it('finds every node through an ipMap keyed by hostname', async function () {
      const config = { hosts, log, useAlternateAccessAddress: true, ipMap: mapTo(altPeers, seedHost), tenderInterval: 250 }
      const client: Cli = await Aerospike.connect(config)
      try {
        const expected = [`${seedHost}:${seedPort}`, ...altPeers.map(peer => `${seedHost}:${peer.port}`)].sort()
        expect(await waitFor(() => client.getNodes().length === expected.length, 5000)).to.be.true
        expect(addresses(client)).to.eql(expected)
        const key = new Aerospike.Key('test', 'demo', 'ip-map-cluster/alt')
        await client.put(key, { v: 1 })
        expect((await client.get(key)).bins.v).to.equal(1)
        await client.remove(key)
      } finally {
        client.close()
      }
    })
  })

  describe('over TLS', function () {
    const tlsPort = seedPort + 10
    const tlsHosts = [{ addr: seedHost, port: tlsPort, tlsname: tlsName }]
    let tls: any = null

    before(function () {
      if (!caFile) this.skip()
      tls = { enable: true, cafile: caFile }
    })

    it('fails to connect without ipMap', async function () {
      const error = await connectError({ hosts: tlsHosts, log, tls })
      expect(error).to.be.instanceof(Aerospike.AerospikeError)
      expect(error.message).to.match(/Peers not reachable/)
    })

    it('finds every node through ipMap, with TLS names still checked', async function () {
      const tlsPeers = await advertisedPeers(seedHost, seedPort, 'peers-tls-std')
      const client: Cli = await Aerospike.connect({ hosts: tlsHosts, log, tls, ipMap: mapTo(tlsPeers, seedHost), tenderInterval: 250 })
      try {
        const expected = [`${seedHost}:${tlsPort}`, ...tlsPeers.map(peer => `${seedHost}:${peer.port}`)].sort()
        expect(await waitFor(() => client.getNodes().length === expected.length, 5000)).to.be.true
        expect(addresses(client)).to.eql(expected)
        const key = new Aerospike.Key('test', 'demo', 'ip-map-cluster/tls')
        await client.put(key, { v: 1 })
        expect((await client.get(key)).bins.v).to.equal(1)
        await client.remove(key)
      } finally {
        client.close()
      }
    })

    it('still rejects a certificate that doesn\'t match the TLS name', async function () {
      const tlsPeers = await advertisedPeers(seedHost, seedPort, 'peers-tls-std')
      const wrongName = [{ addr: seedHost, port: tlsPort, tlsname: 'not-ipmap-tls' }]
      // Fails in the TLS handshake ("certificate verify failed" in the log).
      const error = await connectError({ hosts: wrongName, log, tls, ipMap: mapTo(tlsPeers, seedHost) })
      expect(error).to.be.instanceof(Aerospike.AerospikeError)
      expect(error.code).to.equal(Aerospike.status.ERR_CONNECTION)
    })

    it('finds every node through ipMap with TLS and alternate hostnames', async function () {
      const tlsAltPeers = await advertisedPeers(seedHost, seedPort, 'peers-tls-alt')
      const config = { hosts: tlsHosts, log, tls, useAlternateAccessAddress: true, ipMap: mapTo(tlsAltPeers, seedHost), tenderInterval: 250 }
      const client: Cli = await Aerospike.connect(config)
      try {
        const expected = [`${seedHost}:${tlsPort}`, ...tlsAltPeers.map(peer => `${seedHost}:${peer.port}`)].sort()
        expect(await waitFor(() => client.getNodes().length === expected.length, 5000)).to.be.true
        expect(addresses(client)).to.eql(expected)
      } finally {
        client.close()
      }
    })
  })

  describe('scale-out', function () {
    const node = 7
    const port = 4000 + (node - 1) * 100

    before(function () {
      if (!script) this.skip()
    })

    it('picks up a new node only when ipMap already covers its address', async function () {
      // The new node's address isn't known yet, so pre-fill the whole /24: the
      // pattern for a deployment where nodes come and go inside a known range.
      const prefix = peers[0].host.split('.').slice(0, 3).join('.')
      const prefilled: Record<string, string> = {}
      for (let i = 1; i < 255; i++) prefilled[`${prefix}.${i}`] = seedHost

      const config: ConfigOptions = { hosts, log, tenderInterval: 250 }
      const covered: Cli = await Aerospike.connect(Object.assign({}, config, { ipMap: prefilled }))
      const exact: Cli = await Aerospike.connect(Object.assign({}, config, { ipMap }))
      const before = peers.length + 1
      try {
        execFileSync(script as string, ['add', String(node)])
        expect(await waitFor(() => covered.getNodes().length === before + 1, 20000)).to.be.true
        expect(addresses(covered)).to.include(`${seedHost}:${port}`)
        // The node's address isn't in the exact map, so it stays unreachable.
        expect(exact.getNodes()).to.have.lengthOf(before)

        execFileSync(script as string, ['remove', String(node)])
        expect(await waitFor(() => covered.getNodes().length === before, 20000)).to.be.true
      } finally {
        try { execFileSync(script as string, ['remove', String(node)]) } catch (err) {}
        covered.close()
        exact.close()
      }
    })
  })
})
