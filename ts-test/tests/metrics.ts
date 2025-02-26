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

/* eslint-env mocha */
/* global expect */

import Aerospike, { Client as Cli, Node, NodeMetrics, ConnectionStats, Cluster, MetricsPolicy, MetricsListeners} from 'aerospike';

import { expect } from 'chai'; 
import * as helper from './test_helper';

import * as fs from 'fs';



describe('Metrics tests', function () {
  const client: Cli = helper.client


  const blank_policy: MetricsPolicy = new Aerospike.MetricsPolicy()

  let enableTriggered: boolean = false
  let disableTriggered: boolean = false
  let snapshotTriggered: boolean = false
  let clusterFromDisableListener: any = null
  let clusterFromSnapshotListener: any = null

  let metricsLogFolder = '.'

  function enableListener() {
    enableTriggered = true
    return
  }

  function snapshotListener(cluster: Cluster) {
    snapshotTriggered = true
    clusterFromSnapshotListener = cluster
    return
  }

  function nodeCloseListener(node: Node) {
    return
  }

  function disableListener(cluster: Cluster) {
    disableTriggered = true
    clusterFromDisableListener = cluster
    return
  }

  function enable_throw_exc() {
    throw new Error(`enable threw an error`)
  }



  function disable_throw_exc( Cluster: any ){
    throw new Error(`disable threw an error`)
  }

  it('enable metrics', async function () {
    let retval: any = await client.enableMetrics()

    expect(retval).to.eql(null)

  })

  it('enable metrics extra args', async function () {
    try{
      await (client as any).enableMetrics(null, 1)
    }
    catch(error: any){
      expect(error.message).to.eql("this.callback.bind is not a function")
    }



  })

  it('With valid policy ', async function () {
    await client.enableMetrics(blank_policy)
  })

  it('With null policy ', async function () {
    await (client as any).enableMetrics(null)
  })

  it('enable metrics incorrect args', async function () {
    try{
      await (client as any).enableMetrics(1)
    }
    catch(error: any){
      expect(error.message).to.eql("policy must be an object")
    }

  })


  it('test metrics writer', async function () {
    let policy: MetricsPolicy = new Aerospike.MetricsPolicy({
      interval: 1
    })

    await client.enableMetrics(policy)

    await new Promise(r => setTimeout(r, 3000));

    await client.disableMetrics()

    const metricsLogFilenames = fs.readdirSync('.')
    .filter(file => file.match(/^metrics-.*\.log$/));

    if (metricsLogFilenames.length === 0) {
      throw new Error('No metrics log files found');
    }
  })


  it('test setting custom listener functions', async function () {

    let listeners: MetricsListeners = new Aerospike.MetricsListeners(
      {
        enableListener,
        disableListener,
        nodeCloseListener,
        snapshotListener
      }
    )

    let bucketCount = 5

    let policy: MetricsPolicy = new MetricsPolicy({
        metricsListeners: listeners,
        reportDir: metricsLogFolder,
        reportSizeLimit: 1000,
        interval: 4,
        latencyColumns: bucketCount,
        latencyShift: 2
      }
    )

    await client.enableMetrics(policy)


    const key = new Aerospike.Key('test', 'demo', 'demo')
    const key2 = new Aerospike.Key('test', 'demo', 'demo2')
    const key3 = new Aerospike.Key('test', 'demo', 'demo3')

    await client.put(key, {example: 1})
    await new Promise(r => setTimeout(r, 500));

    await client.put(key2, {example: 1})
    await new Promise(r => setTimeout(r, 500));
    await client.put(key3, {example: 1})
    await new Promise(r => setTimeout(r, 500));


    await client.get(key)
    await new Promise(r => setTimeout(r, 500));
    await client.get(key2)
    await new Promise(r => setTimeout(r, 500));
    await client.get(key3)
    await new Promise(r => setTimeout(r, 1500));

    await client.disableMetrics()

    await new Promise(r => setTimeout(r, 3000));

    expect(enableTriggered).to.eql(true)
    expect(snapshotTriggered).to.eql(true)
    expect(disableTriggered).to.eql(true)

    for (const cluster of [clusterFromSnapshotListener, clusterFromDisableListener]) {
      let temp: Cluster = cluster
      expect(cluster.clusterName).to.satisfy((name: string) => (name === null) || typeof name === "string");
      expect(cluster.invalidNodeCount).to.be.a("number");
      expect(cluster.commandCount).to.be.a("number");
      expect(cluster.retryCount).to.be.a("number");
      expect(cluster.nodes).to.be.an("array");

      // Also check the Node and ConnectionStats objects in the Cluster object were populated
      for (const node of cluster.nodes) {
          let tempNode: Node = node
          
          expect(node.name).to.be.a("string");
          expect(node.address).to.be.a("string");
          expect(node.port).to.be.a("number");
          let conns: ConnectionStats = node.conns
          expect(node.conns.inUse).to.be.a("number");
          expect(node.conns.inPool).to.be.a("number");
          expect(node.conns.opened).to.be.a("number");
          expect(node.conns.closed).to.be.a("number");
          expect(node.errorCount).to.be.a("number");
          expect(node.timeoutCount).to.be.a("number");

          // Check NodeMetrics
          const metrics: NodeMetrics = node.metrics;
          const latencyBuckets = [
              metrics.connLatency,
              metrics.writeLatency,
              metrics.readLatency,
              metrics.batchLatency,
              metrics.queryLatency
          ];

          for (const buckets of latencyBuckets) {
              expect(buckets).to.be.an("array").with.lengthOf(bucketCount);
              for (const bucket of buckets) {
                  expect(bucket).to.be.a("number");
              }
          }
      }
    }
  })

  it('enable metrics incorrect args latencyShift', async function () {
    let policy: any = {
      latencyShift: true,
    }
    try{
      await client.enableMetrics(policy)  

    }
    catch(error: any){
      expect(error.message).to.eql("Metrics policy parameter invalid")
    } 
  })

  it('enable metrics incorrect args reportDir', async function () {
    let policy: any = {
      reportDir: true,
    }
    try{
      await client.enableMetrics(policy)  

    }
    catch(error: any){
      expect(error.message).to.eql("Metrics policy parameter invalid")
    } 
  })


  it('reportDir too long', async function () {
    let policy: any = {
      reportDir: 257,
    }
    try{
      await client.enableMetrics(policy)  

    }
    catch(error: any){
      expect(error.message).to.eql("Metrics policy parameter invalid")
    }
  })

  it('disable metrics', async function () {
    let retval: any = await client.enableMetrics()

    expect(retval).to.eql(null)
  })

  it('disable metrics incorrect args', async function () {
    let policy: any = {
      reportDir: true,
    }
    try{
      await (client as any).disableMetrics(1)

    }
    catch(error: any){
      expect(error.message).to.eql("this.callback.bind is not a function")
    } 
  })

/*

  The errors are thrown in an asynchronous context rather than as a return value. If the implementation is changed, these tests can be added

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

})
