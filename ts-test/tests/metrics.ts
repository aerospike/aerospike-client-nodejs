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
import Aerospike, { Client as Cli, Node, NamespaceMetrics, ConnectionStats, Cluster, MetricsPolicy, MetricsListeners, WritePolicy, Query, RecordStream} from 'aerospike';

const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

import { expect, assert } from 'chai';

import * as helper from './test_helper';

import * as fs from 'fs';



describe('Metrics tests', function () {
  this.timeout(40000)
  const client: Cli = helper.client

  //helper.skipUnlessAdvancedMetrics(this)


  const blank_policy: MetricsPolicy = new Aerospike.MetricsPolicy()

  let enableTriggered: boolean = false
  let disableTriggered: boolean = false
  let snapshotTriggered: boolean = false

  let metricsLogFolder = '.'

  function enableListener() {
    enableTriggered = true
    return
  }

  function snapshotListener(cluster: Cluster) {
    snapshotTriggered = true
    return
  }

  function disableListener(cluster: Cluster) {
    disableTriggered = true
    return
  }

  function emptyListener() {

  }

  function emptyNodeListener(node: Node) {

  }


  function emptyClusterListener(cluster: Cluster) {

  }

  function enable_throw_exc() {
    throw new Error(`enable threw an error`)
  }



  function disable_throw_exc( Cluster: any ){
    throw new Error(`disable threw an error`)
  }

  let clusterFromDisableListener: any = null
  let clusterFromSnapshotListener: any = null

  function snapshotSaveListener(cluster: Cluster) {
    clusterFromSnapshotListener = cluster

    return
  }

  function disableSaveListener(cluster: Cluster) {
    clusterFromDisableListener = cluster
    return
  }

  context('Positive Tests', function () { 


    context('MetricsPolicy', function () { 
      context('enableListner', function () {

        it('Ensures custom listener is called', async function () { 
          let listeners: MetricsListeners = new Aerospike.MetricsListeners(
            {
              enableListener,
              disableListener: emptyClusterListener,
              nodeCloseListener: emptyNodeListener,
              snapshotListener: emptyClusterListener
            }
          )

          let policy: MetricsPolicy = new MetricsPolicy({
              metricsListeners: listeners,
            }
          )


          await client.enableMetrics(policy)


          //await new Promise(r => setTimeout(r, 3000));


          await client.disableMetrics()

        })
        
      })

      context('nodeCloseListener', function () {

          it('fails when non-function is given', async function () { 

              let listeners: any = new Aerospike.MetricsListeners(
                  {
                      enableListener: emptyListener,
                      snapshotListener: emptyClusterListener,
                      disableListener: emptyClusterListener,
                      nodeCloseListener: 10 as any,
                  }
              )

              let policy: MetricsPolicy = new MetricsPolicy({
                      metricsListeners: listeners,
                  }
              )
              
              try{
                  await client.enableMetrics(policy)
                  assert.fail("AN ERROR SHOULD HAVE BEEN CAUGHT")

              }
              catch(error: any){
                  expect(error.message).to.eql("nodeCloseListener must be a function")
                  expect(error instanceof TypeError).to.eql(true)
              }
              await client.disableMetrics()

          })
      })

      context('snapshotListener', function () { 

        it('Ensures custom listener is called', async function () { 
          let listeners: MetricsListeners = new Aerospike.MetricsListeners(
            {
              enableListener: emptyListener,
              disableListener: emptyClusterListener,
              nodeCloseListener: emptyNodeListener,
              snapshotListener
            }
          )

          let policy: MetricsPolicy = new MetricsPolicy({
              metricsListeners: listeners,
            }
          )


          await client.enableMetrics(policy)

          await client.disableMetrics()

        })
        
      })

      context('disableListener', function () { 

        it('Ensures custom listener is called', async function () { 
          let listeners: MetricsListeners = new Aerospike.MetricsListeners(
            {
              enableListener: emptyListener,
              disableListener,
              nodeCloseListener: emptyNodeListener,
              snapshotListener: emptyClusterListener
            }
          )

          let policy: MetricsPolicy = new MetricsPolicy({
              metricsListeners: listeners,
            }
          )

          await client.enableMetrics(policy)

          await client.disableMetrics()

        })
        
      })


      context('reportDir', function () { 

        it('Writes to a valid sub directory', async function () { 

          await execAsync('rm -rf metrics_sub_dir/reportDir/metrics-*');

          await execAsync('mkdir  metrics_sub_dir/reportDir/metrics-*');

          let result = await execAsync('find metrics_sub_dir/reportDir/ -type f | wc -l');


          expect(Number(result.stdout.trim())).to.eql(0)


          let policy: MetricsPolicy = new MetricsPolicy({
              reportDir: './metrics_sub_dir/reportDir',
              interval: 1
            }
          )


          await client.enableMetrics(policy)


          await client.disableMetrics()


          result = await execAsync('find metrics_sub_dir/reportDir -type f | wc -l');

          expect(Number(result.stdout.trim())).to.eql(1)

        })

      })

      context('interval', function () { 

        it('Default interval is overridden and only one report is written', async function () { 

          await execAsync('rm -rf metrics_sub_dir/interval/metrics-*');

          await execAsync('mkdir metrics_sub_dir/interval/metrics-*');

          let result = await execAsync('find metrics_sub_dir/interval/ -type f | wc -l');

          expect(Number(result.stdout.trim())).to.eql(0)

          let policy: MetricsPolicy = new MetricsPolicy({
              reportDir: './metrics_sub_dir/interval',
              interval: 1
            }
          )

          await client.enableMetrics(policy)

          await new Promise(r => setTimeout(r, 3000));

          await client.disableMetrics()

          result = await execAsync('cat metrics_sub_dir/interval/metrics-2* | wc -l');

          expect(Number(result.stdout.trim())).to.be.greaterThan(3)
        })

      })

      context('reportSizeLimit', function () { 

        it('Accepts a valid reportSizeLimit', async function () { 

          await execAsync('rm -rf metrics_sub_dir/reportSizeLimit/metrics-*');

          await execAsync('mkdir metrics_sub_dir/reportSizeLimit/metrics-*');

          let result = await execAsync('find metrics_sub_dir/reportSizeLimit/ -type f | wc -l');

          expect(Number(result.stdout.trim())).to.eql(0)

          let policy: MetricsPolicy = new MetricsPolicy({
              reportDir: './metrics_sub_dir/reportSizeLimit',
              reportSizeLimit: 1000002
            }
          )

          await client.enableMetrics(policy)

          await client.disableMetrics()

        })

      })

      context('latencyColumns', function () { 

        it('Ensures correct column value in metrics file header', async function () { 

          await execAsync('rm -rf metrics_sub_dir/latencyColumns/metrics-*');

          await execAsync('mkdir metrics_sub_dir/reportSizeLimit/metrics-*');

          let result = await execAsync('find metrics_sub_dir/latencyColumns/ -type f | wc -l');

          expect(Number(result.stdout.trim())).to.eql(0)

          let policy: MetricsPolicy = new MetricsPolicy({
              reportDir: './metrics_sub_dir/latencyColumns',
              latencyColumns: 11
            }
          )

          await client.enableMetrics(policy)

          await client.disableMetrics()

          result = await execAsync('cat metrics_sub_dir/latencyColumns/metrics-2*');

          expect(result.stdout.trim().split("latency(")[1].split(")")[0]).to.eql("11,1")

        })
      })

      context('latencyShift', function () { 

        it('Ensures correct shift value in metrics file header', async function () { 

          await execAsync('rm -rf metrics_sub_dir/latencyShift/metrics-*');

          await execAsync('mkdir metrics_sub_dir/latencyShift/metrics-*');

          let result = await execAsync('find metrics_sub_dir/latencyShift/ -type f | wc -l');

          expect(Number(result.stdout.trim())).to.eql(0)

          let policy: MetricsPolicy = new MetricsPolicy({
              reportDir: './metrics_sub_dir/latencyShift',
              latencyShift: 3
            }
          )

          await client.enableMetrics(policy)

          await client.disableMetrics()

          result = await execAsync('cat metrics_sub_dir/latencyShift/metrics-2*');

          expect(result.stdout.trim().split("latency(")[1].split(")")[0]).to.eql("7,3")

        })
      })

      context('labels', function () { 

        it('Ensures correct labels in metrics file first report', async function () { 

          await execAsync('rm -rf metrics_sub_dir/labels/metrics-*');

          await execAsync('mkdir metrics_sub_dir/labels/metrics-*');

          let result = await execAsync('find metrics_sub_dir/labels/ -type f | wc -l');

          expect(Number(result.stdout.trim())).to.eql(0)

          let policy: MetricsPolicy = new MetricsPolicy({
              reportDir: './metrics_sub_dir/labels',
              labels: {
                "size": "large",
                "discount": "normal"
              }
            }
          )

          await client.enableMetrics(policy)

          await client.disableMetrics()

          result = await execAsync('cat metrics_sub_dir/labels/metrics-2*');
          let token = result.stdout.trim().split("\n")[1].split(",")
          let concat_string = token[4] + token[5] + token[6] + token[7]
          expect(concat_string).to.eql("[[sizelarge][discountnormal]]")

        })
      })

    })

    context('cluster', function () {

      context('appId', function () { 
        it('Ensures appId is correct', async function () { 
          const config: any = {
            hosts: helper.config.hosts,
            user: helper.config.user,
            password: helper.config.password,
            appId: 'destiny'
          }

          let listeners: MetricsListeners = new Aerospike.MetricsListeners(
            {
              enableListener: emptyListener,
              disableListener: disableSaveListener,
              nodeCloseListener: emptyNodeListener,
              snapshotListener: snapshotSaveListener
            }
          )

          let policy: MetricsPolicy = new MetricsPolicy({
              metricsListeners: listeners,
              interval: 1,
            }
          )


          let dummyClient = null;
          dummyClient = await Aerospike.connect(config)

          await dummyClient.enableMetrics(policy)


          await new Promise(r => setTimeout(r, 1500));

          await dummyClient.disableMetrics()

          await new Promise(r => setTimeout(r, 0));

          for (const cluster of [clusterFromSnapshotListener, clusterFromDisableListener]) {
            expect(cluster.appId).to.eql('destiny')

          }

          await new Promise(r => setTimeout(r, 3000));

          await dummyClient.close()




        })
      })

      context('clusterName', function () { 
        it('Ensures clusterName is correct', async function () { 
          const config: any = {
              hosts: helper.config.hosts,
              user: helper.config.user,
              password: helper.config.password
            }

          let listeners: MetricsListeners = new Aerospike.MetricsListeners(
            {
              enableListener: emptyListener,
              disableListener: disableSaveListener,
              nodeCloseListener: emptyNodeListener,
              snapshotListener: snapshotSaveListener
            }
          )

          let policy: MetricsPolicy = new MetricsPolicy({
              metricsListeners: listeners,
              interval: 1,
            }
          )


          let dummyClient = null;
          dummyClient = await Aerospike.connect(config)

          await dummyClient.enableMetrics(policy)

          await new Promise(r => setTimeout(r, 1500));


          await dummyClient.disableMetrics()

          await new Promise(r => setTimeout(r, 0));

          for (const cluster of [clusterFromSnapshotListener, clusterFromDisableListener]) {
            expect(cluster.clusterName).to.eql('')
          }

          await new Promise(r => setTimeout(r, 3000));

          await dummyClient.close()




        })
      })

      context('commandCount', function () { 
        it('Ensures commandCount is correct', async function () { 
          const config: any = {
              hosts: helper.config.hosts,
              user: helper.config.user,
              password: helper.config.password
            }

          let listeners: MetricsListeners = new Aerospike.MetricsListeners(
            {
              enableListener: emptyListener,
              disableListener: disableSaveListener,
              nodeCloseListener: emptyNodeListener,
              snapshotListener: snapshotSaveListener
            }
          )

          let policy: MetricsPolicy = new MetricsPolicy({
              metricsListeners: listeners,
              interval: 1,
            }
          )



          await client.enableMetrics(policy)

          await client.put(new Aerospike.Key(helper.namespace, helper.set, 'metrics/31'), {a: 1})

          await new Promise(r => setTimeout(r, 1500));

          await client.disableMetrics()

          await new Promise(r => setTimeout(r, 0));

          for (const cluster of [clusterFromSnapshotListener, clusterFromDisableListener]) {
            expect(cluster.commandCount).to.be.greaterThan(0)
          }

          await new Promise(r => setTimeout(r, 3000));




        })
      })


      context('invalidNodeCount', function () { 
        it('Ensures invalidNodeCount is correct', async function () { 
          let temp: any = [helper.config.hosts[0]]
          temp.push({ addr: '0.0.0.0', port: 3100 })
          const config: any = {
              hosts: temp,
              
              user: helper.config.user,
              password: helper.config.password
            }

          let listeners: MetricsListeners = new Aerospike.MetricsListeners(
            {
              enableListener: emptyListener,
              disableListener: disableSaveListener,
              nodeCloseListener: emptyNodeListener,
              snapshotListener: snapshotSaveListener
            }
          )

          let policy: MetricsPolicy = new MetricsPolicy({
              metricsListeners: listeners,
              interval: 1,
            }
          )


          await client.enableMetrics(policy)

          await new Promise(r => setTimeout(r, 1500));

          await client.disableMetrics()

          await new Promise(r => setTimeout(r, 0));

          for (const cluster of [clusterFromSnapshotListener, clusterFromDisableListener]) {
            expect(cluster.invalidNodeCount).to.eql(0)
          }

          await new Promise(r => setTimeout(r, 3000));





        })
      })

      context('transactionCount', function () { 
        it('Ensures transactionCount is correct', async function () {
          const config: any = {
              hosts: helper.config.hosts,
              user: helper.config.user,
              password: helper.config.password
            }

          let listeners: MetricsListeners = new Aerospike.MetricsListeners(
            {
              enableListener: emptyListener,
              disableListener: disableSaveListener,
              nodeCloseListener: emptyNodeListener,
              snapshotListener: snapshotSaveListener
            }
          )

          let policy: MetricsPolicy = new MetricsPolicy({
              metricsListeners: listeners,
              interval: 1,
            }
          )


          let dummyClient: any = null;

          dummyClient = await Aerospike.connect(config)

          await dummyClient.enableMetrics(policy)


          await new Promise(r => setTimeout(r, 1500));

          await dummyClient.put(new Aerospike.Key(helper.namespace, helper.set, 'metrics/31'), {a: 1})

          await new Promise(r => setTimeout(r, 1500));

          await dummyClient.disableMetrics()

          await new Promise(r => setTimeout(r, 0));

          for (const cluster of [clusterFromSnapshotListener, clusterFromDisableListener]) {
            expect(cluster.transactionCount).to.be.greaterThan(0)
          }

          await new Promise(r => setTimeout(r, 3000));

          await dummyClient.close()




        })
      })


      context('delayQueueTimeoutCount', function () { 
        it('Ensures delayQueueTimeout is correct', async function () {
          const config: any = {
              hosts: helper.config.hosts,
              user: helper.config.user,
              password: helper.config.password
            }

          let listeners: MetricsListeners = new Aerospike.MetricsListeners(
            {
              enableListener: emptyListener,
              disableListener: disableSaveListener,
              nodeCloseListener: emptyNodeListener,
              snapshotListener: snapshotSaveListener
            }
          )

          let policy: MetricsPolicy = new MetricsPolicy({
              metricsListeners: listeners,
              interval: 1,
            }
          )


          let dummyClient: any = null;

          dummyClient = await Aerospike.connect(config)

          await dummyClient.enableMetrics(policy)

          await new Promise(r => setTimeout(r, 1500));

          await client.put(new Aerospike.Key(helper.namespace, helper.set, 'metrics/31'), {a: 1})

          await new Promise(r => setTimeout(r, 1500));

          await dummyClient.disableMetrics()

          await new Promise(r => setTimeout(r, 0));

          for (const cluster of [clusterFromSnapshotListener, clusterFromDisableListener]) {
            expect(cluster.delayQueueTimeoutCount).to.eql(0)
          }

          await new Promise(r => setTimeout(r, 3000));

          await dummyClient.close()



        })
      })

      context('retryCount', function () { 
        it('Ensures retryCount is correct', async function () {
          const config: any = {
              hosts: helper.config.hosts,
              user: helper.config.user,
              password: helper.config.password
            }

          let listeners: MetricsListeners = new Aerospike.MetricsListeners(
            {
              enableListener: emptyListener,
              disableListener: disableSaveListener,
              nodeCloseListener: emptyNodeListener,
              snapshotListener: snapshotSaveListener
            }
          )

          let policy: MetricsPolicy = new MetricsPolicy({
              metricsListeners: listeners,
              interval: 1,
            }
          )


          let dummyClient: any = null;

          dummyClient = await Aerospike.connect(config)

          await dummyClient.enableMetrics(policy)

          await new Promise(r => setTimeout(r, 1500));

          let readPolicy = new Aerospike.ReadPolicy({
            maxRetries: 6
          })
          try{
            await dummyClient.get(new Aerospike.Key(helper.namespace, helper.set, 'metrics/51'), readPolicy)
          }
          catch(error: any){
          }

          await new Promise(r => setTimeout(r, 1500));

          await dummyClient.disableMetrics()

          await new Promise(r => setTimeout(r, 0));

          for (const cluster of [clusterFromSnapshotListener, clusterFromDisableListener]) {
            expect(cluster.retryCount).to.eql(0)
          }

          await new Promise(r => setTimeout(r, 3000));

          await dummyClient.close()



        })
      })

      context('delayQueueTimeoutCount', function () { 
        it('Ensures delayQueueTimeout is correct', async function () {
          const config: any = {
              hosts: helper.config.hosts,
              user: helper.config.user,
              password: helper.config.password
            }

          let listeners: MetricsListeners = new Aerospike.MetricsListeners(
            {
              enableListener: emptyListener,
              disableListener: disableSaveListener,
              nodeCloseListener: emptyNodeListener,
              snapshotListener: snapshotSaveListener
            }
          )

          let policy: MetricsPolicy = new MetricsPolicy({
              metricsListeners: listeners,
              interval: 1,
            }
          )


          let dummyClient: any = null;

          dummyClient = await Aerospike.connect(config)

          await dummyClient.enableMetrics(policy)

          await new Promise(r => setTimeout(r, 1500));

          await client.put(new Aerospike.Key(helper.namespace, helper.set, 'metrics/31'), {a: 1})

          await new Promise(r => setTimeout(r, 1500));

          await dummyClient.disableMetrics()

          await new Promise(r => setTimeout(r, 0));

          for (const cluster of [clusterFromSnapshotListener, clusterFromDisableListener]) {
            expect(cluster.delayQueueTimeoutCount).to.eql(0)
          }

          await new Promise(r => setTimeout(r, 3000));

          await dummyClient.close()



        })
      })

      context('eventLoop', function () { 
        it('Ensures delayQueueTimeout is correct', async function () {
          const config: any = {
              hosts: helper.config.hosts,
              user: helper.config.user,
              password: helper.config.password
            }

          let listeners: MetricsListeners = new Aerospike.MetricsListeners(
            {
              enableListener: emptyListener,
              disableListener: disableSaveListener,
              nodeCloseListener: emptyNodeListener,
              snapshotListener: snapshotSaveListener
            }
          )

          let policy: MetricsPolicy = new MetricsPolicy({
              metricsListeners: listeners,
              interval: 1,
            }
          )


          let dummyClient: any = null;

          dummyClient = await Aerospike.connect(config)

          await dummyClient.enableMetrics(policy)

          await new Promise(r => setTimeout(r, 1500));

          await client.put(new Aerospike.Key(helper.namespace, helper.set, 'metrics/31'), {a: 1})

          await new Promise(r => setTimeout(r, 1500));

          await dummyClient.disableMetrics()

          await new Promise(r => setTimeout(r, 0));

          for (const cluster of [clusterFromSnapshotListener, clusterFromDisableListener]) {
            expect(cluster.eventLoop.queueSize).to.eql(0)
            expect(cluster.eventLoop.processSize).to.eql(0)
          }

          await new Promise(r => setTimeout(r, 3000));

          await dummyClient.close()



        })
      })

      context('nodes', function () { 
        context('name', function () { 
          it('Ensures name is correct', async function () {
            const config: any = {
                hosts: helper.config.hosts,
                user: helper.config.user,
                password: helper.config.password
              }

            let listeners: MetricsListeners = new Aerospike.MetricsListeners(
              {
                enableListener: emptyListener,
                disableListener: disableSaveListener,
                nodeCloseListener: emptyNodeListener,
                snapshotListener: snapshotSaveListener
              }
            )

            let policy: MetricsPolicy = new MetricsPolicy({
                metricsListeners: listeners,
                interval: 1,
              }
            )


            let dummyClient: any = null;

            dummyClient = await Aerospike.connect(config)

            await dummyClient.enableMetrics(policy)

            await new Promise(r => setTimeout(r, 1500));

            await client.put(new Aerospike.Key(helper.namespace, helper.set, 'metrics/31'), {a: 1})

            await new Promise(r => setTimeout(r, 1500));

            await dummyClient.disableMetrics()

            await new Promise(r => setTimeout(r, 0));

            for (const cluster of [clusterFromSnapshotListener, clusterFromDisableListener]) {
              for (const node of cluster.nodes) {
                expect(node.name).to.eql('A1')
              }
            }

            await new Promise(r => setTimeout(r, 3000));

            await dummyClient.close()



          })
        })

        context('address', function () { 
          it('Ensures address is correct', async function () {
            const config: any = {
                hosts: helper.config.hosts,
                user: helper.config.user,
                password: helper.config.password
              }

            let listeners: MetricsListeners = new Aerospike.MetricsListeners(
              {
                enableListener: emptyListener,
                disableListener: disableSaveListener,
                nodeCloseListener: emptyNodeListener,
                snapshotListener: snapshotSaveListener
              }
            )

            let policy: MetricsPolicy = new MetricsPolicy({
                metricsListeners: listeners,
                interval: 1,
              }
            )


            let dummyClient: any = null;

            dummyClient = await Aerospike.connect(config)

            await dummyClient.enableMetrics(policy)

            await new Promise(r => setTimeout(r, 1500));

            await client.put(new Aerospike.Key(helper.namespace, helper.set, 'metrics/31'), {a: 1})

            await new Promise(r => setTimeout(r, 1500));

            await dummyClient.disableMetrics()

            await new Promise(r => setTimeout(r, 0));

            for (const cluster of [clusterFromSnapshotListener, clusterFromDisableListener]) {
              for (const node of cluster.nodes) {
                expect(node.address).to.eql('127.0.0.1')
                if((helper.config.hosts[0] as any).addr == 'localhost'){
                  expect(node.address).to.eql('127.0.0.1')

                }
                else{
                  expect(node.address).to.eql((helper.config.hosts[0] as any).addr)

                }
              }
            }

            await new Promise(r => setTimeout(r, 3000));

            await dummyClient.close()



          })
        })

        context('port', function () { 
          it('Ensures port is correct', async function () {
            const config: any = {
                hosts: helper.config.hosts,
                user: helper.config.user,
                password: helper.config.password
              }

            let listeners: MetricsListeners = new Aerospike.MetricsListeners(
              {
                enableListener: emptyListener,
                disableListener: disableSaveListener,
                nodeCloseListener: emptyNodeListener,
                snapshotListener: snapshotSaveListener
              }
            )

            let policy: MetricsPolicy = new MetricsPolicy({
                metricsListeners: listeners,
                interval: 1,
              }
            )


            let dummyClient: any = null;

            dummyClient = await Aerospike.connect(config)

            await dummyClient.enableMetrics(policy)

            await new Promise(r => setTimeout(r, 1500));

            await client.put(new Aerospike.Key(helper.namespace, helper.set, 'metrics/31'), {a: 1})

            await new Promise(r => setTimeout(r, 1500));

            await dummyClient.disableMetrics()

            await new Promise(r => setTimeout(r, 0));

            for (const cluster of [clusterFromSnapshotListener, clusterFromDisableListener]) {
              for (const node of cluster.nodes) {
                expect(node.port).to.eql(3000)
                expect(node.port).to.eql((helper.config.hosts[0] as any).port)
              }
            }

            await new Promise(r => setTimeout(r, 3000));

            await dummyClient.close()



          })
        })

        context('conns', function () { 
          it('Ensures conns is correct', async function () {
            const config: any = {
                hosts: helper.config.hosts,
                user: helper.config.user,
                password: helper.config.password
              }

            let listeners: MetricsListeners = new Aerospike.MetricsListeners(
              {
                enableListener: emptyListener,
                disableListener: disableSaveListener,
                nodeCloseListener: emptyNodeListener,
                snapshotListener: snapshotSaveListener
              }
            )

            let policy: MetricsPolicy = new MetricsPolicy({
                metricsListeners: listeners,
                interval: 1,
              }
            )


            let dummyClient: any = null;

            dummyClient = await Aerospike.connect(config)

            await dummyClient.enableMetrics(policy)

            await new Promise(r => setTimeout(r, 1500));

            await client.put(new Aerospike.Key(helper.namespace, helper.set, 'metrics/31'), {a: 1})

            await new Promise(r => setTimeout(r, 1500));

            await dummyClient.disableMetrics()

            await new Promise(r => setTimeout(r, 0));

            for (const cluster of [clusterFromSnapshotListener, clusterFromDisableListener]) {
              for (const node of cluster.nodes) {
                expect(node.conns.inUse).to.be.a('number')
                expect(node.conns.inPool).to.be.a('number')
                expect(node.conns.opened).to.be.a('number')
                expect(node.conns.closed).to.be.a('number')
              }
            }

            await new Promise(r => setTimeout(r, 3000));

            await dummyClient.close()



          })
        })
      })
    })

    context('namespaceMetrics', function () {




      context('ns', function () { 

        it('Ensures namespace is correct', async function () { 

          let stringNotEmpty = false

          let listeners: MetricsListeners = new Aerospike.MetricsListeners(
            {
              enableListener: emptyListener,
              disableListener: disableSaveListener,
              nodeCloseListener: emptyNodeListener,
              snapshotListener: snapshotSaveListener
            }
          )

          let policy: MetricsPolicy = new MetricsPolicy({
              metricsListeners: listeners,
              interval: 1,
            }
          )



          await client.enableMetrics(policy)

          await client.put(new Aerospike.Key(helper.namespace, helper.set, 'metrics/1'), {a: 1})


          await new Promise(r => setTimeout(r, 1500));

          await client.disableMetrics()

            await new Promise(r => setTimeout(r, 0));

            for (const cluster of [clusterFromSnapshotListener, clusterFromDisableListener]) {
              for (const node of cluster.nodes) {
              let NamespaceMetrics: Array<NamespaceMetrics> = node.metrics
              for (const index of node.metrics) {

                expect(index.ns).to.be.a("string")
                if(index.ns != ''){
                  stringNotEmpty = true
                }
              }
            }
          }
          expect(stringNotEmpty).to.eql(true)
          clusterFromSnapshotListener = null

          clusterFromDisableListener = null

        })
      })


      context('bytesIn', function () { 

        it('Ensures updated bytesIn value is relayed to the user', async function () { 

          let listeners: MetricsListeners = new Aerospike.MetricsListeners(
            {
              enableListener: emptyListener,
              disableListener: disableSaveListener,
              nodeCloseListener: emptyNodeListener,
              snapshotListener: snapshotSaveListener
            }
          )

          let policy: MetricsPolicy = new MetricsPolicy({
              metricsListeners: listeners,
              interval: 1,
            }
          )



          await client.enableMetrics(policy)



          await new Promise(r => setTimeout(r, 1500));


          await client.disableMetrics()

          await new Promise(r => setTimeout(r, 0));

          for (const cluster of [clusterFromSnapshotListener, clusterFromDisableListener]) {

            for (const node of cluster.nodes) {
              let NamespaceMetrics: Array<NamespaceMetrics> = node.metrics
              for (const index of node.metrics) {
                expect(index.bytesIn).to.be.greaterThan(0)
              }
            }
          }

          clusterFromSnapshotListener = null

          clusterFromDisableListener = null

        })

      })

      context('bytesOut', function () { 

        it('Ensures updated bytesOut value is relayed to the user', async function () { 

          let listeners: MetricsListeners = new Aerospike.MetricsListeners(
            {
              enableListener: emptyListener,
              disableListener: disableSaveListener,
              nodeCloseListener: emptyNodeListener,
              snapshotListener: snapshotSaveListener
            }
          )

          let policy: MetricsPolicy = new MetricsPolicy({
              metricsListeners: listeners,
              interval: 1,
            }
          )



          await client.enableMetrics(policy)

          await new Promise(r => setTimeout(r, 1500));


          await client.disableMetrics()

          await new Promise(r => setTimeout(r, 0));

          for (const cluster of [clusterFromSnapshotListener, clusterFromDisableListener]) {
            for (const node of cluster.nodes) {
              let NamespaceMetrics: Array<NamespaceMetrics> = node.metrics
              for (const index of node.metrics) {

                expect(index.bytesOut).to.be.greaterThan(0)
              }
            }
          }

          clusterFromSnapshotListener = null

          clusterFromDisableListener = null          
        })

      })

      context('errorCount', function () { 

        let totalErrorCount = 0

        function listenerErrorCount(cluster: Cluster) {
          for (const node of cluster.nodes) {
            let NamespaceMetrics: Array<NamespaceMetrics> = node.metrics
            for (const index of NamespaceMetrics) {
              totalErrorCount += index.errorCount
            }
          }
        }

        it('Ensures updated errorCount value is relayed to the user', async function () { 

          let listeners: MetricsListeners = new Aerospike.MetricsListeners(
            {
              enableListener: emptyListener,
              disableListener: listenerErrorCount,
              nodeCloseListener: emptyNodeListener,
              snapshotListener: listenerErrorCount
            }
          )

          let policy: MetricsPolicy = new MetricsPolicy({
              metricsListeners: listeners,
              interval: 1,
            }
          )


          await client.enableMetrics(policy)

          const writePolicy: WritePolicy = new Aerospike.policy.WritePolicy({
            exists: Aerospike.policy.exists.UPDATE
          })

          // FINISH HERE!!!!  THIS SHOULDN"T THROW ERROR OUTSIDE BUT IT DOES
          await new Promise(r => setTimeout(r, 3000));


          const query: Query = client.query(helper.namespace, helper.set)

          const stream: RecordStream = query.foreach()



          stream.on('data', () => {
            stream.abort()
          })
          stream.on('error', (error) => {
            
          })




          await new Promise(r => setTimeout(r, 6000));


          await client.disableMetrics()

          await new Promise(r => setTimeout(r, 0));

          expect(totalErrorCount).to.be.greaterThan(0)

          clusterFromSnapshotListener = null

          clusterFromDisableListener = null  

        })

      })

      context('timeoutCount', function () { 


        let totalTimeoutCount = 0

        function listenerTimeoutCount(cluster: Cluster) {
          for (const node of cluster.nodes) {
            let NamespaceMetrics: Array<NamespaceMetrics> = node.metrics
            for (const index of NamespaceMetrics) {
              totalTimeoutCount += index.timeoutCount
            }
          }
          return
        }



        it('Ensures updated timeoutCount value is relayed to the user', async function () { 
  


          let listeners: MetricsListeners = new Aerospike.MetricsListeners(
            {
              enableListener: emptyListener,
              disableListener: listenerTimeoutCount,
              nodeCloseListener: emptyNodeListener,
              snapshotListener: listenerTimeoutCount
            }
          )

          let policy: MetricsPolicy = new MetricsPolicy({
              metricsListeners: listeners,
              interval: 1,
            }
          )


          await client.enableMetrics(policy)

          await new Promise(r => setTimeout(r, 3000));

          const writePolicy: WritePolicy = new Aerospike.policy.WritePolicy({
            totalTimeout: 1 
          })

          try{
            await client.put(new Aerospike.Key(helper.namespace, helper.set, 'metrics/2'), { i: 49 }, {}, writePolicy)
            assert.fail("AN ERROR SHOULD HAVE ")
          }
          catch(error: any){
            expect(error.code).to.eql(9)

          }

          try{
            await client.put(new Aerospike.Key(helper.namespace, helper.set, 'metrics/2'), { i: 49 }, {}, writePolicy)
            assert.fail("AN ERROR SHOULD HAVE ")
          }
          catch(error: any){
            expect(error.code).to.eql(9)

          }

          try{
            await client.put(new Aerospike.Key(helper.namespace, helper.set, 'metrics/2'), { i: 49 }, {}, writePolicy)
            assert.fail("AN ERROR SHOULD HAVE ")
          }
          catch(error: any){
            expect(error.code).to.eql(9)

          }

          await new Promise(r => setTimeout(r, 6000));



          await client.disableMetrics()

          await new Promise(r => setTimeout(r, 0));

          expect(totalTimeoutCount).to.be.greaterThan(0)

          clusterFromSnapshotListener = null

          clusterFromDisableListener = null       
        })

      })


      context('connLatency', function () {

        let totalConnLatency = 0

        function listenerConnLatency(cluster: Cluster) {
          for (const node of cluster.nodes) {
            let NamespaceMetrics: Array<NamespaceMetrics> = node.metrics
            for (const index of NamespaceMetrics) {
              for(const i of index.connLatency){
                totalConnLatency += i
              }
              
            }
          }
        }

        it('Ensures histogram matches the histogram settings', async function () { 
          const config: any = {
            hosts: helper.config.hosts,
            user: helper.config.user,
            password: helper.config.password,
            
          }




          let listeners: MetricsListeners = new Aerospike.MetricsListeners(
            {
              enableListener: emptyListener,
              disableListener: listenerConnLatency,
              nodeCloseListener: emptyNodeListener,
              snapshotListener: listenerConnLatency
            }
          )

          let policy: MetricsPolicy = new MetricsPolicy({
              metricsListeners: listeners,
              interval: 1,
            }
          )

          await client.enableMetrics(policy)


          await new Promise(r => setTimeout(r, 1500));   
          let promiseList = []
          for (var i = 0; i < 100; i++) {
            let key = new Aerospike.Key('test', 'demo', 1)
            promiseList.push(client.put(key, {a: 1}))


          }
          try{
            const results = await Promise.all(promiseList)

          }
          catch(error: any){

          }

          await new Promise(r => setTimeout(r, 3000));

          await new Promise(r => setTimeout(r, 0));


          expect(totalConnLatency).to.be.greaterThan(0)

          clusterFromSnapshotListener = null

          clusterFromDisableListener = null
        })

      })

      context('writeLatency', function () {
        let totalWriteLatency = 0

        function listenerWriteLatency(cluster: Cluster) {
          for (const node of cluster.nodes) {
            let NamespaceMetrics: Array<NamespaceMetrics> = node.metrics
            for (const index of NamespaceMetrics) {
              for(const i of index.writeLatency){
                totalWriteLatency += i
              }
              
            }
          }
        }

        it('Ensures histogram returns non-zero values', async function () { 


          const config: any = {
            hosts: helper.config.hosts,
            user: helper.config.user,
            password: helper.config.password,
            
          }




          let listeners: MetricsListeners = new Aerospike.MetricsListeners(
            {
              enableListener: emptyListener,
              disableListener: listenerWriteLatency,
              nodeCloseListener: emptyNodeListener,
              snapshotListener: listenerWriteLatency
            }
          )

          let policy: MetricsPolicy = new MetricsPolicy({
              metricsListeners: listeners,
              interval: 1,
            }
          )

          await client.enableMetrics(policy)

          await new Promise(r => setTimeout(r, 1500));   

          await client.put(new Aerospike.Key(helper.namespace, helper.set, 'metrics/4'), { i: 49 })



          await new Promise(r => setTimeout(r, 3000));

          await new Promise(r => setTimeout(r, 0));


          expect(totalWriteLatency).to.be.greaterThan(0)

          clusterFromSnapshotListener = null

          clusterFromDisableListener = null

        })

      })

      context('readLatency', function () {

        let totalReadLatency = 0

        function listenerReadLatency(cluster: Cluster) {
          for (const node of cluster.nodes) {
            let NamespaceMetrics: Array<NamespaceMetrics> = node.metrics
            for (const index of NamespaceMetrics) {
              for(const i of index.readLatency){
                totalReadLatency += i
              }
              
            }
          }
        }

        it('Ensures histogram returns non-zero values', async function () {

          const config: any = {
            hosts: helper.config.hosts,
            user: helper.config.user,
            password: helper.config.password,
            
          }

          let listeners: MetricsListeners = new Aerospike.MetricsListeners(
            {
              enableListener: emptyListener,
              disableListener: listenerReadLatency,
              nodeCloseListener: emptyNodeListener,
              snapshotListener: listenerReadLatency
            }
          )

          let policy: MetricsPolicy = new MetricsPolicy({
              metricsListeners: listeners,
              interval: 1,
            }
          )

          await client.enableMetrics(policy)

          await new Promise(r => setTimeout(r, 1500));   

          await client.put(new Aerospike.Key(helper.namespace, helper.set, 'metrics/5'), { i: 49 })

          await client.get(new Aerospike.Key(helper.namespace, helper.set, 'metrics/5'))

          await new Promise(r => setTimeout(r, 3000));

          await new Promise(r => setTimeout(r, 0));


          expect(totalReadLatency).to.be.greaterThan(0)

          clusterFromSnapshotListener = null

          clusterFromDisableListener = null          
        })

      })

      context('batchLatency', function () {

        let totalBatchLatency = 0

        function listenerBatchLatency(cluster: Cluster) {
          for (const node of cluster.nodes) {
            let NamespaceMetrics: Array<NamespaceMetrics> = node.metrics
            for (const index of NamespaceMetrics) {
              for(const i of index.batchLatency){
                totalBatchLatency += i
              }
              
            }
          }
        }

        it('Ensures histogram returns non-zero values', async function () {

          const config: any = {
            hosts: helper.config.hosts,
            user: helper.config.user,
            password: helper.config.password,
            
          }

          let listeners: MetricsListeners = new Aerospike.MetricsListeners(
            {
              enableListener: emptyListener,
              disableListener: listenerBatchLatency,
              nodeCloseListener: emptyNodeListener,
              snapshotListener: listenerBatchLatency
            }
          )

          let policy: MetricsPolicy = new MetricsPolicy({
              metricsListeners: listeners,
              interval: 1,
            }
          )

          await client.enableMetrics(policy)

          await new Promise(r => setTimeout(r, 1500));   

          await client.put(new Aerospike.Key(helper.namespace, helper.set, 'metrics/6'), { i: 49 })
          await client.put(new Aerospike.Key(helper.namespace, helper.set, 'metrics/7'), { i: 49 })

          const batchRecords = [
              {
                  type: Aerospike.batchType.BATCH_READ,
                  key: new Aerospike.Key(helper.namespace, helper.set, 'metrics/6'),
                  readAllBins: true
              },
              {
                  type: Aerospike.batchType.BATCH_READ,
                  key: new Aerospike.Key(helper.namespace, helper.set, 'metrics/6'),
                  readAllBins: true
              }
          ]

          await client.batchWrite(batchRecords)

          await new Promise(r => setTimeout(r, 3000));

          await new Promise(r => setTimeout(r, 0));


          expect(totalBatchLatency).to.be.greaterThan(0)

          clusterFromSnapshotListener = null

          clusterFromDisableListener = null          
        })

      })

      context('queryLatency', function () {


        let totalQueryLatency = 0

        function listenerQueryLatency(cluster: Cluster) {
          for (const node of cluster.nodes) {
            let NamespaceMetrics: Array<NamespaceMetrics> = node.metrics
            for (const index of NamespaceMetrics) {
              for(const i of index.queryLatency){
                totalQueryLatency += i
              }
              
            }
          }
        }

        it('Ensures histogram returns non-zero values', async function () {

          const config: any = {
            hosts: helper.config.hosts,
            user: helper.config.user,
            password: helper.config.password,
            
          }

          let listeners: MetricsListeners = new Aerospike.MetricsListeners(
            {
              enableListener: emptyListener,
              disableListener: listenerQueryLatency,
              nodeCloseListener: emptyNodeListener,
              snapshotListener: listenerQueryLatency
            }
          )

          let policy: MetricsPolicy = new MetricsPolicy({
              metricsListeners: listeners,
              interval: 1,
            }
          )

          await client.enableMetrics(policy)

          await new Promise(r => setTimeout(r, 1500));   

          await client.put(new Aerospike.Key(helper.namespace, helper.set, 'metrics/8'), { i: 49 })

          const query: Query = client.query(helper.namespace, helper.set)

          const stream: RecordStream = query.foreach()


          await new Promise(r => setTimeout(r, 3000));

          await new Promise(r => setTimeout(r, 0));


          expect(totalQueryLatency).to.be.greaterThan(0)

          clusterFromSnapshotListener = null

          clusterFromDisableListener = null          
        })

      })


      context('enableMetrics', function () {
        it('with no arguments', async function () { 
          await client.enableMetrics()

          await client.disableMetrics()

        })

        it('with metricsPolicy', async function () { 

          let policy: MetricsPolicy = new Aerospike.MetricsPolicy({
            reportDir: ".",
            reportSizeLimit: 1000000,
            interval: 2,
            latencyColumns: 6,
            latencyShift: 2
          })

          await client.enableMetrics()

          await client.disableMetrics()
        })

      })

      context('disableMetrics', function () {
        it('with no arguments', async function () { 
          await client.enableMetrics()

          await client.disableMetrics()
        })

      })
    })
  })

  context('Negative Tests', function () {

    context('MetricsPolicy', function () {

      context('metricsListeners', function () {

        context('one metricListener set', function () {

          it('fails when only enableListener set', async function () {
            let listeners: any = new Aerospike.MetricsListeners(
              {
                enableListener: emptyListener,

                disableListener: null as any,
                nodeCloseListener: null as any,
                snapshotListener: null as any
              }

            )

            let policy: MetricsPolicy = new MetricsPolicy({
                metricsListeners: listeners,
              }
            )

            try{
              await client.enableMetrics(policy)
              assert.fail("AN ERROR SHOULD HAVE BEEN CAUGHT")
            }
            catch(error: any){
              expect(error.code).to.eql(-2)
              expect(error.message).to.eql("If one metrics callback is set, all metrics callbacks must be set")
            }
            await client.disableMetrics()
          })


          it('fails when only nodeCloseListener set', async function () { 

            let listeners: any = new Aerospike.MetricsListeners(
              {
                nodeCloseListener: emptyClusterListener,

                enableListener: null as any,
                disableListener: null as any,
                snapshotListener: null as any
              }

            )

            let policy: MetricsPolicy = new MetricsPolicy({
                metricsListeners: listeners,
              }
            )
            
            try{
              await client.enableMetrics(policy)
              assert.fail("AN ERROR SHOULD HAVE BEEN CAUGHT")
            }
            catch(error: any){
              expect(error.code).to.eql(-2)
              expect(error.message).to.eql("If one metrics callback is set, all metrics callbacks must be set")
            }
            await client.disableMetrics()

          })

          it('fails when only snapshotListener set', async function () { 

            let listeners: any = new Aerospike.MetricsListeners(
              {
                snapshotListener: emptyClusterListener,

                enableListener: null as any,
                disableListener: null as any,
                nodeCloseListener: null as any,
              }

            )

            let policy: MetricsPolicy = new MetricsPolicy({
                metricsListeners: listeners,
              }
            )
            
            try{
              await client.enableMetrics(policy)
              assert.fail("AN ERROR SHOULD HAVE BEEN CAUGHT")
   
            }
            catch(error: any){
              expect(error.code).to.eql(-2)
              expect(error.message).to.eql("If one metrics callback is set, all metrics callbacks must be set")
            }
            await client.disableMetrics()

          })

          it('fails when only disableListener set', async function () { 

            let listeners: any = new Aerospike.MetricsListeners(
              {
                disableListener: emptyListener,

                enableListener: null as any,
                snapshotListener: null as any,
                nodeCloseListener: null as any,
              }

            )

            let policy: MetricsPolicy = new MetricsPolicy({
                metricsListeners: listeners,
              }
            )
            
            try{
              await client.enableMetrics(policy)
              assert.fail("AN ERROR SHOULD HAVE BEEN CAUGHT")
   
            }
            catch(error: any){
              expect(error.code).to.eql(-2)
              expect(error.message).to.eql("If one metrics callback is set, all metrics callbacks must be set")
            }
            await client.disableMetrics()

          })
        })


        context('two metricListeners set', function () { 

          it('fails when only disableListener and nodeCloseListener set', async function () { 
            let listeners: any = new Aerospike.MetricsListeners(
              {
                disableListener: emptyClusterListener,
                nodeCloseListener: emptyNodeListener,
                enableListener: null as any,
                snapshotListener: null as any,
              }

            )

            let policy: MetricsPolicy = new MetricsPolicy({
                metricsListeners: listeners,
              }
            )


            try{
              await client.enableMetrics(policy)
              assert.fail("AN ERROR SHOULD HAVE BEEN CAUGHT")
   
            }
            catch(error: any){

              expect(error.code).to.eql(-2)
              expect(error.message).to.eql("If one metrics callback is set, all metrics callbacks must be set")
            }
            await client.disableMetrics()
          })

          it('fails when only disableListener and snapshotListener set', async function () { 
            let listeners: any = new Aerospike.MetricsListeners(
              {
                disableListener: emptyClusterListener,
                snapshotListener: emptyClusterListener,
                enableListener: null as any,
                nodeCloseListener: null as any,
              }

            )

            let policy: MetricsPolicy = new MetricsPolicy({
                metricsListeners: listeners,
              }
            )
            
            try{
              await client.enableMetrics(policy)
              assert.fail("AN ERROR SHOULD HAVE BEEN CAUGHT")
   
            }
            catch(error: any){
              expect(error.code).to.eql(-2)
              expect(error.message).to.eql("If one metrics callback is set, all metrics callbacks must be set")
            }
            await client.disableMetrics()
          })

          it('fails when only disableListener and enableListener set', async function () { 
            let listeners: any = new Aerospike.MetricsListeners(
              {
                disableListener: emptyClusterListener,
                enableListener: emptyListener,
                snapshotListener: null as any,
                nodeCloseListener: null as any,
              }

            )

            let policy: MetricsPolicy = new MetricsPolicy({
                metricsListeners: listeners,
              }
            )
            
            try{
              await client.enableMetrics(policy)
              assert.fail("AN ERROR SHOULD HAVE BEEN CAUGHT")
   
            }
            catch(error: any){
              expect(error.code).to.eql(-2)
              expect(error.message).to.eql("If one metrics callback is set, all metrics callbacks must be set")
            }
            await client.disableMetrics()
          })


          it('fails when only nodeCloseListener and snapshotListener set', async function () { 
            let listeners: any = new Aerospike.MetricsListeners(
              {
                snapshotListener: emptyClusterListener,
                nodeCloseListener: emptyNodeListener,
                enableListener: null as any,
                disableListener: null as any,
              }

            )

            let policy: MetricsPolicy = new MetricsPolicy({
                metricsListeners: listeners,
              }
            )
            
            try{
              await client.enableMetrics(policy)
              assert.fail("AN ERROR SHOULD HAVE BEEN CAUGHT")
   
            }
            catch(error: any){
              expect(error.code).to.eql(-2)
              expect(error.message).to.eql("If one metrics callback is set, all metrics callbacks must be set")
            }
            await client.disableMetrics()
          })

          it('fails when only nodeCloseListener and enableListener set', async function () { 
            let listeners: any = new Aerospike.MetricsListeners(
              {
                enableListener: emptyListener,
                nodeCloseListener: emptyNodeListener,
                disableListener: null as any,
                snapshotListener: null as any,
              }

            )

            let policy: MetricsPolicy = new MetricsPolicy({
                metricsListeners: listeners,
              }
            )
            
            try{
              await client.enableMetrics(policy)
              assert.fail("AN ERROR SHOULD HAVE BEEN CAUGHT")
   
            }
            catch(error: any){
              expect(error.code).to.eql(-2)
              expect(error.message).to.eql("If one metrics callback is set, all metrics callbacks must be set")
            }
            await client.disableMetrics()
          })

          it('fails when only snapshotListener and enableListener set', async function () { 
            let listeners: any = new Aerospike.MetricsListeners(
              {
                enableListener: emptyListener,
                snapshotListener: emptyClusterListener,
                disableListener: null as any,
                nodeCloseListener: null as any,
              }

            )

            let policy: MetricsPolicy = new MetricsPolicy({
                metricsListeners: listeners,
              }
            )
            
            try{
              await client.enableMetrics(policy)
              assert.fail("AN ERROR SHOULD HAVE BEEN CAUGHT")
   
            }
            catch(error: any){
              expect(error.code).to.eql(-2)
              expect(error.message).to.eql("If one metrics callback is set, all metrics callbacks must be set")
            }
            await client.disableMetrics()
          })

        })


        context('three metricListeners set', function () { 

          it('fails when only enableListener not set', async function () { 
            let listeners: any = new Aerospike.MetricsListeners(
              {
                enableListener: null as any,
                snapshotListener: emptyClusterListener,
                disableListener: emptyClusterListener,
                nodeCloseListener: emptyNodeListener,
              }

            )

            let policy: MetricsPolicy = new MetricsPolicy({
                metricsListeners: listeners,
              }
            )
            
            try{
              await client.enableMetrics(policy)
              assert.fail("AN ERROR SHOULD HAVE BEEN CAUGHT")
   
            }
            catch(error: any){
              expect(error.code).to.eql(-2)
              expect(error.message).to.eql("If one metrics callback is set, all metrics callbacks must be set")
            }
            await client.disableMetrics()
          })


          it('fails when only nodeCloseListener not set', async function () { 
            let listeners: any = new Aerospike.MetricsListeners(
              {
                enableListener: emptyListener,
                snapshotListener: emptyClusterListener,
                disableListener: emptyClusterListener,
                nodeCloseListener: null as any,
              }

            )

            let policy: MetricsPolicy = new MetricsPolicy({
                metricsListeners: listeners,
              }
            )
            
            try{
              await client.enableMetrics(policy)
              assert.fail("AN ERROR SHOULD HAVE BEEN CAUGHT")
   
            }
            catch(error: any){
              expect(error.code).to.eql(-2)
              expect(error.message).to.eql("If one metrics callback is set, all metrics callbacks must be set")
            }
            await client.disableMetrics()
          })

          it('fails when only snapshotListener not set', async function () { 
            let listeners: any = new Aerospike.MetricsListeners(
              {
                enableListener: emptyListener,
                snapshotListener: null as any,
                disableListener: emptyClusterListener,
                nodeCloseListener: emptyNodeListener,
              }

            )

            let policy: MetricsPolicy = new MetricsPolicy({
                metricsListeners: listeners,
              }
            )
            
            try{
              await client.enableMetrics(policy)
              assert.fail("AN ERROR SHOULD HAVE BEEN CAUGHT")
   
            }
            catch(error: any){
              expect(error.code).to.eql(-2)
              expect(error.message).to.eql("If one metrics callback is set, all metrics callbacks must be set")
            }
            await client.disableMetrics()
          })


          it('fails when only disableListener not set', async function () { 
            let listeners: any = new Aerospike.MetricsListeners(
              {
                enableListener: emptyListener,
                snapshotListener: emptyClusterListener,
                disableListener: null as any,
                nodeCloseListener: emptyNodeListener,
              }

            )

            let policy: MetricsPolicy = new MetricsPolicy({
                metricsListeners: listeners,
              }
            )
            
            try{
              await client.enableMetrics(policy)
              assert.fail("AN ERROR SHOULD HAVE BEEN CAUGHT")
   
            }
            catch(error: any){
              expect(error.code).to.eql(-2)
              expect(error.message).to.eql("If one metrics callback is set, all metrics callbacks must be set")
            }
            await client.disableMetrics()
          })
        })


        context('enableListner', function () { 

          it('fails when non-function is given', async function () { 

            let listeners: any = new Aerospike.MetricsListeners(
              {
                enableListener: 10 as any,
                snapshotListener: emptyClusterListener,
                disableListener: emptyClusterListener,
                nodeCloseListener: emptyNodeListener,
              }

            )

            let policy: MetricsPolicy = new MetricsPolicy({
                metricsListeners: listeners,
              }
            )
            
            try{
              await client.enableMetrics(policy)
              assert.fail("AN ERROR SHOULD HAVE BEEN CAUGHT")
   
            }
            catch(error: any){
              expect(error.message).to.eql("enableListener must be a function")
              expect(error instanceof TypeError).to.eql(true)
            }
            await client.disableMetrics()

          })

        })

        context('snapshotListener', function () { 

          it('fails when non-function is given', async function () { 
            let listeners: any = new Aerospike.MetricsListeners(
              {
                enableListener: emptyListener,
                snapshotListener: 10 as any,
                disableListener: emptyClusterListener,
                nodeCloseListener: emptyNodeListener,
              }

            )

            let policy: MetricsPolicy = new MetricsPolicy({
                metricsListeners: listeners,
              }
            )
            
            try{
              await client.enableMetrics(policy)
              assert.fail("AN ERROR SHOULD HAVE BEEN CAUGHT")
   
            }
            catch(error: any){
              expect(error instanceof TypeError).to.eql(true)
              expect(error.message).to.eql("snapshotListener must be a function")
            }
            await client.disableMetrics()


          })

        })

        context('nodeCloseListener', function () { 

          it('fails when non-function is given', async function () { 
            let listeners: any = new Aerospike.MetricsListeners(
              {
                enableListener: emptyListener,
                snapshotListener: emptyClusterListener,
                disableListener: emptyClusterListener,
                nodeCloseListener: 10 as any,
              }

            )

            let policy: MetricsPolicy = new MetricsPolicy({
                metricsListeners: listeners,
              }
            )
            
            try{
              await client.enableMetrics(policy)
              assert.fail("AN ERROR SHOULD HAVE BEEN CAUGHT")
   
            }
            catch(error: any){
              expect(error instanceof TypeError).to.eql(true)
              expect(error.message).to.eql("nodeCloseListener must be a function")

            }
            await client.disableMetrics()


          })

        })

        context('disableListener', function () { 

          it('fails when non-function is given', async function () { 
            let listeners: any = new Aerospike.MetricsListeners(
              {
                enableListener: emptyListener,
                snapshotListener: emptyClusterListener,
                disableListener: 10 as any,
                nodeCloseListener: emptyNodeListener,
              }

            )

            let policy: MetricsPolicy = new MetricsPolicy({
                metricsListeners: listeners,
              }
            )
              
            try{
              await client.enableMetrics(policy)
              assert.fail("AN ERROR SHOULD HAVE BEEN CAUGHT")
   
            }
            catch(error: any){
              expect(error instanceof TypeError ).to.eql(true)
              expect(error.message).to.eql("disableListener must be a function")

            }
            await client.disableMetrics()

          })

        })
      })
      


      context('reportDir', function () { 

        it('fail when invalid value is given', async function () { 

          let policy: MetricsPolicy = new MetricsPolicy({
              reportDir: 10 as any,
            }
          )
            
          try{
            await client.enableMetrics(policy)
            assert.fail("AN ERROR SHOULD BE CAUGHT")
          }
          catch(error: any){

            expect(error.message).to.eql("Metrics policy parameter invalid")
            expect(error.code).to.eql(-2)
          }
          await client.disableMetrics()
        })


        it('fail when too large of value is given', async function () { 

          let value = '';
          for (let i = 0; i < 257; i++) {
            value += 'a';
          }

          let policy: MetricsPolicy = new MetricsPolicy({
              reportDir: value,
            }
          )

          try{
            await client.enableMetrics(policy)
            assert.fail("AN ERROR SHOULD BE CAUGHT")
          }
          catch(error: any){

            expect(error.message).to.eql("Metrics policy parameter invalid")
            expect(error.code).to.eql(-2)
          }
          await client.disableMetrics()
        })


        it('fail when an empty value is given', async function () { 
          let value = '';

          let policy: MetricsPolicy = new MetricsPolicy({
              reportDir: value,
            }
          )

          try{
            await client.enableMetrics(policy)
            assert.fail("AN ERROR SHOULD BE CAUGHT")
          }
          catch(error: any){

            let messageToken = error.message.split('-')[0]
            expect(messageToken).to.eql("Failed to open file: /metrics")
            expect(error.code).to.eql(-1)
          }
          await client.disableMetrics()
        })

      })

      context('reportSizeLimit', function () { 

        it('fail when invalid value is given', async function () { 

          let policy: MetricsPolicy = new MetricsPolicy({
              reportSizeLimit: 'a' as any,
            }
          )

          try{
            await client.enableMetrics(policy)
            assert.fail("AN ERROR SHOULD BE CAUGHT")
          }
          catch(error: any){

            expect(error.message).to.eql("Metrics policy parameter invalid")

            expect(error.code).to.eql(-2)
          }
          await client.disableMetrics()
        })

        it('fails when value is too small', async function () { 
          let policy: MetricsPolicy = new MetricsPolicy({
              reportSizeLimit: 1000,
            }
          )

          try{
            await client.enableMetrics(policy)
            assert.fail("AN ERROR SHOULD BE CAUGHT")
          }
          catch(error: any){

            expect(error.message).to.eql("Metrics policy report_size_limit 1000 must be at least 1000000")

            expect(error.code).to.eql(-1)
          }
          await client.disableMetrics()
        })

      })

      context('interval', function () { 

        it('fail when invalid value is given', async function () { 
          let policy: MetricsPolicy = new MetricsPolicy({
              interval: 'a' as any,
            }
          )

          try{
            await client.enableMetrics(policy)
            assert.fail("AN ERROR SHOULD BE CAUGHT")
          }
          catch(error: any){

            expect(error.message).to.eql("Metrics policy parameter invalid")

            expect(error.code).to.eql(-2)
          }
          await client.disableMetrics()
        })

      })


      context('latencyColumns', function () { 

        it('fail when invalid value is given', async function () { 
          let policy: MetricsPolicy = new MetricsPolicy({
              latencyColumns: 'a' as any,
            }
          )

          try{
            await client.enableMetrics(policy)
            assert.fail("AN ERROR SHOULD BE CAUGHT")
          }
          catch(error: any){

            expect(error.message).to.eql("Metrics policy parameter invalid")

            expect(error.code).to.eql(-2)
          }
          await client.disableMetrics()
        })


      })

      context('latencyShift', function () { 

        it('fail when invalid value is given', async function () { 
          let policy: MetricsPolicy = new MetricsPolicy({
              latencyShift: 'a' as any,
            }
          )

          try{
            await client.enableMetrics(policy)
            assert.fail("AN ERROR SHOULD BE CAUGHT")
          }
          catch(error: any){

            expect(error.message).to.eql("Metrics policy parameter invalid")

            expect(error.code).to.eql(-2)
          }
          await client.disableMetrics()
        })

      })

      context('labels', function () { 

        it('fail when invalid value is given', async function () { 
          let policy: MetricsPolicy = new MetricsPolicy({
              labels: 'a' as any,
            }
          )

          try{
            await client.enableMetrics(policy)
            assert.fail("AN ERROR SHOULD BE CAUGHT")
          }
          catch(error: any){

            expect(error.message).to.eql("Metrics policy parameter invalid")

            expect(error.code).to.eql(-2)
          }
          await client.disableMetrics()
        })

        it('fails when invalid key-value inside object is given', async function () { 
          let policy: MetricsPolicy = new MetricsPolicy({
              labels: {'a': 1} as any,
            }
          )

          try{
            await client.enableMetrics(policy)
            assert.fail("AN ERROR SHOULD BE CAUGHT")
          }
          catch(error: any){

            expect(error.message).to.eql("Metrics policy parameter invalid")

            expect(error.code).to.eql(-2)
          }
          await client.disableMetrics()
        })

      })

    })

    context('enableMetrics', function () { 

      it('fails with invalid policy', async function () { 
        try{
          await client.enableMetrics(10 as any)
          assert.fail("AN ERROR SHOULD BE CAUGHT")
        }
        catch(error: any){

          expect(error.message).to.eql("policy must be an object")

          expect(error instanceof TypeError).to.eql(true)
        }
        await client.disableMetrics()
      })

    })
  
  })

  context('Typescript definition tests', function () { 

    context('metricsPolicy', function () {

      it('compiles metricsListeners', async function () {

        let listeners: MetricsListeners = new Aerospike.MetricsListeners(
          {
            enableListener: emptyListener,
            disableListener: emptyClusterListener,
            nodeCloseListener: emptyNodeListener,
            snapshotListener: emptyClusterListener
          }
        )

        let policy: MetricsPolicy = new MetricsPolicy({
            metricsListeners: listeners,
          }
        )        
      })

      it('compiles reportDir', async function () { 
        let policy: MetricsPolicy = new MetricsPolicy({
            reportDir: '.',
          }
        )        
      })

      it('compiles reportSizeLimit', async function () { 
        let policy: MetricsPolicy = new MetricsPolicy({
            reportSizeLimit: 2000000,
          }
        )  
      })
      
      it('compiles interval', async function () { 
        let policy: MetricsPolicy = new MetricsPolicy({
            interval: 20,
          }
        )  
      })
      
      it('compiles latencyColumns', async function () { 
        let policy: MetricsPolicy = new MetricsPolicy({
            latencyColumns: 9,
          }
        )  
      })
      
      it('compiles latencyShift', async function () { 
        let policy: MetricsPolicy = new MetricsPolicy({
            latencyShift: 9,
          }
        )  
      })
      
      
      it('compiles labels', async function () { 
        let policy: MetricsPolicy = new MetricsPolicy({
            labels: {
              "label1": "label2"
            },
          }
        )  
      })

    })

    context('cluster', function () {
      let metrics: Array<NamespaceMetrics> = [
        {
          connLatency: [1, 2],
          writeLatency: [1, 2],
          readLatency: [1, 2],
          batchLatency: [1, 2],
          queryLatency: [1, 2],
          labels: {'label1': 'label2'},
          ns: 'test',
          bytesIn: 174,
          bytesOut: 153,
          errorCount: 4,
          timeoutCount: 8,
          keyBusyCount: 14
        }
      ]

      let node: Node = {
        name: 'A1',
        address: '127.0.0.1',
        port: 3000,
        conns: { inUse: 0, inPool: 0, opened: 0, closed: 0 },
        metrics
      }

      let cluster: Cluster = {
        appId: 'example',
        clusterName: 'cluster',
        commandCount: 11,
        invalidNodeCount: 15,
        transactionCount: 20,
        retryCount: 26,
        delayQueueTimeoutCount: 33,
        eventLoop: { processSize: 41, queueSize: 50 },
        nodes: [node]
      }

      context('node', function () {

        it('compiles name', async function () {

        })
        
        it('compiles address', async function () {

        })
        
        it('compiles port', async function () {

        })
        
        it('compiles conns', async function () {

        })

        context('metrics', function () {

          it('compiles connLatency', async function () {

          })
          
          it('compiles writeLatency', async function () {

          })
          
          it('compiles readLatency', async function () {

          })
          
          it('compiles queryLatency', async function () {

          })
          
          it('compiles batchLatency', async function () {

          })
          
          it('compiles labels', async function () {

          })
          
          it('compiles ns', async function () {

          })
          
          it('compiles bytesIn', async function () {

          })
          
          it('compiles bytesOut', async function () {

          })
          
          it('compiles errorCount', async function () {

          })
          
          it('compiles timeoutCount', async function () {

          })
          
          it('compiles keyBusyCount', async function () {

          })
        })
      })

      it('compiles appId', async function () {

      })

      it('compiles clusterName', async function () {

      })

      it('compiles commandCount', async function () {

      })

      it('compiles invalidNodeCount', async function () {

      })

      it('compiles transactionCount', async function () {

      })

      it('compiles retryCount', async function () {

      })

      it('compiles delayQueueTimeoutCount', async function () {

      })

      it('compiles eventLoop', async function () {

      })


    })
    context('namespaceMetrics', function () {
      let metrics: NamespaceMetrics = {
        ns: 'test',
        bytesIn: 3407,
        bytesOut: 3406,
        timeoutCount: 2,
        keyBusyCount: 10,
        errorCount: 4,
        connLatency: [0, 0],
        writeLatency: [0, 0],
        readLatency: [0, 0],
        batchLatency: [0, 0],
        queryLatency: [0, 0]
      }

      it('compiles ns', async function () {

      })

      it('compiles bytesIn', async function () { 

      })
      
      it('compiles bytesOut', async function () { 

      })
      
      it('compiles timeoutCount', async function () { 

      })
      
      it('compiles keyBusyCount', async function () { 

      })

      it('compiles errorCount', async function () { 

      })

      it('compiles connLatency', async function () { 

      })
      
      it('compiles writeLatency', async function () { 

      })

      it('compiles readLatency', async function () { 

      })

      it('compiles batchLatency', async function () { 

      })

      it('compiles queryLatency', async function () { 

      })


    })


    context('enableMetrics', function () {

      it('compiles when no args are provided', async function () { 
        await client.enableMetrics()
        await client.disableMetrics()
      })

      it('compiles when a metricsPolicy is provided', async function () { 
        let policy: MetricsPolicy = new MetricsPolicy({
            interval: 100,
          }
        )     

        await client.enableMetrics()
        await client.disableMetrics()
      })

    })

    context('disableMetrics', function () {

      it('compiles when no args are provided', async function () { 
        await client.disableMetrics()
      })

    })
  })
})
  
  /*
  //The errors are thrown in an asynchronous context rather than as a return value. If the implementation is changed, these tests can be added

  it('enable metric throws exception', async function () {
    let listeners: MetricsListeners = new Aerospike.MetricsListeners(
      {
        enableListener: enable_throw_exc,
        disableListener,
        nodeCloseListener,
        snapshotListener
      }
    )

    let policy: MetricsPolicy = new MetricsPolicy({
        metricsListeners: listeners,
      }
    )

    //expect(await client.enableMetrics(policy)).to.throw("ERROR HERE")

  })

  it('disable metric throws exception', async function () {
    let listeners: MetricsListeners = new Aerospike.MetricsListeners(
      {
        enableListener,
        disableListener: disable_throw_exc,
        nodeCloseListener,
        snapshotListener
      }
    )

    let policy: MetricsPolicy = new MetricsPolicy({
        metricsListeners: listeners,
      }
    )
    await client.enableMetrics(policy)

    //expect(await client.disableMetrics()).to.throw("ERROR HERE")
    await new Promise(r => setTimeout(r, 3000));


  })
*/

