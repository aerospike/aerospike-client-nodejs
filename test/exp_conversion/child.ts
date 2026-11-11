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

// Compiles one set of cases in this process and prints, as JSON, each case's
// compiled bytes (or error) and the native log messages it wrote. The parent
// picks the conversion path with AEROSPIKE_EXP_LEGACY, which the add-on reads
// once per process.
//
//   node --import tsx child.ts <set>
//
// in-worker.ts runs it in a worker thread instead.

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { isMainThread, parentPort, workerData } from 'worker_threads';
import * as Aerospike from '../../lib/aerospike.js';
import { sets, fastOnly } from './corpus.ts';

type Result = { out: string, log: string[] }

function compileAll (set: string): Record<string, Result> {
  const cases = set === 'fastOnly' ? fastOnly : sets()[set]
  const logFile = path.join(os.tmpdir(), `exp-conversion-${process.pid}-${Date.now()}.log`)
  const fd = fs.openSync(logFile, 'w+')
  const client = Aerospike.client({ hosts: '127.0.0.1:9', log: { level: Aerospike.log.DEBUG, file: fd } } as any)
  const results: Record<string, Result> = {}
  let offset = 0

  for (const [name, build] of Object.entries(cases)) {
    let out: string
    try {
      out = client.expressionToBase64(build())
    } catch (err: any) {
      out = `ERROR: ${err.message}`
    } finally {
      delete (Object.prototype as any).intVal // see 'polluted Object.prototype'
    }
    const written = fs.readFileSync(logFile, 'utf8').slice(offset)
    offset += written.length
    // the message only: the line also names the C function and line number
    const log = written.split('\n').filter(Boolean).map(line => line.replace(/^.*?\] - /, ''))
    results[name] = { out, log }
  }

  fs.closeSync(fd)
  fs.rmSync(logFile, { force: true })
  return results
}

function timeCompile (iterations: number): number {
  const client = Aerospike.client({ hosts: '127.0.0.1:9' } as any)
  const expression = Aerospike.exp.and(...Array.from({ length: 500 }, (_, i) =>
    Aerospike.exp.eq(Aerospike.exp.binInt(`b${i % 7}`), Aerospike.exp.int(i))))
  client.expressionToBase64(expression) // warm up
  const start = process.hrtime.bigint()
  for (let i = 0; i < iterations; i++) client.expressionToBase64(expression)
  return Number(process.hrtime.bigint() - start) / iterations
}

if (!isMainThread) {
  parentPort!.postMessage(compileAll(workerData.set))
} else {
  const set = process.argv[2]
  const print = (value: unknown) => process.stdout.write(JSON.stringify(value))
  if (set === 'timing') {
    print({ nsPerCompile: timeCompile(200) })
  } else {
    print(compileAll(set))
  }
}
