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

/* global expect, describe, context, it */

import Aerospike, { status as statusModule, AerospikeError as ASError, Key, Client as Cli, RemovePolicy } from 'aerospike';

import { expect } from 'chai'; 
import * as helper from './test_helper';

const keygen = helper.keygen

const status: typeof statusModule = Aerospike.status
const AerospikeError: typeof ASError = Aerospike.AerospikeError

describe('client.remove()', function () {
  const client: Cli = helper.client

  it('removes an existing record', function () {
    const key: Key = keygen.string(helper.namespace, helper.set, { prefix: 'test/remove/' })()

    return client.put(key, { str: 'abcde' })
      .then(() => client.remove(key))
      .then(() => client.exists(key))
      .then(result => expect(result).to.be.false)
  })

  it('returns an error when trying to remove a non-existing key', function () {
    const key: Key = keygen.string(helper.namespace, helper.set, { prefix: 'test/remove/' })()

    return client.remove(key)
      .catch(error =>
        expect(error).to.be.instanceof(AerospikeError).with.property('code', status.ERR_RECORD_NOT_FOUND))
  })

  context('with generation policy value', function () {
    it('should remove the record if the generation matches', function () {
      const key: Key = keygen.string(helper.namespace, helper.set, { prefix: 'test/remove/' })()
      const policy: RemovePolicy = new Aerospike.RemovePolicy({
        gen: Aerospike.policy.gen.EQ,
        generation: 1
      })

      return client.put(key, { str: 'abcde' })
        .then(() => {
          return client.remove(key, policy)
        })
        .then(() => client.exists(key))
        .then((result: boolean) => expect(result).to.be.false)
    })

    it('should not remove the record if the generation does not match', function () {
      const key: Key = keygen.string(helper.namespace, helper.set, { prefix: 'test/remove/' })()
      const policy: RemovePolicy = new Aerospike.RemovePolicy({
        gen: Aerospike.policy.gen.EQ,
        generation: 1
      })

      return client.put(key, { str: 'abcde' })
        .then(() => {
          return client.remove(key, policy)
            .catch(error =>
              expect(error).to.be.instanceof(AerospikeError).with.property('code', status.ERR_RECORD_GENERATION))
        })
        .then(() => client.exists(key))
        .then((result: boolean) => expect(result).to.be.false)
    })
  })
})
