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

/* global expect, describe, it, before, after */

import Aerospike, { AerospikeRecord, AerospikeError as ASError, Client as Cli, Key, UDF, ApplyPolicyOptions, status} from 'aerospike';
import * as helper from './test_helper';
import { expect, assert } from 'chai'; 

const AerospikeError: typeof ASError = Aerospike.AerospikeError

const keygen = helper.keygen

describe('client.apply()', function () {
  const client: Cli = helper.client
  const key: Key = keygen.string(helper.namespace, helper.set, { prefix: 'test/apply/' })()

  before(() => helper.udf.register('udf.lua')
    .then(() => client.put(key, { foo: 'bar' }, { ttl: 1000 })))

  after(() => helper.udf.remove('udf.lua')
    .then(() => client.remove(key)))

  it('should invoke an UDF to without any args', function (done) {
    const udfArgs: UDF= { module: 'udf', funcname: 'withoutArguments' }
    client.apply(key, udfArgs, function (error?: Error, result?: AerospikeRecord) {
      if (error) throw error
      expect(result).to.equal(1)
      done()
    })
  })

  it('should invoke an UDF with arguments', function (done) {
    const udfArgs: UDF = { module: 'udf', funcname: 'withArguments', args: [42] }
    client.apply(key, udfArgs, function (error?: Error, result?: AerospikeRecord) {
      if (error) throw error
      expect(result).to.equal(42)
      done()
    })
  })

  context('with ApplyPolicy', function () {
    it('onLockingOnly should fail when writing to a locked record', async function () {
      let mrt: any = new Aerospike.Transaction()

      const policy: ApplyPolicyOptions = new Aerospike.ApplyPolicy({
        totalTimeout: 1500,
        onLockingOnly: true,
        txn: mrt
      })

      const udf: UDF = {
        module: 'udf',
        funcname: 'updateRecord',
        args: ['example', 45]
      }

      await client.apply(key, udf, policy)
      try{
        await client.apply(key, udf, policy)
        assert.fail('An error should have been caught')
      }
      catch(error: any){
        expect(error).to.be.instanceof(AerospikeError).with.property('code', status.MRT_ALREADY_LOCKED)
        let result = await client.get(key)
        expect(result.bins).to.eql({foo: 'bar'})
      }
      finally{
        await client.abort(mrt)
      }
    })
  })

  it('should invoke an UDF with apply policy', function (done) {
    const policy: ApplyPolicyOptions = new Aerospike.ApplyPolicy({
      totalTimeout: 1500
    })
    const udf: UDF = {
      module: 'udf',
      funcname: 'withArguments',
      args: [[1, 2, 3]]
    }

    client.apply(key, udf, policy, function (error?: Error, result?: AerospikeRecord) {
      if (error) throw error
      expect(result).to.eql([1, 2, 3])
      done()
    })
  })

  it('should return an error if the user-defined function does not exist', function (done) {
    const udfArgs: UDF = { module: 'udf', funcname: 'not-such-function' }
    client.apply(key, udfArgs, function (error?: Error, result?: AerospikeRecord) {
      expect(error).to.be.instanceof(AerospikeError).with.property('code', Aerospike.status.ERR_UDF)
      done()
    })
  })
  /*
  it('should return an error if the UDF arguments are invalid', function (done) {
    const udfArgs = { module: 'udf', funcname: 'noop', args: 42 } // args should always be an array
    client.apply(key, udfArgs, function (error?: Error, result?: AerospikeRecord) {
      expect(error).to.be.instanceof(AerospikeError).with.property('code', Aerospike.status.ERR_PARAM)
      done()
    })
  })
  */
  it('should return a Promise that resolves to the return value of the UDF function', function () {
    const udfArgs: UDF = { module: 'udf', funcname: 'withoutArguments' }

    return client.apply(key, udfArgs)
      .then(result => expect(result).to.equal(1))
  })
})
