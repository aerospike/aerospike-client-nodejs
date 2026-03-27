
// *****************************************************************************
// Copyright 2013-2025 Aerospike, Inc.
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


/**
 * NODE CLOSE IMPLEMENT ELSEWHERE
 * 
 * Add delays to negative testing
 * 
 */
import Aerospike, { Client as Cli, policy, Key, Query, AerospikeRecord, AerospikeError as ASError, Config, ConfigOptions} from '../../lib/aerospike';

const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

import { expect, assert } from 'chai';

import * as helper from './test_helper';

import * as fs from 'fs';

async function abort_until_circuit_breaker_flips(query: any, iterations: any) {
  let error_result: any = null;
  let i = 0;
  for (i; i < 400; i++) {
      let stream: any = query.foreach(null, undefined, (error: any) => { error_result = error })
      stream.abort()
      await new Promise(resolve => setTimeout(resolve, 40))
      if(error_result){
        break 
      }

  }

  expect(error_result.code).to.eql(Aerospike.status.MAX_ERROR_RATE)


  expect(i).to.be.at.least(iterations + 1)
  expect(i).to.be.at.most(iterations + 3)
}




describe('Circuit breaker functionality', function () {
  this.timeout(40000)
  const client: Cli = helper.client
  const key: Key = new Aerospike.Key(helper.namespace, helper.set, 'circuit_breaker/1')


  const base_config: any = {
    hosts: helper.config.hosts,
    user: helper.config.user,
    password: helper.config.password
  }

  before(async function () {

    const key: Key = new Aerospike.Key(helper.namespace, helper.set, "example")
    const record: any = {eddie: 'ballast'}

    await client.put(key, record)

  });



    context('errorRateWindow and maxErrorRate', function () {
      it('sets errorRateWindow and maxErrorRate to specified value', async function () {
        let dummyClient: any = null
        try{
          let config = base_config
          config.maxErrorRate = 40
          config.errorRateWindow = 40
        
          dummyClient = await Aerospike.connect(config)

          const query: Query = dummyClient.query(helper.namespace, helper.set)


          await abort_until_circuit_breaker_flips(query, 40)

          await new Promise(resolve => setTimeout(resolve, 6000))
          try{
            await dummyClient.put(key, {'fakeRecord': 'shouldFail'})
          }
          catch(error: any){
            expect(error.code).to.eql(Aerospike.status.MAX_ERROR_RATE)
          }
        }
        finally{
          if(dummyClient){
            await new Promise(resolve => setTimeout(resolve, 3000))
            await dummyClient.close()
          }
        }


      })
    })

    it('Uses defaults if maxErrorRate/errorRateWindow > 100', async function () {  
      let dummyClient: any = null
      try{

        let config = base_config
        config.maxErrorRate = 400
        config.errorRateWindow = 1

        config.tenderInterval = 10000

        dummyClient = await Aerospike.connect(config)

        const query: Query = dummyClient.query(helper.namespace, helper.set)

        await abort_until_circuit_breaker_flips(query, 100)


        await new Promise(resolve => setTimeout(resolve, 2000))

      }
      finally{
        if(dummyClient){
          await new Promise(resolve => setTimeout(resolve, 3000))
          await dummyClient.close()

        }
      }

    })

    it('Uses defaults if maxErrorRate/errorRateWindow < 1', async function () {  
      let dummyClient: any = null
      try{

        let config = base_config
        config.maxErrorRate = 2
        config.errorRateWindow = 1000

        config.tenderInterval = 10000

        dummyClient = await Aerospike.connect(config)

        const query: Query = dummyClient.query(helper.namespace, helper.set)

        await abort_until_circuit_breaker_flips(query, 100)

        await new Promise(resolve => setTimeout(resolve, 2000))

      }
      finally{
        if(dummyClient){
          await new Promise(resolve => setTimeout(resolve, 3000))
          await dummyClient.close()
        }
      }

    })

    it('can trigger circuit breaker', async function () {  
      let dummyClient: any = null
      try{

        let config = base_config


        config.tenderInterval = 10000

        dummyClient = await Aerospike.connect(config)

        const query: Query = dummyClient.query(helper.namespace, helper.set)

        await abort_until_circuit_breaker_flips(query, 100)
      }
      finally{
        if(dummyClient){
        await new Promise(resolve => setTimeout(resolve, 3000))
        await dummyClient.close()

        }
      }

    })

    it('can trigger progressive backoff', async function () {  
      let dummyClient: any = null
      try{

        let config = base_config
        config.maxErrorRate = 32
        config.errorRateWindow = 1

        config.tenderInterval = 1500

        dummyClient = await Aerospike.connect(config)

        const query: Query = dummyClient.query(helper.namespace, helper.set)

        await abort_until_circuit_breaker_flips(query, 32)
        
        await new Promise(resolve => setTimeout(resolve, 220))

        await abort_until_circuit_breaker_flips(query, 16)

        await new Promise(resolve => setTimeout(resolve, 860))

        await abort_until_circuit_breaker_flips(query, 8)

        await new Promise(resolve => setTimeout(resolve, 1120))

        await abort_until_circuit_breaker_flips(query, 4)

        await new Promise(resolve => setTimeout(resolve, 1360))

        await abort_until_circuit_breaker_flips(query, 2)
      }
      finally{
        if(dummyClient){
          await new Promise(resolve => setTimeout(resolve, 3000))
          await dummyClient.close()
        }
      }

      


    })

  context('Negative Tests', function () { 
    context('maxErrorRate', function () {
      it('uses defaults when maxErrorRate is not a number', async function () {


        let config = base_config
        config.maxErrorRate = 'a' as any

        let dummyClient = await Aerospike.connect(config)
        try{
          expect(dummyClient.config.maxErrorRate).to.eql(undefined)
        }
        finally{
          await dummyClient.close()
        }
        

      })
    })

    context('errorRateWindow', function () {
      it('uses defaults when maxErrorRate is not a number', async function () {


        let config = base_config
        config.errorRateWindow = 'a' as any

        let dummyClient = await Aerospike.connect(config)
        try{
          expect(dummyClient.config.errorRateWindow).to.eql(undefined)
        }
        finally{
          await dummyClient.close()

        }
        

      })
    })

  })

  context('Typescript Tests', function () { 
    context('Config', function () {
      context('maxErrorRate', function () {
        it('compiles Config with maxErrorRate', async function () {
          const config: Config = new Aerospike.Config({
            maxErrorRate: 1
          })
        
        })

        it('compiles Config with maxErrorRate', async function () {
          const config: ConfigOptions = new Aerospike.Config({
            maxErrorRate: 1
          })
        
        })

      })

      context('errorRateWindow', function () {
        it('compiles Config with errorRateWindow', async function () {
          const config: Config = new Aerospike.Config({
            errorRateWindow: 1
          })
        
        })

        it('compiles Config with errorRateWindow', async function () {

          const config: ConfigOptions = new Aerospike.Config({
            errorRateWindow: 1
          })
          
        })
      })

    })   
  })
})
