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

/* global describe, it */
/* eslint-disable no-unused-expressions */

import type { Client as Cli, ConfigOptions, Config as Conf } from '../../lib/aerospike.js';

import { expect } from 'chai';
import * as Aerospike from '../../lib/aerospike.js';
import * as helper from '../test_helper.ts';
import { mappedSeedConfig, UNRESOLVABLE_SEED } from './helpers.ts';

const Config = Aerospike.Config
const native = require('../../lib/native.js')

// Multi-node, TLS and alternate-address cases are in ip_map_cluster.ts (local only).

describe('ipMap #noserver', function () {
  describe('Config', function () {
    it('copies the ipMap', function () {
      const ipMap = { '10.0.0.5': 'gw.example.com', '10.0.0.6': 'gw2.example.com' }
      const config: Conf = new Config({ ipMap })
      expect(config.ipMap).to.eql(ipMap)
    })

    it('leaves ipMap unset by default', function () {
      const config: Conf = new Config()
      expect(config).to.not.have.property('ipMap')
    })

    it('treats a null ipMap as unset', function () {
      const config: Conf = new Config({ ipMap: null } as any)
      expect(config).to.not.have.property('ipMap')
    })

    it('names the bad entry in the error', function () {
      expect(() => new Config({ ipMap: { '10.0.0.5': 'gw', '10.0.0.6': 7 } } as any))
        .to.throw(TypeError, 'ipMap entry "10.0.0.6" must map a non-empty host to a non-empty host string')
    })
  })

  // These clients never connect, so they aren't closed: close() on a client that
  // never connected throws when no client has set up the event loop yet.
  describe('Client', function () {
    it('accepts a valid ipMap', function () {
      const client = Aerospike.client({ ipMap: { '10.0.0.5': 'gw.example.com' } })
      expect(client).to.be.instanceof(Aerospike.Client)
    })

    it('accepts an empty ipMap', function () {
      const client = Aerospike.client({ ipMap: {} })
      expect(client).to.be.instanceof(Aerospike.Client)
    })

    it('accepts a null ipMap', function () {
      const client = Aerospike.client({ ipMap: null } as any)
      expect(client).to.be.instanceof(Aerospike.Client)
    })

    it('accepts several entries, including IPv6 addresses', function () {
      const client = Aerospike.client({
        ipMap: {
          '10.0.0.5': 'gw.example.com',
          '::1': 'gw6.example.com',
          'fe80::1': '[2001:db8::1]'
        }
      })
      expect(client).to.be.instanceof(Aerospike.Client)
    })

    it('keeps ipMap when given a Config instance', function () {
      const ipMap = { '10.0.0.5': 'gw.example.com' }
      const client = Aerospike.client(new Config({ ipMap }))
      expect(client.config.ipMap).to.eql(ipMap)
    })

    it('fails to connect when the seed has no matching ipMap key, then closes twice safely', async function () {
      const client = Aerospike.client({
        hosts: [{ addr: UNRESOLVABLE_SEED, port: 3000 }],
        ipMap: { 'other-seed.invalid': '127.0.0.1' },
        log: { level: Aerospike.log.OFF }
      })
      let error: any = null
      try {
        await client.connect()
      } catch (err) {
        error = err
      }
      expect(error).to.be.instanceof(Aerospike.AerospikeError)
      // connect() already closed the native client.
      client.close()
      client.close()
    })
  })

  describe('invalid values', function () {
    const invalid: Array<[string, any]> = [
      ['a string', 'gw.example.com'],
      ['an array', ['10.0.0.5', 'gw.example.com']],
      ['a non-string value', { '10.0.0.5': 3000 }],
      ['an empty value', { '10.0.0.5': '' }],
      ['an empty key', { '': 'gw.example.com' }],
      ['a bad entry after valid ones', { '10.0.0.5': 'gw.example.com', '10.0.0.6': 'gw2.example.com', '10.0.0.7': 7 }]
    ]

    invalid.forEach(([name, ipMap]) => {
      it(`rejects ${name} with a TypeError naming ipMap`, function () {
        expect(() => new Config({ ipMap } as ConfigOptions)).to.throw(TypeError, /ipMap/)
        expect(() => Aerospike.client({ ipMap } as ConfigOptions)).to.throw(TypeError, /ipMap/)
      })

      // The native layer checks again, for callers that skip Config. It returns
      // null for an invalid config, which Client turns into an AerospikeError.
      it(`rejects ${name} in the native layer too`, function () {
        expect(native.client({ hosts: 'localhost:3000', ipMap })).to.be.null
      })
    })

    it('accepts a null ipMap in the native layer', function () {
      expect(native.client({ hosts: 'localhost:3000', ipMap: null })).to.not.be.null
    })

    // appId is read after ipMap, so the map is already built when appId fails
    // and must be freed on the error path.
    it('rejects a later invalid option after building a valid ipMap', function () {
      const config = { hosts: 'localhost:3000', ipMap: { '10.0.0.5': 'gw.example.com' }, appId: 123 }
      expect(native.client(config)).to.be.null
      expect(() => Aerospike.client(config as any)).to.throw(Aerospike.AerospikeError, 'Invalid client configuration')
    })

    it('accepts a valid ipMap in the native layer', function () {
      // Not closed: native close() before connect() crashes in
      // events_callback_close() (src/main/events.cc), an existing bug.
      const client = native.client({ hosts: 'localhost:3000', ipMap: { '10.0.0.5': 'gw.example.com' } })
      expect(client).to.not.be.null
    })
  })
})

describe('ipMap', function () {
  describe('connecting through the seed', function () {
    it('connects through a seed that only resolves via ipMap', async function () {
      const config = mappedSeedConfig()
      if (!config) return this.skip()
      const client: Cli = await Aerospike.connect(config)
      try {
        expect(client.isConnected()).to.be.true
      } finally {
        client.close()
      }
    })

    it('connects normally when no ipMap key matches the seed', async function () {
      const config: ConfigOptions = Object.assign({}, helper.config, {
        ipMap: { 'unrelated-host.invalid': 'other-host.invalid' }
      })
      const client: Cli = await Aerospike.connect(config)
      try {
        expect(client.isConnected()).to.be.true
      } finally {
        client.close()
      }
    })

    it('runs commands through an ipMap-mapped seed, and closes twice safely', async function () {
      const options = mappedSeedConfig()
      if (!options) return this.skip()
      const client: Cli = await Aerospike.connect(new Config(options))
      const key = new Aerospike.Key(helper.namespace, helper.set, 'ip-map-test')
      try {
        await client.put(key, { v: 1 })
        const record = await client.get(key)
        expect(record.bins.v).to.equal(1)
        await client.remove(key)
      } finally {
        client.close()
        client.close()
      }
      expect(client.isConnected()).to.be.false
    })
  })
})
