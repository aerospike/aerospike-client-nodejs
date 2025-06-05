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

describe('Test the config provider and dynamic config', function () {
  //helper.skipUnlessVersionAndEnterprise('>= 8.0.0', this)
  let key: K = new Aerospike.Key(helper.namespace, helper.set, 'test/dynamic_config/1')


  context('Test different configuration', function () { 
    const client: Cli = helper.client

    const dyn_config_path = "./dist/dyn_config.yml"

    const dyn_config_path_send_key_true = "./dist/dyn_config_send_key_true.yml"

    const dyn_config_path_metrics_disabled = "./dist/dyn_config_path_metrics_disabled.yml"


    afterEach(async function () {
      try{
        console.log("RESET!")
        await client.remove(key)

      }
      catch(error: any){
        return
      }
    })

    it('Loads basic dynamic config and obeys the send key policy', async function () {

      
      const config: any = {
        hosts: helper.config.hosts,
        user: helper.config.user,
        password: helper.config.password,
        configProvider: {
          path: "./dist/dyn_config.yml",
          interval: 1
        }
      }

      let dummyClient = null;
      try{
        dummyClient = await Aerospike.connect(config)
        await new Promise(r => setTimeout(r, 3000));

        await dummyClient.put(key, {"a": 1})

        let query: any = dummyClient.query(helper.namespace, helper.set)
        let records: any = await query.results()

        await new Promise(r => setTimeout(r, 3000));

        expect(records[0].key.key).to.not.be.undefined
        console.log(records[0]) 
        await dummyClient.close()
      }
      finally{
        if(dummyClient){
          await dummyClient.close()
        }
      }

    })
    context('Dynamic config should take precedence over the programatic config', function () { 
      it('Uses the AEROSPIKE_CLIENT_CONFIG_URL enviornment variable over the command-level policy', async function () {

        const config: any = {
          hosts: helper.config.hosts,
          user: helper.config.user,
          password: helper.config.password,
          
        }


        process.env.AEROSPIKE_CLIENT_CONFIG_URL = dyn_config_path;




        console.log(process.env.AEROSPIKE_CLIENT_CONFIG_URL)
        config.policies = { 
          write: new Aerospike.WritePolicy({
            key: Aerospike.policy.key.SEND
          })
        }
        console.log(config)
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

          let record = await dummyClient.put(key, {"a": 1})

          let query: any = dummyClient.query(helper.namespace, helper.set)
          let records: any = await query.results()

          await new Promise(r => setTimeout(r, 3000));

          expect(records[0].key.key).to.be.undefined
          console.log(records[0]) 
          await dummyClient.close()
        }
        finally{
          if(dummyClient){
            await dummyClient.close()
          }
        }
      })

      it('Uses configProvider over the command-level configuration', async function () {

        const config: any = {
          hosts: helper.config.hosts,
          user: helper.config.user,
          password: helper.config.password,
          
        }


        config.configProvider = {
          path: dyn_config_path,
          interval: 1
        }


        console.log(process.env.AEROSPIKE_CLIENT_CONFIG_URL)
        config.policies = { 
          write: new Aerospike.WritePolicy({
            key: Aerospike.policy.key.SEND
          })
        }
        console.log(config)
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

          let record = await dummyClient.put(key, {"a": 1})

          let query: any = dummyClient.query(helper.namespace, helper.set)
          let records: any = await query.results()

          await new Promise(r => setTimeout(r, 3000));

          expect(records[0].key.key).to.be.undefined
          console.log(records[0]) 
          await dummyClient.close()
        }
        finally{
          if(dummyClient){
            await dummyClient.close()
          }
        }

      })

      it('AEROSPIKE_CLIENT_CONFIG_URL takes precedence over all other forms of config', async function () {

        const config: any = {
          hosts: helper.config.hosts,
          user: helper.config.user,
          password: helper.config.password,
          
        }


        process.env.AEROSPIKE_CLIENT_CONFIG_URL = dyn_config_path;

        config.configProvider = {
          path: dyn_config_path_send_key_true,
          interval: 1
        }


        console.log(process.env.AEROSPIKE_CLIENT_CONFIG_URL)
        config.policies = { 
          write: new Aerospike.WritePolicy({
            key: Aerospike.policy.key.SEND
          })
        }
        console.log(config)
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

          let record = await dummyClient.put(key, {"a": 1})

          let query: any = dummyClient.query(helper.namespace, helper.set)
          let records: any = await query.results()

          await new Promise(r => setTimeout(r, 3000));

          expect(records[0].key.key).to.be.undefined
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

    it('enableMetrics does not override the dynamic config and no error is thrown', async function () {

      const config: any = {
        hosts: helper.config.hosts,
        user: helper.config.user,
        password: helper.config.password,
        
      }

      config.configProvider = {
        path: dyn_config_path_metrics_disabled,
        interval: 1
      }

      let dummyClient = null;
      try{
        dummyClient = await Aerospike.connect(config)
        await dummyClient.enableMetrics()
      }
      finally{
        if(dummyClient){
          await dummyClient.close()
        }
      }

    })

    it('disableMetrics does not override the dynamic config and no error is thrown', async function () {

      const config: any = {
        hosts: helper.config.hosts,
        user: helper.config.user,
        password: helper.config.password,
        
      }

      config.configProvider = {
        path: dyn_config_path,
        interval: 1
      }

      let dummyClient = null;
      try{
        dummyClient = await Aerospike.connect(config)
        await dummyClient.disableMetrics()
      }
      finally{
        if(dummyClient){
          await dummyClient.close()
        }
      }


    })

  })





})