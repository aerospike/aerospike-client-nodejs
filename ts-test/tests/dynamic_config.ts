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
  //helper.skipUnlessVersionAndEnterprise('>= 8.0.0', this)
  let key: K = new Aerospike.Key(helper.namespace, helper.set, 'test/dynamic_config/1')


  context('Test the MRT specific API', function () { 
    const client: Cli = helper.client

    after(async function () {
      try{

        await client.remove(key)

      }
      catch(error: any){
        return
      }
    })

    it('Basic functionality', async function () {

      
      const config: any = {
        hosts: helper.config.hosts,
        user: helper.config.user,
        password: helper.config.password,
        log: {
          level: Aerospike.log.TRACE,
        },
        configProvider: {
          path: "./dist/dyn_config.yml",
          interval: 1
        }
      }
      let dummyClient = null;
      try{
        dummyClient = await Aerospike.connect(config)
        await new Promise(r => setTimeout(r, 3000));

        try{
          await dummyClient.remove(key)
        }
        catch(error: any){
          console.log("remove")
        }
        await dummyClient.put(key, {"a": 1})
        let query: any = dummyClient.query(helper.namespace, helper.set)
        let records: any = await query.results()

        await new Promise(r => setTimeout(r, 3000));

        expect(records[0].key).to.not.be.undefined
        console.log(records[0]) 
        await dummyClient.close()
      }
      finally{
        if(dummyClient){
          await dummyClient.close()
        }
      }

    })

  })





})