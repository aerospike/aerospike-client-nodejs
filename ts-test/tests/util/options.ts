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

import * as Aerospike from 'aerospike';

import { ConfigOptions, Host, TLSInfo, BasePolicyOptions } from 'aerospike';

import yargs, {Argv} from 'yargs';
import { hideBin } from 'yargs/helpers';


import * as fs from 'fs'; // semver is likely the default export, but it may have named exports as well
import * as path from 'path'; // semver is likely the default export, but it may have named exports as well

// *****************************************************************************
//  Options parsing
// *****************************************************************************

const parser: yargs.Argv = yargs(hideBin(process.argv))
  .usage('$0 [options]')
  .options({
    help: {
      type: 'boolean',
      describe: 'Display this message.'
    },
    host: {
      alias: 'h',
      type: 'string',
      default: null,
      describe: 'Aerospike database address.'
    },
    port: {
      alias: 'p',
      type: 'number',
      default: null,
      describe: 'Aerospike database port.'
    },
    totalTimeout: {
      alias: 't',
      type: 'number',
      default: 1000,
      describe: 'Timeout in milliseconds.'
    },
    log: {
      alias: 'l',
      type: 'number',
      default: Aerospike.log.WARN,
      describe: 'Log level [0-5]'
    },
    log_file: {
      alias: 'f',
      type: 'number',
      default: fs.openSync('test.log', 'a'),
      describe: 'Log file to redirect the log messages'
    },
    namespace: {
      alias: 'n',
      type: 'string',
      default: 'test',
      describe: 'Namespace for the keys.'
    },
    set: {
      alias: 's',
      type: 'string',
      default: 'demo',
      describe: 'Set for the keys.'
    },
    user: {
      alias: 'U',
      type: 'string',
      default: null,
      describe: 'Username to connect to a secure cluster'
    },
    password: {
      alias: 'P',
      type: 'string',
      default: null,
      describe: 'Password to connect to a secure cluster'
    },
    clusterName: {
      type: 'string',
      describe: 'Name of the cluster to join'
    },
    cafile: {
      type: 'string',
      describe: 'Path to a trusted CA certificate file'
    },
    keyfile: {
      type: 'string',
      describe: 'Path to the client\'s key for mutual auth'
    },
    keyfilePassword: {
      type: 'string',
      describe: 'Decryption password for the client\'s key file'
    },
    certfile: {
      type: 'string',
      describe: 'Path to the client\'s certificate chain file for mutual auth'
    },
    auth: {
      type: 'number',
      describe: 'Specify client authentication mode'
    },
    testMetrics: {
      type: 'boolean',
      describe: 'Specify whether or not to run advanced testing.'
    },
    testPreferRack: {
      type: 'boolean',
      describe: 'Specify whether or not to run advanced testing. Requires two datacenter XDR configuration.'
    }
  });


let options: any
if (process.env.OPTIONS) {
  const rawOptions: string[] = process.env.OPTIONS.trim().split(' ')
  options = parser.parse(options)
} else {
  options = parser.argv
}

if (options.help === true) {
  parser.showHelp()
  process.exit(0)
}

// enable debug stacktraces
process.env.AEROSPIKE_DEBUG_STACKTRACES = process.env.AEROSPIKE_DEBUG_STACKTRACES || 'true'

function testDir (): string {
  return path.resolve( __dirname , '..');
}

options.getConfig = function (): ConfigOptions {
  const defaultPolicy: BasePolicyOptions = {
    totalTimeout: options.totalTimeout,
    maxRetries: 6
  }
  const config = {
    log: {
      level: options.log,
      file: options.log_file
    },
    policies: {
      apply: defaultPolicy,
      batch: defaultPolicy,
      info: defaultPolicy,
      operate: defaultPolicy,
      query: defaultPolicy,
      read: defaultPolicy,
      remove: defaultPolicy,
      scan: defaultPolicy,
      write: defaultPolicy
    },
    modlua: {
      userPath: testDir()
    }
  } as any;

  if (options.host !== null) {
    const host = {
      addr: options.host,
      port: options.port || 3000,
    } as Host;
    config.hosts = [host]
  } else if (process.env.AEROSPIKE_HOSTS) {
    config.hosts = process.env.AEROSPIKE_HOSTS
  }

  if (options.user !== null) {
    config.user = options.user
  }
  if (options.password !== null) {
    config.password = options.password
  }

  if (options.clusterName) {
    config.clusterName = options.clusterName
  }

  if (options.cafile) {
    config.tls = {
      enable: true,
      cafile: options.cafile,
      certfile: options.certfile,
      keyfile: options.keyfile,
      keyfilePassword: options.keyfilePassword
    } as TLSInfo;
  }

  if (options.auth) {
    config.authMode = options.auth
  }
  // Disable maxErrorRate
  config.maxErrorRate = 0
  return config
}

export default options;