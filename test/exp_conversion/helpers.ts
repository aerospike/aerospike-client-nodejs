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

import { spawnSync } from 'child_process';
import * as path from 'path';

const SCRIPTS = { process: path.join(__dirname, 'child.ts'), worker: path.join(__dirname, 'in-worker.ts') }

export type Results = Record<string, { out: string, log: string[] }>

export type Mode = 'legacy' | 'fast'

// Runs child.ts in a new process (in its main thread or a worker) with the
// given conversion path and returns what it printed.
export function compileIn (mode: Mode, set: string, thread: 'process' | 'worker' = 'process'): any {
  const res = spawnSync(process.execPath, ['--import', 'tsx', SCRIPTS[thread], set], {
    env: { ...process.env, AEROSPIKE_EXP_LEGACY: mode === 'legacy' ? '1' : '0' },
    encoding: 'utf8',
    maxBuffer: 512 * 1024 * 1024
  })
  if (res.status !== 0) {
    throw new Error(`${mode} child for '${set}' failed (status ${res.status}, signal ${res.signal}):\n${res.stderr}`)
  }
  return JSON.parse(res.stdout)
}

// The names of the cases whose bytes, error or log messages differ.
export function differences (legacy: Results, fast: Results): string[] {
  const names = new Set([...Object.keys(legacy), ...Object.keys(fast)])
  return [...names].filter(name => JSON.stringify(legacy[name]) !== JSON.stringify(fast[name]))
    .map(name => `${name}\n    legacy: ${JSON.stringify(legacy[name]).slice(0, 300)}\n    fast:   ${JSON.stringify(fast[name]).slice(0, 300)}`)
}
