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

import type { Client as Cli, ConfigOptions } from '../../lib/aerospike.js';

import * as net from 'net';
import * as Aerospike from '../../lib/aerospike.js';
import * as helper from '../test_helper.ts';

// Shared plumbing for the discovery and address translation tests.

export const UNRESOLVABLE_SEED = 'ip-map-seed.invalid'

// The test config with its seed renamed to a host that doesn't resolve, plus an
// ipMap that maps it back to the real seed. Null when the test hosts aren't an
// array of { addr, port }, so the caller can skip.
export function mappedSeedConfig (): ConfigOptions | null {
  const hosts: any = helper.config.hosts
  const seed: any = Array.isArray(hosts) ? hosts[0] : null
  if (!seed || typeof seed.addr !== 'string') {
    return null
  }
  return Object.assign({}, helper.config, {
    hosts: [Object.assign({}, seed, { addr: UNRESOLVABLE_SEED })],
    ipMap: { [UNRESOLVABLE_SEED]: seed.addr }
  })
}

// A minimal info request, so the peer list can be read without a connected client:
// 8-byte header (version 2, type 1, 48-bit body length), then "name\n".
export function info (host: string, port: number, name: string): Promise<string> {
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
export async function advertisedPeers (host: string, port: number, list = 'peers-clear-std'): Promise<Array<{ host: string, port: number }>> {
  const peers = await info(host, port, list)
  return [...peers.matchAll(/\[[0-9A-F]+,[^,]*,\[([^\]]*)\]\]/g)].map(m => {
    const address = m[1].split(',')[0]
    const colon = address.lastIndexOf(':')
    return { host: address.slice(0, colon), port: Number(address.slice(colon + 1)) }
  })
}

// An ipMap sending every given peer host to target.
export function mapTo (peers: Array<{ host: string }>, target: string): Record<string, string> {
  return Object.fromEntries(peers.map(peer => [peer.host, target]))
}

// The error connect() fails with, or null if it connects.
export async function connectError (config: ConfigOptions): Promise<any> {
  try {
    const client = await Aerospike.connect(config)
    client.close()
  } catch (err) {
    return err
  }
  return null
}

// The client's node addresses, sorted, e.g. ['127.0.0.1:4000', '127.0.0.1:4100'].
export function addresses (client: Cli): string[] {
  return client.getNodes().map(node => node.address).sort()
}

export async function waitFor (condition: () => boolean, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (condition()) return true
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  return condition()
}
