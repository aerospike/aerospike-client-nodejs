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

/* global expect, describe, it, context */

import Aerospike, { Client, ConfigOptions, UDF, operations, Query, Scan, AerospikeRecord, ReadPolicy, WritePolicy, ApplyPolicy, OperatePolicy, RemovePolicy, BatchPolicy, QueryPolicy, ScanPolicy, InfoPolicy, Config} from '../lib/aerospike';
import * as helper from './test_helper';
import { expect, assert } from 'chai'; 

function wait (ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Error Checking functions
async function checkTimeoutError (dummyClient: Client, error: any){
  let tokens = error.message.split('=')
  let message = tokens[0] + '=' + tokens[1]
  expect(message).to.eql(`Client timeout: iterations=1 lastNode`)
  expect(error.code).to.eql(9)
}

async function checkTimeoutErrorQuery (dummyClient: Client, error: any){
  let tokens = error.message.split('.')
  let message = tokens[0] + '.' + tokens[1]
  expect(message).to.eql(`Request timed out. Can be triggered by client or server`)
  expect(error.code).to.eql(9)
}

async function checkTimeoutErrorTxnVerify (dummyClient: Client, error: any){
  let tokens = error.message.split('=')
  let message = tokens[0] + '=' + tokens[1]
  expect(message).to.eql(`Txn aborted:\nVerify failed: Client timeout: iterations=1 lastNode`)
  expect(error.code).to.eql(9)
}

// Error and connection checking functions

async function checkTimeoutErrorAndConnectionsDisable (dummyClient: Client, error: any){
  checkTimeoutError(dummyClient, error)

  await wait(300)

  let result = await dummyClient.stats()
  expect(result.nodes[0].asyncConnections.recovered).to.eql(0)
  expect(result.nodes[0].asyncConnections.aborted).to.eql(0)
}

async function checkTimeoutErrorAndConnectionsEnable (dummyClient: Client, error: any){
  checkTimeoutError(dummyClient, error)

  await wait(300)

  let result = await dummyClient.stats()
  expect(result.nodes[0].asyncConnections.recovered).to.eql(1)
  expect(result.nodes[0].asyncConnections.aborted).to.eql(0)
}

async function checkTimeoutErrorAndConnectionsAbort (dummyClient: Client, error: any){
  checkTimeoutError(dummyClient, error)

  await wait(300)

  let result = await dummyClient.stats()
  expect(result.nodes[0].asyncConnections.recovered).to.eql(0)
  expect(result.nodes[0].asyncConnections.aborted).to.eql(1)
}

async function checkTimeoutErrorAndConnectionsEnableWriteAbort(dummyClient: Client, error: any){
  checkTimeoutError(dummyClient, error)

  await wait(300)

  let result = await dummyClient.stats()
  expect(result.nodes[0].asyncConnections.recovered).to.eql(0)
  expect(result.nodes[0].asyncConnections.aborted).to.eql(1)
}

async function checkTimeoutErrorAndConnectionsInfoDisable (dummyClient: Client, error: any){
  expect(error.code).to.eql(9)

  await wait(300)


  let result = await dummyClient.stats()
  expect(result.nodes[0].syncConnections.recovered).to.eql(0)
  expect(result.nodes[0].syncConnections.aborted).to.eql(0)
}

async function checkTimeoutErrorAndConnectionsInfoEnable (dummyClient: Client, error: any){
  expect(error.code).to.eql(9)

  await wait(300)


  let result = await dummyClient.stats()

  expect(result.nodes[0].syncConnections.recovered).to.eql(1)
  expect(result.nodes[0].syncConnections.aborted).to.eql(0)
}

async function checkTimeoutErrorAndConnectionsInfoEnableAbort (dummyClient: Client, error: any){
  expect(error.code).to.eql(9)

  await wait(300)


  let result = await dummyClient.stats()

  expect(result.nodes[0].syncConnections.recovered).to.eql(0)
  expect(result.nodes[0].syncConnections.aborted).to.eql(1)
}


async function checkTimeoutErrorAndConnectionsQueryDisable (dummyClient: Client, error: any){
  checkTimeoutErrorQuery(dummyClient, error)

  await wait(300)

  let result = await dummyClient.stats()

  expect(result.nodes[0].asyncConnections.recovered).to.eql(0)
  expect(result.nodes[0].asyncConnections.aborted).to.eql(0)
}

async function checkTimeoutErrorAndConnectionsQueryEnableAbort (dummyClient: Client, error: any){
  checkTimeoutErrorQuery(dummyClient, error)

  await wait(300)

  let result = await dummyClient.stats()

  expect(result.nodes[0].asyncConnections.recovered).to.eql(0)
  expect(result.nodes[0].asyncConnections.aborted).to.be.at.least(1)
}

async function checkTimeoutErrorAndConnectionsTxnVerifyDisabled (dummyClient: Client, error: any){
  checkTimeoutErrorTxnVerify(dummyClient, error)

  await wait(300)

  let result = await dummyClient.stats()
  expect(result.nodes[0].asyncConnections.recovered).to.eql(0)
  expect(result.nodes[0].asyncConnections.aborted).to.eql(0)
}


describe('timeoutDelay', function () {

  const client: Client = helper.client



  helper.skipUnlessTimeoutDelay(this)

  before(() => helper.udf.register('udf.lua'))

  context('Positive tests', function () {
    // Standardize retries for each test
    let disableTimeoutDelayPolicy = {
      totalTimeout: 1,  
      socketTimeout: 1,
      timeoutDelay: 0,
    }

    let enableTimeoutDelayPolicy = {
      totalTimeout: 1,
      socketTimeout: 1,
      timeoutDelay: 3000,
    }

    let forceAbortPolicy = {
      totalTimeout: 1,
      socketTimeout: 1,
      timeoutDelay: 1,
    }


    let disableInfoTimeoutDelayPolicy = {
      timeout: 1,
      timeoutDelay: 0,
    }

    let enableInfoTimeoutDelayPolicy = {
      timeout: 80,
      timeoutDelay: 3000,
    }

    let enableInfoTimeoutDelayAbortPolicy = {
      timeout: 1,
      timeoutDelay: 1,
    }

    context('ReadPolicy', function () {

      let disableTimeoutDelayConfig = {
        hosts: helper.config.hosts,
        user: helper.config.user,
        password: helper.config.password,
        policies : {
          read: disableTimeoutDelayPolicy
        },
        tenderInterval: 250
      }

      let enableTimeoutDelayConfig = {
        hosts: helper.config.hosts,
        user: helper.config.user,
        password: helper.config.password,
        policies : {
          read: enableTimeoutDelayPolicy
        },
        tenderInterval: 250
      }

      it('Disables timeout delay', async function () {
        

        const dummyClient = await Aerospike.connect(disableTimeoutDelayConfig)
        await dummyClient.put(new Aerospike.Key(helper.namespace, helper.set, 'timeoutDelay/1'), {a: 1})

        try{
          await dummyClient.get(new Aerospike.Key(helper.namespace, helper.set, 'timeoutDelay/1'))
          assert.fail("client.get should throw an error")
        }
        catch(error: any){
          await checkTimeoutErrorAndConnectionsDisable(dummyClient, error)
        }
        finally{
          
          await dummyClient.close()
        }

      })

      it('Recovers socket connection during timeout delay period', async function () {

        const dummyClient = await Aerospike.connect(enableTimeoutDelayConfig)
        await dummyClient.put(new Aerospike.Key(helper.namespace, helper.set, 'timeoutDelay/1'), {a: 1})

        try{
          await dummyClient.get(new Aerospike.Key(helper.namespace, helper.set, 'timeoutDelay/1'))
          assert.fail("client.get should throw an error")
        }
        catch(error: any){
          await checkTimeoutErrorAndConnectionsEnable(dummyClient, error)
        }
        finally{
          await dummyClient.close()
        }
      })

      it('Aborts socket connection after timeout delay period', async function () {



        const dummyClient = await Aerospike.connect(enableTimeoutDelayConfig)
        await dummyClient.put(new Aerospike.Key(helper.namespace, helper.set, 'timeoutDelay/1'), {a: 1})

        try{
          await dummyClient.get(new Aerospike.Key(helper.namespace, helper.set, 'timeoutDelay/1'), forceAbortPolicy)
          assert.fail("client.get should throw an error")
        }
        catch(error: any){
          await checkTimeoutErrorAndConnectionsAbort(dummyClient, error)
        }
        finally{
          await dummyClient.close()
        }
      })

    })

    context('WritePolicy', function () {

      let disableTimeoutDelayConfig = {
        hosts: helper.config.hosts,
        user: helper.config.user,
        password: helper.config.password,
        policies : {
          write: disableTimeoutDelayPolicy
        },
        tenderInterval: 250
      }

      let enableTimeoutDelayConfig = {
        hosts: helper.config.hosts,
        user: helper.config.user,
        password: helper.config.password,
        policies : {
          write: enableTimeoutDelayPolicy
        },
        tenderInterval: 250
      }

      it('Disables timeout delay', async function () {


        const dummyClient = await Aerospike.connect(disableTimeoutDelayConfig)

        try{
          await dummyClient.put(new Aerospike.Key(helper.namespace, helper.set, 'timeoutDelay/2'), {a: 1})
          assert.fail("client.put should throw an error")
        }
        catch(error: any){
          await checkTimeoutErrorAndConnectionsDisable(dummyClient, error)
        }
        finally{
          
          await dummyClient.close()
        }
      })

      it('Fails to recover timeout', async function () {


        const dummyClient = await Aerospike.connect(enableTimeoutDelayConfig)
        try{
          await dummyClient.put(new Aerospike.Key(helper.namespace, helper.set, 'timeoutDelay/1'), {a: 1})
          assert.fail("client.put should throw an error")
        }
        catch(error: any){
          await checkTimeoutErrorAndConnectionsEnableWriteAbort(dummyClient, error)
        }
        finally{
          
          await dummyClient.close()
        }
      })
    })

    context('ApplyPolicy', function () {

      let disableTimeoutDelayConfig = {
        hosts: helper.config.hosts,
        user: helper.config.user,
        password: helper.config.password,
        policies : {
          apply: disableTimeoutDelayPolicy
        },
        tenderInterval: 250
      }

      let enableTimeoutDelayConfig = {
        hosts: helper.config.hosts,
        user: helper.config.user,
        password: helper.config.password,
        policies : {
          apply: enableTimeoutDelayPolicy
        },
        tenderInterval: 250
      }


      it('Disables timeout delay', async function () {

        const dummyClient = await Aerospike.connect(disableTimeoutDelayConfig)
        await dummyClient.put(new Aerospike.Key(helper.namespace, helper.set, 'timeoutDelay/4'), {a: 1})

        try{
          const udfArgs: UDF = { module: 'udf', funcname: 'withoutArguments' }

          await dummyClient.apply(new Aerospike.Key(helper.namespace, helper.set, 'timeoutDelay/4'), udfArgs)
          assert.fail("client.apply should throw an error")
        }
        catch(error: any){
          await checkTimeoutErrorAndConnectionsDisable(dummyClient, error)
        }
        finally{
          
          await dummyClient.close()
        }
      })

      it('Recovers socket connection during timeout delay period', async function () {

        const dummyClient = await Aerospike.connect(enableTimeoutDelayConfig)
        await dummyClient.put(new Aerospike.Key(helper.namespace, helper.set, 'timeoutDelay/4'), {a: 1})

        try{
          const udfArgs: UDF = { module: 'udf', funcname: 'withoutArguments' }

          await dummyClient.apply(new Aerospike.Key(helper.namespace, helper.set, 'timeoutDelay/4'), udfArgs)
          assert.fail("client.apply should throw an error")
        }
        catch(error: any){
          await checkTimeoutErrorAndConnectionsEnable(dummyClient, error)
        }
        finally{
          
          await dummyClient.close()
        }
      })

      it('Aborts socket connection after timeout delay period', async function () {

        const dummyClient = await Aerospike.connect(enableTimeoutDelayConfig)
        await dummyClient.put(new Aerospike.Key(helper.namespace, helper.set, 'timeoutDelay/4'), {a: 1})

        try{
          const udfArgs: UDF = { module: 'udf', funcname: 'withoutArguments' }

          await dummyClient.apply(new Aerospike.Key(helper.namespace, helper.set, 'timeoutDelay/4'), udfArgs, forceAbortPolicy)
          assert.fail("client.apply should throw an error")
        }
        catch(error: any){
          await checkTimeoutErrorAndConnectionsAbort(dummyClient, error)
        }
        finally{
          
          await dummyClient.close()
        }
      })

    })

    context('OperatePolicy', function () {

      let disableTimeoutDelayConfig = {
        hosts: helper.config.hosts,
        user: helper.config.user,
        password: helper.config.password,
        policies : {
          operate: disableTimeoutDelayPolicy
        },
        tenderInterval: 250
      }

      let enableTimeoutDelayConfig = {
        hosts: helper.config.hosts,
        user: helper.config.user,
        password: helper.config.password,
        policies : {
          operate: enableTimeoutDelayPolicy
        },
        tenderInterval: 250
      }

      it('Disables timeout delay', async function () {

        const dummyClient = await Aerospike.connect(disableTimeoutDelayConfig)
        await dummyClient.put(new Aerospike.Key(helper.namespace, helper.set, 'timeoutDelay/6'), {a: 1})

        try{
          const ops: operations.Operation[] = [
            Aerospike.operations.add('int', 432)
          ]

          await dummyClient.operate(new Aerospike.Key(helper.namespace, helper.set, 'timeoutDelay/6'), ops)
          assert.fail("client.operate should throw an error")
        }
        catch(error: any){
          await checkTimeoutErrorAndConnectionsDisable(dummyClient, error)
        
        }
        finally{
          
          await dummyClient.close()
        }
      })


      it('Recovers socket connection during timeout delay period', async function () {


        const dummyClient = await Aerospike.connect(enableTimeoutDelayConfig)
        await dummyClient.put(new Aerospike.Key(helper.namespace, helper.set, 'timeoutDelay/4'), {a: 1})

        try{
          const ops: operations.Operation[] = [
            Aerospike.operations.add('int', 432)
          ]

          await dummyClient.operate(new Aerospike.Key(helper.namespace, helper.set, 'timeoutDelay/6'), ops)
          assert.fail("client.operate should throw an error")
        }
        catch(error: any){
          await checkTimeoutErrorAndConnectionsEnable(dummyClient, error)
        }
        finally{
          
          await dummyClient.close()
        }
      })

      it('Aborts socket connection after timeout delay period', async function () {


        const dummyClient = await Aerospike.connect(enableTimeoutDelayConfig)
        await dummyClient.put(new Aerospike.Key(helper.namespace, helper.set, 'timeoutDelay/4'), {a: 1})

        try{
          const ops: operations.Operation[] = [
            Aerospike.operations.add('int', 432)
          ]

          await dummyClient.operate(new Aerospike.Key(helper.namespace, helper.set, 'timeoutDelay/6'), ops, null, forceAbortPolicy)
          assert.fail("client.operate should throw an error")
        }
        catch(error: any){
          await checkTimeoutErrorAndConnectionsAbort(dummyClient, error)
        }
        finally{
          
          await dummyClient.close()
        }
      })
    })

    context('RemovePolicy', function () {

      let disableTimeoutDelayConfig = {
        hosts: helper.config.hosts,
        user: helper.config.user,
        password: helper.config.password,
        policies : {
          remove: disableTimeoutDelayPolicy
        },
        tenderInterval: 250
      }

      let enableTimeoutDelayConfig = {
        hosts: helper.config.hosts,
        user: helper.config.user,
        password: helper.config.password,
        policies : {
          remove: enableTimeoutDelayPolicy
        },
        tenderInterval: 250
      }

      it('Disables timeout delay', async function () {

        const dummyClient = await Aerospike.connect(disableTimeoutDelayConfig)
        await dummyClient.put(new Aerospike.Key(helper.namespace, helper.set, 'timeoutDelay/6'), {a: 1})

        try{
          await dummyClient.remove(new Aerospike.Key(helper.namespace, helper.set, 'timeoutDelay/6'))
          assert.fail("client.remove should throw an error")
        }
        catch(error: any){
          await checkTimeoutErrorAndConnectionsDisable(dummyClient, error)
        }
        finally{
          
          await dummyClient.close()
        }
      })

      it('Fails to recover timeout', async function () {

        const dummyClient = await Aerospike.connect(enableTimeoutDelayConfig)
        await dummyClient.put(new Aerospike.Key(helper.namespace, helper.set, 'timeoutDelay/10'), {a: 1})
        try{
          await dummyClient.remove(new Aerospike.Key(helper.namespace, helper.set, 'timeoutDelay/10'))
          assert.fail("client.remove should throw an error")
        }
        catch(error: any){
          await checkTimeoutErrorAndConnectionsEnable(dummyClient, error)
        }
        finally{
          
          await dummyClient.close()
        }
      })
    })

    context('BatchPolicy', function () {

      let disableTimeoutDelayConfig = {
        hosts: helper.config.hosts,
        user: helper.config.user,
        password: helper.config.password,
        policies : {
          batch: disableTimeoutDelayPolicy
        },
        tenderInterval: 250
      }

      let enableTimeoutDelayConfig = {
        hosts: helper.config.hosts,
        user: helper.config.user,
        password: helper.config.password,
        policies : {
          batch: enableTimeoutDelayPolicy
        },
        tenderInterval: 250
      }

      it('Disables timeout delay', async function () {

        const dummyClient = await Aerospike.connect(disableTimeoutDelayConfig)
        await dummyClient.put(new Aerospike.Key(helper.namespace, helper.set, 'timeoutDelay/6'), {a: 1})
        let batch = []
        try{
          for (let i = 2; i <= 10000; i++) {
            batch.push({
              key: new Aerospike.Key('test', 'demo', `timeoutDelay/${i}`),
              readAllBins: true
            })
          }
          const batchResult = await dummyClient.batchRead(batch)
          assert.fail("client.batchRead should throw an error")
        }
        catch(error: any){
          await checkTimeoutErrorAndConnectionsDisable(dummyClient, error)
        }
        finally{
          
          await dummyClient.close()
        }
      })

      it('Recovers socket connection during timeout delay period', async function () {

        const dummyClient = await Aerospike.connect(enableTimeoutDelayConfig)
        await dummyClient.put(new Aerospike.Key(helper.namespace, helper.set, 'timeoutDelay/4'), {a: 1})

        try{
          const batch = []
          for (let i = 2; i <= 20000; i++) {
            batch.push({
              key: new Aerospike.Key('test', 'demo', `timeoutDelay/${i}`),
              readAllBins: true
            })
          }
          const batchResult = await dummyClient.batchRead(batch)
          assert.fail("client.batchRead should throw an error")
        }
        catch(error: any){
          await checkTimeoutErrorAndConnectionsEnable(dummyClient, error)
        }
        finally{
          
          await dummyClient.close()
        }
      })

      it('Aborts socket connection after timeout delay period', async function () {

        const dummyClient = await Aerospike.connect(enableTimeoutDelayConfig)
        await dummyClient.put(new Aerospike.Key(helper.namespace, helper.set, 'timeoutDelay/4'), {a: 1})

        try{
          const batch = []
          for (let i = 2; i <= 20000; i++) {
            batch.push({
              key: new Aerospike.Key('test', 'demo', `timeoutDelay/${i}`),
              readAllBins: true
            })
          }
          const batchResult = await dummyClient.batchRead(batch, forceAbortPolicy)
          assert.fail("client.batchRead should throw an error")
        }
        catch(error: any){
          await checkTimeoutErrorAndConnectionsAbort(dummyClient, error)
        }
        finally{
          
          await dummyClient.close()
        }
      })

    })

    context('QueryPolicy', function () {

      let disableTimeoutDelayConfig = {
        hosts: helper.config.hosts,
        user: helper.config.user,
        password: helper.config.password,
        policies : {
          query: disableTimeoutDelayPolicy
        },
        tenderInterval: 250
      }

      let enableTimeoutDelayConfig = {
        hosts: helper.config.hosts,
        user: helper.config.user,
        password: helper.config.password,
        policies : {
          query: enableTimeoutDelayPolicy
        },
        tenderInterval: 250
      }

      it('Disables timeout delay', async function () {

        const dummyClient = await Aerospike.connect(disableTimeoutDelayConfig)
        const query: Query = await dummyClient.query(helper.namespace, helper.set)
        try{
          await query.results()
          assert.fail("query.results should throw an error")
        }
        catch(error: any) {
          await checkTimeoutErrorAndConnectionsQueryDisable(dummyClient, error)
        }
        finally{
          
          await dummyClient.close()
        }
      })


      it('Aborts socket connection after timeout delay period', async function () {

        const dummyClient = await Aerospike.connect(enableTimeoutDelayConfig)
        const query: Query = await dummyClient.query(helper.namespace, helper.set)
        try{
          await query.results(forceAbortPolicy)
          assert.fail("query.results should throw an error")
        }
        catch(error: any){
          await checkTimeoutErrorAndConnectionsQueryEnableAbort(dummyClient, error)
        }
        finally{
          
          await dummyClient.close()
        }
      })

    })


    context('ScanPolicy', function () {

      let disableTimeoutDelayConfig = {
        hosts: helper.config.hosts,
        user: helper.config.user,
        password: helper.config.password,
        policies : {
          scan: disableTimeoutDelayPolicy
        },
        tenderInterval: 250
      }

      let enableTimeoutDelayConfig = {
        hosts: helper.config.hosts,
        user: helper.config.user,
        password: helper.config.password,
        policies : {
          scan: enableTimeoutDelayPolicy
        },
        tenderInterval: 250
      }

      it('Disables timeout delay', async function () {

        const dummyClient = await Aerospike.connect(disableTimeoutDelayConfig)
        const scan: Scan = await dummyClient.scan(helper.namespace, helper.set)
        try{
          await scan.results()
          assert.fail("scan.results should throw an error")
        }
        catch(error: any){
          await checkTimeoutErrorAndConnectionsQueryDisable(dummyClient, error)
        }
        finally{
          
          await dummyClient.close()
        }
      })

      it('Aborts socket connection after timeout delay period', async function () {

        const dummyClient = await Aerospike.connect(enableTimeoutDelayConfig)
        const scan: Scan = await dummyClient.scan(helper.namespace, helper.set)
        try{
          await scan.results(forceAbortPolicy)
          assert.fail("scan.results should throw an error")
        }
        catch(error: any){
          await checkTimeoutErrorAndConnectionsQueryEnableAbort(dummyClient, error)
        }
        finally{
          
          await dummyClient.close()
        }
      })
    })

    context('InfoPolicy', function () {

      let disableTimeoutDelayConfig = {
        hosts: helper.config.hosts,
        user: helper.config.user,
        password: helper.config.password,
        policies : {
          info: disableInfoTimeoutDelayPolicy
        },
        tenderInterval: 250
      }

      let enableTimeoutDelayConfig = {
        hosts: helper.config.hosts,
        user: helper.config.user,
        password: helper.config.password,
        policies : {
          info: enableInfoTimeoutDelayPolicy
        },
        tenderInterval: 250
      }



      it('Disables timeout delay', async function () {

        const dummyClient = await Aerospike.connect(disableTimeoutDelayConfig)
        try{
          let nodes = await dummyClient.getNodes()
          let result = await dummyClient.infoNode('status', nodes[0])
          assert.fail("client.infoNode should throw an error")
        }
        catch(error: any){
          await checkTimeoutErrorAndConnectionsInfoDisable(dummyClient, error)
        }
        finally{
          
          await dummyClient.close()
        }
      })

    })

    context('txnVerify', function () {

      let disableTimeoutDelayConfig = {
        hosts: helper.config.hosts,
        user: helper.config.user,
        password: helper.config.password,
        policies : {
          txnVerify: disableTimeoutDelayPolicy
        },
        tenderInterval: 250
      }

      let enableTimeoutDelayConfig = {
        hosts: helper.config.hosts,
        user: helper.config.user,
        password: helper.config.password,
        policies : {
          txnVerify: enableTimeoutDelayPolicy
        },
        tenderInterval: 250
      }

      let abortTimeoutDelayConfig = {
        hosts: helper.config.hosts,
        user: helper.config.user,
        password: helper.config.password,
        policies : {
          txnVerify: forceAbortPolicy
        }
      }

      it('Disables timeout delay', async function () {

        let mrt: any = new Aerospike.Transaction()

        const policy: any = {
            txn: mrt
        }

        const dummyClient = await Aerospike.connect(disableTimeoutDelayConfig)

        const batch = []
        for (let i = 2; i <= 200; i++) {
          batch.push({
            key: new Aerospike.Key('test', 'demo', `timeoutDelay/${i}`),
            readAllBins: true
          })
        }
        const batchResult = await dummyClient.batchRead(batch, policy)

        try{

          await dummyClient.commit(mrt)
          assert.fail("client.commit should throw an error")
        }
        catch(error: any){
          await checkTimeoutErrorAndConnectionsTxnVerifyDisabled(dummyClient, error)
        }
        finally{
          
          await dummyClient.close()
        }
      })


    })

    context('txnRoll', function () {
      // txnRoll is an overly complicated scenario. Since it is a batchPolicy, it should be covered by txnVerify, batch, and negative testing.

    })
  })

  context('Negative tests', function () {

    context('ReadPolicy', function () {

      it('fails when timeoutDelay is not a number', async function () {
        const config: ConfigOptions = {
          hosts: helper.config.hosts,
          user: helper.config.user,
          password: helper.config.password,
          policies : {
            read: {
              timeoutDelay: 'a' as any,
            }
          }
        }

        try {
          const dummyClient = await Aerospike.connect(config)
          await dummyClient.close()
          assert.fail("Aerospike.connect did not throw an error")
                    
        }
        catch(error: any){
          expect(error.message).to.eql("Invalid client configuration")
          expect(error.code).to.eql(-1)
        }
      })

      it('fails when timeoutDelay is not a number and used in a command', async function () {
        const config: ConfigOptions = {
          hosts: helper.config.hosts,
          user: helper.config.user,
          password: helper.config.password,
        }

        const dummyClient = await Aerospike.connect(config)
        try {
          await dummyClient.get(new Aerospike.Key('test', 'demo', `timeoutDelay/14`), { timeoutDelay: 'a' as any})
          assert.fail("Aerospike.connect did not throw an error")
                    
        }
        catch(error: any){
          expect(error.message).to.eql("Policy object invalid")
          expect(error.code).to.eql(-2)
        }
        finally{
          await dummyClient.close()
        }
      })

      it('fails when 0 < timeoutDelay < 1000', async function () {
        const config: ConfigOptions = {
          hosts: helper.config.hosts,
          user: helper.config.user,
          password: helper.config.password,
          policies : {
            read: {
              timeoutDelay: 1,
            }
          }
        }

        try {
          const dummyClient = await Aerospike.connect(config)
          await dummyClient.close()
          assert.fail("Aerospike.connect did not throw an error")
                    
        }
        catch(error: any){
          expect(error.message).to.eql("Invalid read timeout_delay: 1 valid values are 0 or >= 3000")
          expect(error.code).to.eql(-1)
        }
      })


//      it('fails when 0 < timeoutDelay < 1000 and used in command', async function () {
//        const config: ConfigOptions = {
//          hosts: helper.config.hosts,
//          user: helper.config.user,
//          password: helper.config.password,
//        }
//
//        const dummyClient = await Aerospike.connect(config)
//        try {
//          await dummyClient.get(new Aerospike.Key('test', 'demo', `timeoutDelay/14`), { timeoutDelay: 1})
//          assert.fail("Aerospike.connect did not throw an error")
//                    
//        }
//        catch(error: any){
//          expect(error.message).to.eql("Invalid read timeout_delay: 1 valid values are 0 or >= 3000")
//          expect(error.code).to.eql(-1)
//        }
//        finally{
//          await dummyClient.close()
//        }
//      })

    })

    context('WritePolicy', function () {

      it('fails when timeoutDelay is not a number', async function () {
        const config: ConfigOptions = {
          hosts: helper.config.hosts,
          user: helper.config.user,
          password: helper.config.password,
          policies : {
            write: {
              timeoutDelay: 'a' as any,
            }
          }
        }

        try {
          const dummyClient = await Aerospike.connect(config)
          await dummyClient.close()
          assert.fail("Aerospike.connect did not throw an error")
                    
        }
        catch(error: any){
          expect(error.message).to.eql("Invalid client configuration")
          expect(error.code).to.eql(-1)
        }
      })

      it('fails when timeoutDelay is not a number and used in a command', async function () {
        const config: ConfigOptions = {
          hosts: helper.config.hosts,
          user: helper.config.user,
          password: helper.config.password,
        }

        const dummyClient = await Aerospike.connect(config)
        try {
          await dummyClient.put(new Aerospike.Key('test', 'demo', `timeoutDelay/14`), {a: 1}, null, { timeoutDelay: 'a' as any})
          assert.fail("Aerospike.connect did not throw an error")
                    
        }
        catch(error: any){
          expect(error.message).to.eql("Policy object invalid")
          expect(error.code).to.eql(-2)
        }
        finally{
          await dummyClient.close()
        }
      })

      it('fails when 0 < timeoutDelay < 1000', async function () {
        const config: ConfigOptions = {
          hosts: helper.config.hosts,
          user: helper.config.user,
          password: helper.config.password,
          policies : {
            write: {
              timeoutDelay: 134,
            }
          }
        }

        try {
          const dummyClient = await Aerospike.connect(config)
          await dummyClient.close()
          assert.fail("Aerospike.connect did not throw an error")
                    
        }
        catch(error: any){
          expect(error.message).to.eql("Invalid write timeout_delay: 134 valid values are 0 or >= 3000")
          expect(error.code).to.eql(-1)
        }
      })

    })

    context('ApplyPolicy', function () {

      it('fails when timeoutDelay is not a number', async function () {
        const config: ConfigOptions = {
          hosts: helper.config.hosts,
          user: helper.config.user,
          password: helper.config.password,
          policies : {
            apply: {
              timeoutDelay: 'a' as any,
            }
          }
        }

        try {
          const dummyClient = await Aerospike.connect(config)
          await dummyClient.close()
          assert.fail("Aerospike.connect did not throw an error")
                    
        }
        catch(error: any){
          expect(error.message).to.eql("Invalid client configuration")
          expect(error.code).to.eql(-1)
        }
      })

      it('fails when timeoutDelay is not a number and used in a command', async function () {
        const config: ConfigOptions = {
          hosts: helper.config.hosts,
          user: helper.config.user,
          password: helper.config.password,
        }

        const dummyClient = await Aerospike.connect(config)
        try {
          const udfArgs: UDF = { module: 'udf', funcname: 'withoutArguments' }

          await dummyClient.apply(new Aerospike.Key(helper.namespace, helper.set, 'timeoutDelay/4'), udfArgs, { timeoutDelay: 'a' as any})

          assert.fail("Aerospike.connect did not throw an error")
                    
        }
        catch(error: any){
          expect(error.message).to.eql("Policy object invalid")
          expect(error.code).to.eql(-2)
        }
        finally{
          await dummyClient.close()
        }
      })

      it('fails when 0 < timeoutDelay < 1000', async function () {
        const config: ConfigOptions = {
          hosts: helper.config.hosts,
          user: helper.config.user,
          password: helper.config.password,
          policies : {
            apply: {
              timeoutDelay: 345,
            }
          }
        }

        try {
          const dummyClient = await Aerospike.connect(config)
          await dummyClient.close()
          assert.fail("Aerospike.connect did not throw an error")
                    
        }
        catch(error: any){
          expect(error.message).to.eql("Invalid apply timeout_delay: 345 valid values are 0 or >= 3000")
          expect(error.code).to.eql(-1)
        }
      })
    })

    context('OperatePolicy', function () {

      it('fails when timeoutDelay is not a number', async function () {
        const config: ConfigOptions = {
          hosts: helper.config.hosts,
          user: helper.config.user,
          password: helper.config.password,
          policies : {
            operate: {
              timeoutDelay: 'a' as any,
            }
          }
        }

        try {
          const dummyClient = await Aerospike.connect(config)
          await dummyClient.close()
          assert.fail("Aerospike.connect did not throw an error")
                    
        }
        catch(error: any){
          expect(error.message).to.eql("Invalid client configuration")
          expect(error.code).to.eql(-1)
        }
      })

      it('fails when timeoutDelay is not a number and used in a command', async function () {
        const config: ConfigOptions = {
          hosts: helper.config.hosts,
          user: helper.config.user,
          password: helper.config.password,
        }

        const dummyClient = await Aerospike.connect(config)
        try {

          const ops: operations.Operation[] = [
            Aerospike.operations.add('int', 432)
          ]

          await dummyClient.operate(new Aerospike.Key(helper.namespace, helper.set, 'timeoutDelay/6'), ops, null, { timeoutDelay: 'a' as any})

                    
        }
        catch(error: any){
          expect(error.message).to.eql("Policy object invalid")
          expect(error.code).to.eql(-2)
        }
        finally{
          await dummyClient.close()
        }
      })

      it('fails when 0 < timeoutDelay < 1000', async function () {
        const config: ConfigOptions = {
          hosts: helper.config.hosts,
          user: helper.config.user,
          password: helper.config.password,
          policies : {
            operate: {
              timeoutDelay: 602,
            }
          }
        }

        try {
          const dummyClient = await Aerospike.connect(config)
          await dummyClient.close()
          assert.fail("Aerospike.connect did not throw an error")
                    
        }
        catch(error: any){
          expect(error.message).to.eql("Invalid operate timeout_delay: 602 valid values are 0 or >= 3000")
          expect(error.code).to.eql(-1)
        }
      })
    })

    context('RemovePolicy', function () {

      it('fails when timeoutDelay is not a number', async function () {
        const config: ConfigOptions = {
          hosts: helper.config.hosts,
          user: helper.config.user,
          password: helper.config.password,
          policies : {
            remove: {
              timeoutDelay: 'a' as any,
            }
          }
        }

        try {
          const dummyClient = await Aerospike.connect(config)
          await dummyClient.close()
          assert.fail("Aerospike.connect did not throw an error")
                    
        }
        catch(error: any){
          expect(error.message).to.eql("Invalid client configuration")
          expect(error.code).to.eql(-1)
        }
      })

      it('fails when timeoutDelay is not a number and used in a command', async function () {
        const config: ConfigOptions = {
          hosts: helper.config.hosts,
          user: helper.config.user,
          password: helper.config.password,
        }

        const dummyClient = await Aerospike.connect(config)
        try {
          await dummyClient.remove(new Aerospike.Key(helper.namespace, helper.set, 'timeoutDelay/6'), {timeoutDelay: 'a' as any})
        }
        catch(error: any){
          expect(error.message).to.eql("Policy object invalid")
          expect(error.code).to.eql(-2)
        }
        finally{
          await dummyClient.close()
        }
      })

      it('fails when 0 < timeoutDelay < 1000', async function () {
        const config: ConfigOptions = {
          hosts: helper.config.hosts,
          user: helper.config.user,
          password: helper.config.password,
          policies : {
            remove: {
              timeoutDelay: 999,
            }
          }
        }

        try {
          const dummyClient = await Aerospike.connect(config)
          await dummyClient.close()
          assert.fail("Aerospike.connect did not throw an error")
                    
        }
        catch(error: any){
          expect(error.message).to.eql("Invalid remove timeout_delay: 999 valid values are 0 or >= 3000")
          expect(error.code).to.eql(-1)
        }
      })
    })

    context('BatchPolicy', function () {

      it('fails when timeoutDelay is not a number', async function () {
        const config: ConfigOptions = {
          hosts: helper.config.hosts,
          user: helper.config.user,
          password: helper.config.password,
          policies : {
            batch: {
              timeoutDelay: 'a' as any,
            }
          }
        }

        try {
          const dummyClient = await Aerospike.connect(config)
          await dummyClient.close()
          assert.fail("Aerospike.connect did not throw an error")
                    
        }
        catch(error: any){
          expect(error.message).to.eql("Invalid client configuration")
          expect(error.code).to.eql(-1)
        }
      })

      it('fails when timeoutDelay is not a number and used in a command', async function () {
        const config: ConfigOptions = {
          hosts: helper.config.hosts,
          user: helper.config.user,
          password: helper.config.password,
        }

        const dummyClient = await Aerospike.connect(config)
        try {

          let batch = []
          for (let i = 2; i <= 10000; i++) {
            batch.push({
              key: new Aerospike.Key('test', 'demo', `timeoutDelay/${i}`),
              readAllBins: true
            })
          }
          const batchResult = await dummyClient.batchRead(batch, {timeoutDelay: 'a' as any})
        }
        catch(error: any){
          expect(error.message).to.eql("Policy object invalid")
          expect(error.code).to.eql(-2)
        }
        finally{
          await dummyClient.close()
        }
      })

      it('fails when 0 < timeoutDelay < 1000', async function () {
        const config: ConfigOptions = {
          hosts: helper.config.hosts,
          user: helper.config.user,
          password: helper.config.password,
          policies : {
            batch: {
              timeoutDelay: 1337,
            }
          }
        }

        try {
          const dummyClient = await Aerospike.connect(config)
          await dummyClient.close()
          assert.fail("Aerospike.connect did not throw an error")
                    
        }
        catch(error: any){
          expect(error.message).to.eql("Invalid batch_read timeout_delay: 1337 valid values are 0 or >= 3000")
          expect(error.code).to.eql(-1)
        }
      })
    })

    context('QueryPolicy', function () {

      it('fails when timeoutDelay is not a number', async function () {
        const config: ConfigOptions = {
          hosts: helper.config.hosts,
          user: helper.config.user,
          password: helper.config.password,
          policies : {
            query: {
              timeoutDelay: 'a' as any,
            }
          }
        }

        try {
          const dummyClient = await Aerospike.connect(config)
          await dummyClient.close()
          assert.fail("Aerospike.connect did not throw an error")
                    
        }
        catch(error: any){
          expect(error.message).to.eql("Invalid client configuration")
          expect(error.code).to.eql(-1)
        }
      })

      it('fails when timeoutDelay is not a number and used in a command', async function () {
        const config: ConfigOptions = {
          hosts: helper.config.hosts,
          user: helper.config.user,
          password: helper.config.password,
        }

        const dummyClient = await Aerospike.connect(config)
        const query: Query = await dummyClient.query(helper.namespace, helper.set)
        try{
          await query.results({timeoutDelay: 'a' as any})
        }
        catch(error: any){
          expect(error.message).to.eql("Policy object invalid")
          expect(error.code).to.eql(-2)
        }
        finally{
          await dummyClient.close()
        }
      })

      it('fails when 0 < timeoutDelay < 1000', async function () {
        const config: ConfigOptions = {
          hosts: helper.config.hosts,
          user: helper.config.user,
          password: helper.config.password,
          policies : {
            query: {
              timeoutDelay: 1614,
            }
          }
        }

        try {
          const dummyClient = await Aerospike.connect(config)
          await dummyClient.close()
          assert.fail("Aerospike.connect did not throw an error")
                    
        }
        catch(error: any){
          expect(error.message).to.eql("Invalid query timeout_delay: 1614 valid values are 0 or >= 3000")
          expect(error.code).to.eql(-1)
        }
      })
    })


    context('ScanPolicy', function () {

      it('fails when timeoutDelay is not a number', async function () {
        const config: ConfigOptions = {
          hosts: helper.config.hosts,
          user: helper.config.user,
          password: helper.config.password,
          policies : {
            query: {
              timeoutDelay: 'a' as any,
            }
          }
        }

        try {
          const dummyClient = await Aerospike.connect(config)
          await dummyClient.close()
          assert.fail("Aerospike.connect did not throw an error")
                    
        }
        catch(error: any){
          expect(error.message).to.eql("Invalid client configuration")
          expect(error.code).to.eql(-1)
        }
      })

      it('fails when timeoutDelay is not a number and used in a command', async function () {
        const config: ConfigOptions = {
          hosts: helper.config.hosts,
          user: helper.config.user,
          password: helper.config.password,
        }

        const dummyClient = await Aerospike.connect(config)
        const scan: Scan = await dummyClient.scan(helper.namespace, helper.set)
        try{
          await scan.results({timeoutDelay: 'a' as any})
        }
        catch(error: any){
          expect(error.message).to.eql("Policy object invalid")
          expect(error.code).to.eql(-2)
        }
        finally{
          await dummyClient.close()
        }
      })

      it('fails when 0 < timeoutDelay < 1000', async function () {
        const config: ConfigOptions = {
          hosts: helper.config.hosts,
          user: helper.config.user,
          password: helper.config.password,
          policies : {
            scan: {
              timeoutDelay: 1825,
            }
          }
        }

        try {
          const dummyClient = await Aerospike.connect(config)
          await dummyClient.close()
          assert.fail("Aerospike.connect did not throw an error")
                    
        }
        catch(error: any){
          expect(error.message).to.eql("Invalid scan timeout_delay: 1825 valid values are 0 or >= 3000")
          expect(error.code).to.eql(-1)
        }
      })

    })

    context('InfoPolicy', function () {

      it('fails when 0 < timeoutDelay < 1000', async function () {
        const config: ConfigOptions = {
          hosts: helper.config.hosts,
          user: helper.config.user,
          password: helper.config.password,
          policies : {
            info: {
              timeoutDelay: 2194,
            }
          }
        }

        try {
          const dummyClient = await Aerospike.connect(config)
          await dummyClient.close()
          assert.fail("Aerospike.connect did not throw an error")
                    
        }
        catch(error: any){
          expect(error.message).to.eql("Invalid info timeout_delay: 2194 valid values are 0 or >= 3000")
          expect(error.code).to.eql(-1)
        }
      })
    })

    context('txnVerify', function () {
      it('fails when 0 < timeoutDelay < 1000', async function () {
        const config: ConfigOptions = {
          hosts: helper.config.hosts,
          user: helper.config.user,
          password: helper.config.password,
          policies : {
            txnVerify: {
              timeoutDelay: 2621,
            }
          }
        }

        try{
          const dummyClient = await Aerospike.connect(config)
          await dummyClient.close()
        }
        catch(error: any){
          expect(error.message).to.eql("Invalid txn_verify timeout_delay: 2621 valid values are 0 or >= 3000")
          expect(error.code).to.eql(-1)
        }
      })
    })

    context('txnRoll', function () {

      it('fails when 0 < timeoutDelay < 1000', async function () {
        const config: ConfigOptions = {
          hosts: helper.config.hosts,
          user: helper.config.user,
          password: helper.config.password,
          policies : {
            txnRoll: {
              timeoutDelay: 2999,
            }
          }
        }

        try {
          const dummyClient = await Aerospike.connect(config)
          assert.fail("Aerospike.connect did not throw an error")
                    
        }
        catch(error: any){
          expect(error.message).to.eql("Invalid txn_roll timeout_delay: 2999 valid values are 0 or >= 3000")
          expect(error.code).to.eql(-1)
        }
      })
    })
  })

  context('Typescript tests', function () {

    context('ReadPolicy', function () {

      it('compiles ReadPolicy', async function () {
        const policy: ReadPolicy = new Aerospike.ReadPolicy({
          timeoutDelay: 3400
        })
      })
    })

    context('WritePolicy', function () {

      it('compiles WritePolicy', async function () {
        const policy: WritePolicy = new Aerospike.WritePolicy({
          timeoutDelay: 3400
        })
      })
    })

    context('ApplyPolicy', function () {

      it('compiles ApplyPolicy', async function () {
        const policy: ApplyPolicy = new Aerospike.ApplyPolicy({
          timeoutDelay: 3400
        })
      })
    })

    context('OperatePolicy', function () {

      it('compiles OperatePolicy', async function () {
        const policy: OperatePolicy = new Aerospike.OperatePolicy({
          timeoutDelay: 3400
        })
      })
    })

    context('RemovePolicy', function () {

      it('compiles RemovePolicy', async function () {
        const policy: RemovePolicy = new Aerospike.RemovePolicy({
          timeoutDelay: 3400
        })
      })
    })

    context('BatchPolicy', function () {


      it('compiles BatchPolicy', async function () {
        const policy: BatchPolicy = new Aerospike.BatchPolicy({
          timeoutDelay: 3400
        })
      })
    })

    context('QueryPolicy', function () {


      it('compiles QueryPolicy', async function () {
        const policy: QueryPolicy = new Aerospike.QueryPolicy({
          timeoutDelay: 3400
        })
      })
    })


    context('ScanPolicy', function () {

      it('compiles QueryPolicy', async function () {
        const policy: QueryPolicy = new Aerospike.QueryPolicy({
          timeoutDelay: 3400
        })
      })
    })

    context('InfoPolicy', function () {

      it('compiles InfoPolicy', async function () {
        const policy: InfoPolicy = new Aerospike.InfoPolicy({
          timeoutDelay: 3400
        })
      })
    })

    context('Config', function () {

      context('ReadPolicy', function () {

        it('compiles Config with read policy', async function () {
          const config: Config = new Aerospike.Config({
            policies: {
              read: {
                timeoutDelay: 3300
              }
            }
          })
        })

        it('compiles ConfigOptions with read policy', async function () {
          const config: ConfigOptions = new Aerospike.Config({
            policies: {
              read: {
                timeoutDelay: 3300
              }
            }
          })
        })
      })

      context('WritePolicy', function () {

        it('compiles Config with write policy', async function () {
          const config: Config = new Aerospike.Config({
            policies: {
              write: {
                timeoutDelay: 3300
              }
            }
          })
        })

        it('compiles ConfigOptions with write policy', async function () {
          const config: ConfigOptions = new Aerospike.Config({
            policies: {
              write: {
                timeoutDelay: 3300
              }
            }
          })
        })

      })

      context('ApplyPolicy', function () {

        it('compiles Config with apply policy', async function () {
          const config: Config = new Aerospike.Config({
            policies: {
              apply: {
                timeoutDelay: 3300
              }
            }
          })
        })

        it('compiles ConfigOptions with apply policy', async function () {
          const config: ConfigOptions = new Aerospike.Config({
            policies: {
              apply: {
                timeoutDelay: 3300
              }
            }
          })
        })
      })

      context('OperatePolicy', function () {
        it('compiles Config with operate policy', async function () {
          const config: Config = new Aerospike.Config({
            policies: {
              operate: {
                timeoutDelay: 3300
              }
            }
          })
        })

        it('compiles ConfigOptions with operate policy', async function () {
          const config: ConfigOptions = new Aerospike.Config({
            policies: {
              operate: {
                timeoutDelay: 3300
              }
            }
          })
        })
      })

      context('RemovePolicy', function () {

        it('compiles Config with RemovePolicy policy', async function () {
          const config: Config = new Aerospike.Config({
            policies: {
              remove: {
                timeoutDelay: 3300
              }
            }
          })
        })

        it('compiles ConfigOptions with remove policy', async function () {
          const config: ConfigOptions = new Aerospike.Config({
            policies: {
              remove: {
                timeoutDelay: 3300
              }
            }
          })
        })
      })

      context('BatchPolicy', function () {


        it('compiles Config with batch policy', async function () {
          const config: Config = new Aerospike.Config({
            policies: {
              batch: {
                timeoutDelay: 3300
              }
            }
          })
        })

        it('compiles ConfigOptions with batch policy', async function () {
          const config: ConfigOptions = new Aerospike.Config({
            policies: {
              batch: {
                timeoutDelay: 3300
              }
            }
          })
        })
      })

      context('QueryPolicy', function () {


        it('compiles Config with query policy', async function () {
          const config: Config = new Aerospike.Config({
            policies: {
              query: {
                timeoutDelay: 3300
              }
            }
          })
        })

        it('compiles ConfigOptions with query policy', async function () {
          const config: ConfigOptions = new Aerospike.Config({
            policies: {
              query: {
                timeoutDelay: 3300
              }
            }
          })
        })
      })


      context('ScanPolicy', function () {

        it('compiles Config with scan policy', async function () {
          const config: Config = new Aerospike.Config({
            policies: {
              scan: {
                timeoutDelay: 3300
              }
            }
          })
        })

        it('compiles ConfigOptions with scan policy', async function () {
          const config: ConfigOptions = new Aerospike.Config({
            policies: {
              scan: {
                timeoutDelay: 3300
              }
            }
          })
        })
      })

      context('InfoPolicy', function () {

        it('compiles Config with info policy', async function () {
          const config: Config = new Aerospike.Config({
            policies: {
              info: {
                timeoutDelay: 3300
              }
            }
          })
        })

        it('compiles ConfigOptions with info policy', async function () {
          const config: ConfigOptions = new Aerospike.Config({
            policies: {
              info: {
                timeoutDelay: 3300
              }
            }
          })
        })
      })


      context('txnVerify', function () {

        it('compiles Config with txnVerify policy', async function () {
          const config: Config = new Aerospike.Config({
            policies: {
              txnVerify: {
                timeoutDelay: 3300
              }
            }
          })
        })

        it('compiles ConfigOptions with txnVerify policy', async function () {
          const config: ConfigOptions = new Aerospike.Config({
            policies: {
              txnVerify: {
                timeoutDelay: 3300
              }
            }
          })
        })
      })


      context('txnRoll', function () {

        it('compiles Config with txnRoll policy', async function () {
          const config: Config = new Aerospike.Config({
            policies: {
              txnRoll: {
                timeoutDelay: 3300
              }
            }
          })
        })

        it('compiles ConfigOptions with txnRoll policy', async function () {
          const config: ConfigOptions = new Aerospike.Config({
            policies: {
              txnRoll: {
                timeoutDelay: 3300
              }
            }
          })
        })
      })

    })


  })
})