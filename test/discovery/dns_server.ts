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

import { Worker } from 'worker_threads'

// A minimal UDP DNS server for the DNS seed provider tests. It answers A, AAAA
// and SRV queries from a fixed table, and NXDOMAIN for unknown names. It runs
// on a worker thread: connect() blocks the main thread while the client waits
// for the first discovery refresh, so a server there could never answer.

export interface SrvRecord {
  target: string
  port: number
}

export interface DnsRecords {
  [name: string]: { A?: string[], AAAA?: string[], SRV?: SrvRecord[] }
}

export interface DnsServer {
  // The resolver address to pass in discovery.dns.servers, e.g. '127.0.0.1:53053'.
  address: string
  // Number of queries answered so far.
  queries: () => Promise<number>
  // Replace the records the server answers with.
  setRecords: (records: DnsRecords) => Promise<void>
  // Delay every answer by this many milliseconds.
  setDelay: (delayMs: number) => Promise<void>
  stop: () => Promise<void>
}

const SERVER = `
const dgram = require('dgram')
const { workerData, parentPort } = require('worker_threads')
let records = workerData.records
let delayMs = workerData.delayMs
const silent = workerData.silent
const TYPE = { A: 1, AAAA: 28, SRV: 33 }
let queries = 0

function encodeName (name) {
  const parts = name.replace(/\\.$/, '').split('.')
  return Buffer.concat([...parts.map(p => Buffer.concat([Buffer.from([p.length]), Buffer.from(p)])), Buffer.from([0])])
}

function rr (name, type, data) {
  const head = Buffer.alloc(10)
  head.writeUInt16BE(type, 0)
  head.writeUInt16BE(1, 2)
  head.writeUInt32BE(60, 4)
  head.writeUInt16BE(data.length, 8)
  return Buffer.concat([name, head, data])
}

function addressData (type, address) {
  if (type === TYPE.A) return Buffer.from(address.split('.').map(Number))
  // Expand '::' to the missing zero groups.
  const [head, tail] = address.includes('::') ? address.split('::') : [address, undefined]
  const left = head ? head.split(':') : []
  const right = tail ? tail.split(':') : []
  const groups = tail === undefined ? left : [...left, ...Array(8 - left.length - right.length).fill('0'), ...right]
  const buf = Buffer.alloc(16)
  groups.forEach((g, i) => buf.writeUInt16BE(parseInt(g, 16), i * 2))
  return buf
}

function answer (msg) {
  let offset = 12
  const labels = []
  while (msg[offset] !== 0) {
    labels.push(msg.subarray(offset + 1, offset + 1 + msg[offset]).toString())
    offset += msg[offset] + 1
  }
  offset += 1
  const qtype = msg.readUInt16BE(offset)
  const question = msg.subarray(12, offset + 4)
  const name = labels.join('.').toLowerCase()
  const entry = records[name]
  const answers = []
  const additional = []

  if (entry) {
    if (qtype === TYPE.A || qtype === TYPE.AAAA) {
      const list = (qtype === TYPE.A ? entry.A : entry.AAAA) || []
      for (const address of list) answers.push(rr(Buffer.from([0xc0, 0x0c]), qtype, addressData(qtype, address)))
    }
    else if (qtype === TYPE.SRV) {
      for (const srv of entry.SRV || []) {
        const data = Buffer.alloc(6)
        data.writeUInt16BE(10, 0)
        data.writeUInt16BE(10, 2)
        data.writeUInt16BE(srv.port, 4)
        answers.push(rr(Buffer.from([0xc0, 0x0c]), TYPE.SRV, Buffer.concat([data, encodeName(srv.target)])))
        const target = records[srv.target.toLowerCase()]
        for (const address of (target && target.A) || []) {
          additional.push(rr(encodeName(srv.target), TYPE.A, addressData(TYPE.A, address)))
        }
      }
    }
  }

  const header = Buffer.alloc(12)
  msg.copy(header, 0, 0, 2)
  header.writeUInt16BE(entry ? 0x8180 : 0x8183, 2)
  header.writeUInt16BE(1, 4)
  header.writeUInt16BE(answers.length, 6)
  header.writeUInt16BE(0, 8)
  header.writeUInt16BE(additional.length, 10)
  return Buffer.concat([header, question, ...answers, ...additional])
}

const socket = dgram.createSocket('udp4')
socket.on('message', (msg, rinfo) => {
  queries++
  if (silent) return
  const reply = answer(msg)
  if (delayMs > 0) setTimeout(() => socket.send(reply, rinfo.port, rinfo.address), delayMs)
  else socket.send(reply, rinfo.port, rinfo.address)
})
socket.bind(0, '127.0.0.1', () => parentPort.postMessage({ port: socket.address().port }))
parentPort.on('message', message => {
  if (message === 'queries') parentPort.postMessage({ queries })
  else if (message.records) {
    records = message.records
    parentPort.postMessage({ updated: true })
  }
  else if (message.delayMs !== undefined) {
    delayMs = message.delayMs
    parentPort.postMessage({ updated: true })
  }
  else socket.close(() => process.exit(0))
})
`

function lowerCase (records: DnsRecords): DnsRecords {
  const lower: DnsRecords = {}
  for (const [name, entry] of Object.entries(records)) lower[name.toLowerCase()] = entry
  return lower
}

export interface DnsServerOptions {
  // Delay every answer by this many milliseconds.
  delayMs?: number
  // Count queries but never answer, like a resolver that is down.
  silent?: boolean
}

export async function startDnsServer (records: DnsRecords, options: DnsServerOptions = {}): Promise<DnsServer> {
  const workerData = { records: lowerCase(records), delayMs: options.delayMs ?? 0, silent: options.silent ?? false }
  const worker = new Worker(SERVER, { eval: true, workerData })
  const { port } = await new Promise<any>(resolve => worker.once('message', resolve))
  return {
    address: `127.0.0.1:${port}`,
    queries: async () => {
      worker.postMessage('queries')
      return (await new Promise<any>(resolve => worker.once('message', resolve))).queries
    },
    setRecords: async (newRecords: DnsRecords) => {
      worker.postMessage({ records: lowerCase(newRecords) })
      await new Promise(resolve => worker.once('message', resolve))
    },
    setDelay: async (delayMs: number) => {
      worker.postMessage({ delayMs })
      await new Promise(resolve => worker.once('message', resolve))
    },
    stop: async () => {
      worker.postMessage('stop')
      await new Promise(resolve => worker.once('exit', resolve))
    }
  }
}
