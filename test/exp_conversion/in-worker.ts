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

// Runs child.ts in a worker thread, prints its results, then lets the worker
// exit, which frees the add-on's per-thread keys. This thread must not load the
// add-on: it loads into one thread per process only.
//
//   node --import tsx in-worker.ts <set>

import * as path from 'path';
import { Worker } from 'worker_threads';

// loaded through tsx's CommonJS hook, as the main thread loads it
const code = `require('tsx/cjs'); require(${JSON.stringify(path.join(__dirname, 'child.ts'))})`
const worker = new Worker(code, { eval: true, workerData: { set: process.argv[2] } })
worker.once('message', (results) => {
  process.stdout.write(JSON.stringify(results))
  worker.terminate()
})
worker.once('error', (err) => {
  console.error(err)
  process.exit(1)
})
