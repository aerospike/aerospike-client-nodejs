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

/* global expect, describe, it */

import Aerospike, { Client } from 'aerospike';

import { expect } from 'chai'; 
import * as helper from './test_helper';
let client: Client
describe('Aerospike', function () {
  describe('Aerospike.client() #noserver', function () {
    it('instantiates a new client instance', function (done) {
      client = Aerospike.client(helper.config)
      expect(client).to.be.instanceof(Aerospike.Client)
      done()
    })
  })

  describe('Aerospike.connect()', function () {
    it('instantiates a new client instance and connects to the cluster', function (done) {
      Aerospike.connect(helper.config, (error?: Error, client?) => {
        if (error) throw error
        expect(client).to.be.instanceof(Aerospike.Client)
        client?.infoAny((err?: Error) => {
          if (err) throw err
          client.close(false)
          done()
        })
      })
    })

    it('returns a Promise that resolves to a client', function () {
      return Aerospike.connect(helper.config)
        .then(client => {
          expect(client).to.be.instanceof(Aerospike.Client)
          return client
        })
        .then(client => client.close(false))
    })
  })
})
