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

// A minimal EC2 endpoint for the aws-tags seed provider tests. It answers every
// DescribeInstances request with one page listing the given private IP
// addresses, and records the request bodies it receives. It doesn't check the
// signature. It runs on a worker thread: connect() blocks the main thread
// while the client waits for the first discovery refresh, so a server there
// could never answer.

export interface Ec2Server {
  // The endpoint to pass in discovery.aws.endpoint, e.g. 'http://127.0.0.1:41000'.
  endpoint: string
  // The request bodies received so far.
  requests: () => Promise<string[]>
  stop: () => Promise<void>
}

const SERVER = `
const http = require('http')
const { workerData, parentPort } = require('worker_threads')
const requests = []

function body (addresses) {
  const items = addresses.map((ip, i) =>
    '<item><instanceId>i-' + i + '</instanceId><privateIpAddress>' + ip + '</privateIpAddress></item>').join('')
  return '<?xml version="1.0" encoding="UTF-8"?>' +
    '<DescribeInstancesResponse xmlns="http://ec2.amazonaws.com/doc/2016-11-15/">' +
    '<requestId>r-1</requestId><reservationSet><item><instancesSet>' + items +
    '</instancesSet></item></reservationSet></DescribeInstancesResponse>'
}

const server = http.createServer((req, res) => {
  let data = ''
  req.on('data', chunk => { data += chunk })
  req.on('end', () => {
    requests.push(data)
    const xml = body(workerData.addresses)
    res.writeHead(200, { 'Content-Type': 'text/xml', 'Content-Length': Buffer.byteLength(xml) })
    res.end(xml)
  })
})

server.listen(0, '127.0.0.1', () => parentPort.postMessage({ port: server.address().port }))

parentPort.on('message', message => {
  if (message === 'requests') parentPort.postMessage({ requests })
  else server.close(() => process.exit(0))
})
`

export async function startEc2Server (addresses: string[]): Promise<Ec2Server> {
  const worker = new Worker(SERVER, { eval: true, workerData: { addresses } })
  const { port } = await new Promise<any>(resolve => worker.once('message', resolve))
  return {
    endpoint: `http://127.0.0.1:${port}`,
    requests: async () => {
      worker.postMessage('requests')
      return (await new Promise<any>(resolve => worker.once('message', resolve))).requests
    },
    stop: async () => {
      worker.postMessage('stop')
      await new Promise(resolve => worker.once('exit', resolve))
    }
  }
}
