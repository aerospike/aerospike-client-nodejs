// *****************************************************************************
// Copyright 2013-2018 Aerospike, Inc.
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

function generateTestSource (fn, timeout) {
  return `'use strict'
  const Aerospike = require(process.cwd())
  let fn = ${fn.toString()}
  let finish = (msg) => process.send(msg, () => process.exit())
  try {
    fn(Aerospike, result => finish({ result: result }))
  } catch (error) {
    finish({ error: error })
  }`
}

function createTempFile (fn, timeout) {
  let source = generateTestSource(fn, timeout)
  let temp = tmp.fileSync({ postfix: '.js' })
  fs.writeSync(temp.fd, source)
  return temp.name
}

function forkAndRun (fn, timeout, env) {
  let temp = createTempFile(fn, timeout)
  return childProcess.fork(temp, { env: env })
}

module.exports = function runInNewProcess (fn, timeout, env) {
  return new Promise((resolve, reject) => {
    let child = forkAndRun(fn, timeout, env)
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
