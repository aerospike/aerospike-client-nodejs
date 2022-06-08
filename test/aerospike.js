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

/* global expect, describe, it */

const Aerospike = require('../lib/aerospike')
const helper = require('./test_helper')

describe('Aerospike', function () {
  describe('Aerospike.client() #noserver', function () {
    it('instantiates a new client instance', function (done) {
      const client = Aerospike.client(helper.config)
      expect(client).to.be.instanceof(Aerospike.Client)
      done()
    })
  })

  describe('Aerospike.connect()', function () {
    it('instantiates a new client instance and connects to the cluster', function (done) {
      Aerospike.connect(helper.config, (error, client) => {
        if (error) throw error
        expect(client).to.be.instanceof(Aerospike.Client)
        client.infoAny(error => {
          if (error) throw error
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
