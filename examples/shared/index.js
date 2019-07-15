// *****************************************************************************
// Copyright 2018 Aerospike, Inc.
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

const path = require('path')

exports.cli = require('./cli')
exports.client = require('./client')
exports.random = require('./random')
exports.run = require('./run')
exports.streams = require('./streams')

// Check whether example has been executed directly or via the runner
// (./run.js); if directly, invoke the runner instead and pass the command
// line arguments.
let started = false
exports.runner = function () {
  if (started || require.main !== module.parent) {
    return
  }
  started = true

  const example = process.argv[1]
  const runner = path.join(example, '../run.js')
  const cmd = path.basename(example, '.js')

  process.argv.splice(1, 1, runner, cmd)
  delete require.cache[require.resolve(example)]

  require(runner)
}
