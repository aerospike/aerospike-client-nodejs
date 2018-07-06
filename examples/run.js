#!/usr/bin/env node
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
const commands = [ 'add', 'get', 'put', 'remove', 'exists', 'operate',
  'append', 'prepend', 'info', 'select', 'sindexCreate', 'sindexRemove' ]

const squish = (str) => str.replace(/(^\ +|\ +$)/gm, '').trim()

const argv = yargs
  .usage(squish(`
    To execute one of the provided examples, run "node run <example>".
    To get more help for a specific example, run "node run <example> --help"

    Commands that take <bins>, expect one or <name>=<value> pairs, e.g. "node run put myKey s=foo i=42 f=1.69".
    `))
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

  .example(
    'put joe name=Joe age=42',
    'Creates/updates a record under the key "joe" with two bins "name" and "age".')
  .example(
    'put --update joe name=Joe age=42',
    'Updates an existing record under the key "joe"; fails if the record does not exist.')

  .commandDir('./', {
    include: filename => commands.some(cmd => cmd === path.basename(filename, '.js'))
  })
  .demandCommand()
  .strict(true)
  .help()
  .version(VERSION)
  .env('AEROSPIKE')
  .parse()
