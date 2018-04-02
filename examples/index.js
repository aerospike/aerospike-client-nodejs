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

const Aerospike = require('aerospike')
const path = require('path')
const yargs = require('yargs')

const VERSION = require('../package.json')['version']
const commands = [ 'get', 'put' ]

const argv = yargs
  .usage('To run one of the provided examples, execute `node . <example>`. To get more help for a specific example, execute `node . <example> --help`')
  .option('quiet', {
    alias: 'q',
    describe: 'Do not display content',
    boolean: true
  })

  //================================================================
  // 'Connection' options
  //================================================================
  .option('hosts', {
    alias: 'h',
    describe: 'List of cluster seed hosts',
    group: 'Connect:',
    default: 'localhost'
  })
  .option('port', {
    alias: 'p',
    describe: 'Default port number',
    group: 'Connect:',
    default: 3000
  })
  .option('user', {
    alias: 'u',
    describe: 'Username to connect to secured cluster',
    group: 'Connect:',
  })
  .option('password', {
    alias: 'P',
    describe: 'Password to connect to secured clsuter',
    group: 'Connect:',
  })
  .option('timeout', {
    alias: 't',
    describe: 'Timeout in milliseconds',
    group: 'Connect:',
    default: 1000
  })

  //================================================================
  // 'Database' options
  //================================================================
  .option('namespace', {
    alias: 'n',
    describe: 'Aerospike database namespace for the keys',
    group: 'Database:',
    default: 'test'
  })
  .option('set', {
    alias: 's',
    describe: 'Aerospike set name for the keys',
    group: 'Database:',
    default: 'demo'
  })

  //================================================================
  // 'Debug' options
  //================================================================
  .option('verbose', {
    alias: 'v',
    describe: 'Enable more verbose logging',
    count: true
  })
  .option('debugStacktraces', {
    describe: 'Enable more informative stacktraces in case of an error',
    default: true
  })

  .commandDir('./', {
    include: filename => commands.some(cmd => cmd === path.basename(filename, '.js'))
  })
  .demandCommand()
  .strict(true)
  .help()
  .version(VERSION)
  .env('AEROSPIKE')
  .parse()
