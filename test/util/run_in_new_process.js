// *****************************************************************************
// Copyright 2013-2020 Aerospike, Inc.
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

const childProcess = require('child_process')
const tmp = require('tmp')
const fs = require('fs')

function generateTestSource (fn, data) {
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

function createTempFile (fn, data) {
  const source = generateTestSource(fn, data)
  const temp = tmp.fileSync({ postfix: '.js' })
  fs.writeSync(temp.fd, source)
  return temp.name
}

function forkAndRun (fn, env, data) {
  const temp = createTempFile(fn, data)
  return childProcess.fork(temp, { env })
}

module.exports = function runInNewProcess (fn, env, data) {
  return new Promise((resolve, reject) => {
    const child = forkAndRun(fn, env, data)
    child.on('message', message => {
      child.disconnect()
      if (message.error) {
        reject(new Error(message.error))
      } else {
        resolve(message.result)
      }
    })
    child.on('error', error =>
      console.error('Error for PID %s: %s', child.pid, error.message))
  })
}
