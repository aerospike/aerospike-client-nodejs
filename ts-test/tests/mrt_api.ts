// *****************************************************************************
// Copyright 2013-2023 Aerospike, Inc.
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

/* eslint-env mocha */
/* global expect */

import Aerospike, { Key as K, RecordMetadata, status as statusModule, AerospikeRecord, Client as Cli, WritePolicyOptions, AerospikeError, Transaction, _transactionPool} from 'aerospike';

import { expect, assert } from 'chai'; 
import * as helper from './test_helper';

const keygen: any = helper.keygen
const metagen: any = helper.metagen
const recgen: any = helper.recgen

const status: typeof statusModule = Aerospike.status

describe('MRT API Tests', function () {
  helper.skipUnlessVersionAndEnterprise('>= 8.0.0', this)
  
  context('Test the MRT specific API', function () { 
    const client: Cli = helper.client

    it('Reaps completed transactions', async function () {

      for (let i = 0; i < 129; i++) {
        let mrt: Transaction = new Aerospike.Transaction()
        await client.abort(mrt)
      }
      
      // await new Promise(r => setTimeout(r, 1000));
      
      let pool: any = _transactionPool

      expect(pool.getLength()).to.be.lessThan(10);




    })

    it('should initialize a transaction', async function () {
      let mrt: any = new Aerospike.Transaction()

      let id: number = mrt.getId()
      expect(id).to.be.a('number')

      let timeout: number = mrt.getTimeout()
      expect(timeout).to.be.a('number')

      let state: number = mrt.getState()
      expect(state).to.be.a('number')

      let inDoubt: boolean = mrt.getInDoubt()
      expect(state).to.be.a('number')
    })

    context('transaction getters', function () {

      it('transaction.getId before and after transaction completion', async function () {
        let mrt: any = new Aerospike.Transaction()

        expect(mrt.getId()).to.be.a('number')

        let result: number = await client.abort(mrt)

        expect(mrt.getId()).to.be.a('number')

      })

      it('transaction.getInDoubt before and after transaction completion', async function () {
        let mrt: any = new Aerospike.Transaction()

        expect(mrt.getInDoubt()).to.be.a('boolean')

        let result: number = await client.abort(mrt)

        expect(mrt.getInDoubt()).to.be.a('boolean')

      })

      it('transaction.getTimeout before and after transaction completion', async function () {
        let mrt: any = new Aerospike.Transaction()

        expect(mrt.getTimeout()).to.be.a('number')

        let result: number = await client.abort(mrt)

        expect(mrt.getTimeout()).to.be.a('number')

      })

      it('transaction.getState before and after transaction completion', async function () {
        let mrt: any = new Aerospike.Transaction()

        expect(mrt.getState()).to.be.a('number')

        let result: number = await client.abort(mrt)

        expect(mrt.getState()).to.be.a('number')


      })
    })

    context('transaction.abortStatus', function () {
      it('OK', async function () {
        expect(Aerospike.Transaction.abortStatus.OK).to.equal(0)
      })
      it('ALREADY_ABORTED', async function () {
        expect(Aerospike.Transaction.abortStatus.ALREADY_ABORTED).to.equal(1)
      })
      it('ROLL_BACK_ABANDONED', async function () {
        expect(Aerospike.Transaction.abortStatus.ROLL_BACK_ABANDONED).to.equal(3)
      })
      it('CLOSE_ABANDONED', async function () {
        expect(Aerospike.Transaction.abortStatus.CLOSE_ABANDONED).to.equal(4)
      })

    })

     context('transaction.commitStatus', function () {
      it('OK', async function () {
        expect(Aerospike.Transaction.commitStatus.OK).to.equal(0)
      })
      it('ALREADY_COMMITTED', async function () {
        expect(Aerospike.Transaction.commitStatus.ALREADY_COMMITTED).to.equal(1)
      })
      it('VERIFY_FAILED', async function () {
        expect(Aerospike.Transaction.commitStatus.VERIFY_FAILED).to.equal(3)
      })
      it('MARK_ROLL_FORWARD_ABANDONED', async function () {
        expect(Aerospike.Transaction.commitStatus.MARK_ROLL_FORWARD_ABANDONED).to.equal(4)
      })
      it('ROLL_FORWARD_ABANDONED', async function () {
        expect(Aerospike.Transaction.commitStatus.ROLL_FORWARD_ABANDONED).to.equal(5)
      })
      it('CLOSE_ABANDONED', async function () {
        expect(Aerospike.Transaction.commitStatus.CLOSE_ABANDONED).to.equal(6)
      })

    })

    it('should fail with readsCapacity error string', function () {
      expect(() => new Aerospike.Transaction("256" as any, 256)).to.throw('Must specify a number for readsCapacity');


    })

    it('should fail with writesCapacity error string', function () {
      expect(() => new Aerospike.Transaction(256, "256" as any)).to.throw('Must specify a number for writesCapacity');


    })

    it('should fail with readsCapacity range error string', function () {
      expect(() => new Aerospike.Transaction( 2**32, 256)).to.throw('readsCapacity is out of uint32 range');

    })

    it('should fail with writesCapacity range error string', function () {
      expect(() => new Aerospike.Transaction( 256, 2**32)).to.throw('writesCapacity is out of uint32 range');
    })

    it('should fail with readsCapacity and writesCapacity range error string', function () {
      expect(() => new Aerospike.Transaction( 2**32, 2**32)).to.throw('both readsCapacity and writesCapacity are out of uint32 range');
    })

    it('Should fail an abort with no arguments', async function () {
      try{
        let result: number = await (client as any).abort();
      }
      catch(error){
        return
      }

      assert.fail('An error should have been caught')
    })

    it('Should fail an commit with no arguments', async function () {
      try{
        let result: number = await (client as any).commit();
      }
      catch(error){
        return
      }

      assert.fail('An error should have been caught')
    })
    it('Should fail an abort with incorrect arguments', async function () {
      try{
        let result: number = await (client as any).abort("random_string");
      }
      catch(error: any){
        expect(error.code).to.eql(Aerospike.status.ERR_CLIENT)

        return
      }

      assert.fail('An error should have been caught')
    })

    it('Should fail an commit with incorrect arguments', async function () {
      try{
        let result: number = await (client as any).commit("random_string");
      }
      catch(error: any){
        expect(error.code).to.eql(Aerospike.status.ERR_CLIENT)
        return
      }

      assert.fail('An error should have been caught')
    })

    it('Hits the capacity limit', async function () {
      let mrt: Transaction = new Aerospike.Transaction(4096, 4096);
      try{
        for (let i = 0; i < 150; i++) {
          new Aerospike.Transaction(4096, 4096)

        }
        assert.fail('An error should have been caught')

      }
      catch(error: any){
        expect(error.message).to.eql("Maximum capacity for Multi-record transactions has been reached. Avoid setting readsCapacity and writesCapacity too high, and abort/commit open transactions so memory can be cleaned up and reused.")
        mrt.destroyAll()
      }

      try{
        client.abort(mrt)
        assert.fail('An error should have been caught')

      }
      catch(error: any) {
        expect(error.message).to.eql("The object has been destroyed, please create a new transaction.")
      }

      mrt = new Aerospike.Transaction(4096, 4096);

    })

    it('Expands the pool size', async function () {

      for (let i = 0; i < 150; i++) {
        let mrt: Transaction = new Aerospike.Transaction()
      }

      let pool: any = _transactionPool
      pool.tendTransactions()
      expect(pool.getLength()).to.be.greaterThan(140);
      expect(pool.getCapacity()).to.eql(256)
    })
  })
})