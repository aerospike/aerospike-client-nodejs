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
/* global describe, context, it */

import Aerospike, { AerospikeError as ASError, status as statusModule, Client as Cli, Key } from 'aerospike';

import { expect } from 'chai'; 
import * as helper from './test_helper';

const keygen = helper.keygen

const status: typeof statusModule = Aerospike.status
const AerospikeError: typeof ASError = Aerospike.AerospikeError

describe('client.put(null bin)', function () {
  const client: Cli = helper.client

  context('with simple put null value', function () {
    it('delete bin using null put', function () {
      const key: Key = keygen.string(helper.namespace, helper.set, { prefix: 'test/remove_bin/' })()

      return client.put(key, { str: 'abcde' })
        .then(() => {
          client.put(key, { str: null })
            .then(() => {
              client.get(key, function (err?: ASError) {
                expect(err!).to.be.instanceof(AerospikeError).with.property('code', status.ERR_RECORD_NOT_FOUND)
              })
            })
        })
    })
  })
})
