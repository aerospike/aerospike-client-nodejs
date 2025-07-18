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

const fs = require('fs');

import { expect, assert } from 'chai';


import * as helper from './test_helper';

const keygen: any = helper.keygen
const metagen: any = helper.metagen
const recgen: any = helper.recgen

const status: typeof statusModule = Aerospike.status

describe('Dynamic Config tests', async function () {
  //helper.skipUnlessVersionAndEnterprise('>= 8.0.0', this)
  let key: K = new Aerospike.Key(helper.namespace, helper.set, 'test/dynamic_config/1')

  const client: Cli = helper.client

  const dyn_config_path = "./dist/dyn_config.yml"

  const dyn_config_path_edit = "./dist/dyn_config_edit.yml"

  const dyn_config_path_permissions = "./dist/dyn_config_permissions.yml"

  const dyn_config_path_send_key_true = "./dist/dyn_config_send_key_true.yml"

  const dyn_config_path_metrics_disabled = "./dist/dyn_config_path_metrics_disabled.yml"




  context('API and Functionality tests', async function () { 



    before(async function () {
      try{
        await client.truncate(helper.namespace, helper.set, 0)

      }
      catch(error: any){
        return
      }
    })

    afterEach(async function () {
      try{
        await client.remove(key)

      }
      catch(error: any){
        return
      }
    })

    context('Positive tests', function () {
      context('configProvider', async function () {
        context('interval', async function () {
          it('Can accept a valid interval value', async function () {
            const config: any = {
              hosts: helper.config.hosts,
              user: helper.config.user,
              password: helper.config.password,
              configProvider: {
                path: dyn_config_path,
                interval: 10000
              }
            }

            let dummyClient = null;

            try{
              dummyClient = await Aerospike.connect(config)

              await dummyClient.close()
            }
            finally{
              if(dummyClient){
                await dummyClient.close()
              }
            }
          })

          it('Uses the specified interval rather than default', async function () {
            const config: any = {
              hosts: helper.config.hosts,
              user: helper.config.user,
              password: helper.config.password,
              configProvider: {
                path: dyn_config_path_edit,
                interval: 1000
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

              }

              await dummyClient.put(key, {"a": 1})

              let query: any = dummyClient.query(helper.namespace, helper.set)
              let records: any = await query.results()

              expect(records[0].key.key).to.not.be.undefined

              const filePath: string = dyn_config_path_edit;
              const lineNumber: number = 10; // zero-based index
              let newLine: string = '    send_key: false';

              let lines: Array<string> = fs.readFileSync(filePath, 'utf-8').split('\n');
              lines[lineNumber] = newLine;
              fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');


              await new Promise(r => setTimeout(r, 5000));

              await dummyClient.remove(key)
              await dummyClient.put(key, {"a": 1})

              query = dummyClient.query(helper.namespace, helper.set)
              records = await query.results()

              expect(records[0].key.key).to.be.undefined

              await new Promise(r => setTimeout(r, 3000));

              newLine = '    send_key: true';

              lines = fs.readFileSync(filePath, 'utf-8').split('\n');
              lines[lineNumber] = newLine;
              fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');

              await dummyClient.close()
            }
            finally{
              if(dummyClient){
                await dummyClient.close()
              }
            }

          })




        })

        context('path', async function () {
          it('Loads dynamic config from configProvider', async function () {
            const config: any = {
              hosts: helper.config.hosts,
              user: helper.config.user,
              password: helper.config.password,
              configProvider: {
                path: dyn_config_path_send_key_true,
                interval: 1000
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

              await dummyClient.close()
            }
            finally{
              if(dummyClient){
                await dummyClient.close()
              }
            }
          })
        })
        context('metrics', async function () {
          it('enableMetrics does not override the dynamic config and no error is thrown', async function () {

            const config: any = {
              hosts: helper.config.hosts,
              user: helper.config.user,
              password: helper.config.password,
              
            }

            config.configProvider = {
              path: dyn_config_path_metrics_disabled,
              interval: 1000
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
              interval: 1000
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
        context('miscellaneous', async function () {
          it('Loads dynamic config from AEROSPIKE_CLIENT_CONFIG_URL', async function () {
            const config: any = {
              hosts: helper.config.hosts,
              user: helper.config.user,
              password: helper.config.password,
              
            }

            process.env.AEROSPIKE_CLIENT_CONFIG_URL = dyn_config_path;

            config.policies = { 
              write: new Aerospike.WritePolicy({
                key: Aerospike.policy.key.SEND
              })
            }

            let dummyClient = null;
            try{
              dummyClient = await Aerospike.connect(config)

              try{
                await dummyClient.remove(key)
              }
              catch(error: any){

              }

              let record = await dummyClient.put(key, {"a": 1})

              let query: any = dummyClient.query(helper.namespace, helper.set)
              let records: any = await query.results()

              await new Promise(r => setTimeout(r, 2000));

              expect(records[0].key.key).to.be.undefined

              await dummyClient.close()
            }
            finally{
              if(dummyClient){
                await dummyClient.close()
              }
            }




          })

          it('Prefers the AEROSPIKE_CLIENT_CONFIG_URL value over the command-level policy', async function () {

            const config: any = {
              hosts: helper.config.hosts,
              user: helper.config.user,
              password: helper.config.password,
              
            }

            process.env.AEROSPIKE_CLIENT_CONFIG_URL = dyn_config_path;

            config.policies = { 
              write: new Aerospike.WritePolicy({
                key: Aerospike.policy.key.SEND
              })
            }

            let dummyClient = null;
            try{
              dummyClient = await Aerospike.connect(config)
              await new Promise(r => setTimeout(r, 3000));

              try{
                await dummyClient.remove(key)
              }
              catch(error: any){

              }

              let record = await dummyClient.put(key, {"a": 1})

              let query: any = dummyClient.query(helper.namespace, helper.set)
              let records: any = await query.results()

              await new Promise(r => setTimeout(r, 3000));

              expect(records[0].key.key).to.be.undefined
            }
            finally{
              if(dummyClient){
                await dummyClient.close()
              }
              process.env.AEROSPIKE_CLIENT_CONFIG_URL = '';
            }


          })

          it('Prefers the configProvider value over the command-level policy', async function () {

            const config: any = {
              hosts: helper.config.hosts,
              user: helper.config.user,
              password: helper.config.password,
              
            }


            config.configProvider = {
              path: dyn_config_path,
              interval: 1000
            }

            // config.policies = { 
            //   write: new Aerospike.WritePolicy({
            //     key: Aerospike.policy.key.SEND
            //   })
            // }

            let dummyClient = null;
            try{
              dummyClient = await Aerospike.connect(config)
              await new Promise(r => setTimeout(r, 6000));

              try{
                await dummyClient.remove(key)
              }
              catch(error: any){
              }

              let record = await dummyClient.put(key, {"a": 1})

              let query: any = dummyClient.query(helper.namespace, helper.set)
              let records: any = await query.results()


              expect(records[0].key.key).to.be.undefined

              await dummyClient.close()
            }
            finally{
              if(dummyClient){
                await dummyClient.close()
              }
            }

          })

          it('Prefers the AEROSPIKE_CLIENT_CONFIG_URL value over all other values', async function () {

            const config: any = {
              hosts: helper.config.hosts,
              user: helper.config.user,
              password: helper.config.password,
              
            }


            process.env.AEROSPIKE_CLIENT_CONFIG_URL = dyn_config_path;

            config.configProvider = {
              path: dyn_config_path_send_key_true,
              interval: 1000
            }

            config.policies = { 
              write: new Aerospike.WritePolicy({
                key: Aerospike.policy.key.SEND
              })
            }

            let dummyClient = null;
            try{
              dummyClient = await Aerospike.connect(config)
              await new Promise(r => setTimeout(r, 3000));

              try{
                await dummyClient.remove(key)
              }
              catch(error: any){

              }

              let record = await dummyClient.put(key, {"a": 1})

              let query: any = dummyClient.query(helper.namespace, helper.set)
              let records: any = await query.results()

              await new Promise(r => setTimeout(r, 3000));

              expect(records[0].key.key).to.be.undefined

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
    })

    context('Negative tests', function () {
      context('configProvider', function () {
        context('path', function () {
          


          it('Fails when path value is invalid', async function () {
            const config: any = {
              hosts: helper.config.hosts,
              user: helper.config.user,
              password: helper.config.password,
              
            }

            config.configProvider = {
              path: 10,
            }

            let dummyClient = null;

            try{
              dummyClient = await Aerospike.connect(config)
              assert.fail('AN ERROR SHOULD HAVE BEEN THROWN')
            }
            catch(error: any) {
              expect(error.message).to.eql('Invalid client configuration')
            }

          })
          

          it('Does not crash when path does not exist', async function () {
            const config: any = {
              hosts: helper.config.hosts,
              user: helper.config.user,
              password: helper.config.password,
              
            }

            config.configProvider = {
              path: 'fake/directory/',
            }

            let dummyClient = null;


            dummyClient = await Aerospike.connect(config)
            
            await dummyClient.close()
          })


        })

        context('interval', function () {
          it('Fails when value is invalid', async function () {
            const config: any = {
              hosts: helper.config.hosts,
              user: helper.config.user,
              password: helper.config.password,
              
            }

            config.configProvider = {
              interval: 'invalid',
            }

            let dummyClient = null;

            try{
              dummyClient = await Aerospike.connect(config)
              assert.fail('AN ERROR SHOULD HAVE BEEN THROWN')
            }
            catch(error: any) {
              expect(error.message).to.eql('Invalid client configuration')
            }
          })

          it('Fails when value is too small', async function () {
            const config: any = {
              hosts: helper.config.hosts,
              user: helper.config.user,
              password: helper.config.password,
              
            }


            config.configProvider = {
              path: dyn_config_path,
              interval: 1,
            }

            let dummyClient: any = null;

            try{
              dummyClient = await Aerospike.connect(config)
              let record = await dummyClient.put(key, {"a": 1})



              await new Promise(r => setTimeout(r, 3000));
              assert.fail('AN ERROR SHOULD HAVE BEEN THROWN')
            }
            catch(error: any) {
              expect(error.message).to.eql('Dynamic config interval 1 must be greater or equal to the tend interval 1000')
            }
            finally{
              if(dummyClient){
                await dummyClient.close()
              }
            }
          })

          it('Fails when value is a decimal', async function () {
            const config: any = {
              hosts: helper.config.hosts,
              user: helper.config.user,
              password: helper.config.password,
              
            }

            config.configProvider = {
              path: dyn_config_path_send_key_true,
              interval: 0.20,
            }

            let dummyClient: any = null;

            try{
              dummyClient = await Aerospike.connect(config)

              let record = await dummyClient.put(key, {"a": 1})


              await new Promise(r => setTimeout(r, 3000));
              assert.fail('AN ERROR SHOULD HAVE BEEN THROWN')
            }
            catch(error: any) {
              expect(error.message).to.eql('Dynamic config interval 0 must be greater or equal to the tend interval 1000')
            }
            finally{
              if(dummyClient){
                await dummyClient.close()
              }
            }

          })

        })
      })
    })
  })
})