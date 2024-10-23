// *****************************************************************************
// Copyright 2013-2024 Aerospike, Inc.
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

import * as childProcess from 'child_process';
import { ChildProcess } from 'child_process';
import tmp from 'tmp';
import fs from 'fs';

function generateTestSource (fn: Function, data: any) {
  return `
  'use strict'
  const Aerospike = require(process.cwd())
  const fn = ${fn.toString()}
  const data = JSON.parse(\`${JSON.stringify(data)}\`)
  const report = (result) => new Promise((resolve) => process.send(result, resolve))

  ;(async () => {
    try {
      const result = await fn(Aerospike, data)
      await report({ result })
    } catch (error) {
      await report({ error })
    }
    process.exit()
  })()
`
}

function createTempFile(fn: Function, data: any): string {
  const source: string = generateTestSource(fn, data)
  const temp: tmp.FileResult = tmp.fileSync({ postfix: '.js' })
  fs.writeSync(temp.fd, source)
  return temp.name
}

function forkAndRun(fn: Function, env: NodeJS.ProcessEnv, data: any): ChildProcess {
  const temp: string = createTempFile(fn, data)
  return childProcess.fork(temp, { env })
}

export function runInNewProcessFn<T>(fn: Function, env: NodeJS.ProcessEnv, data: any): Promise<T> {
  return new Promise((resolve, reject) => {
    const child: ChildProcess = forkAndRun(fn, env, data)
    child.on('message', (message: { error?: string, result?: T }) => {
      child.disconnect()
      if (message.error) {
        reject(new Error(message.error))
      } else {
        resolve(message.result as T)
      }
    });
    child.on('error', (error: Error) =>
      console.error('Error for PID %s: %s', child.pid, error.message))
  });
}
