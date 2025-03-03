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

import { expect, assert} from 'chai'; 

const Docker = require('dockerode');
const docker = new Docker();

import * as helper from './test_helper';


describe('Metrics node close test', async function () {

  helper.skipUnlessAdvancedMetrics(this)

  let nodeCloseTriggered: boolean = false
  this.timeout(40000)

  function enableListener() {
    return
  }

  function snapshotListener(cluster: any) {
    return
  }

  function testNodeIsPopulated(node: any){
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
        expect(buckets).to.be.an("array").with.lengthOf(7);
        for (const bucket of buckets) {
            expect(bucket).to.be.a("number");
        }
    }
  }

  function nodeCloseListener(node: any) {
    testNodeIsPopulated(node)
    nodeCloseTriggered = true
    console.log("Node close callback was called!")
    return
  }

  function disableListener(cluster: any) {
    return
  }


  it('Test the node close listener', async function () {



    console.log("Running server container...");
    const SERVER_PORT_NUMBER = 3000;

    const container = await docker.createContainer({
        Image: 'aerospike/aerospike-server',
        HostConfig: {
            NetworkMode: "host",
            PortBindings: {
                "3000/tcp": [{ HostPort: SERVER_PORT_NUMBER.toString() }]
            }
        }
    });

    await container.start();

    console.log("Waiting for server to initialize...")

    await new Promise(r => setTimeout(r, 15000));

    const config = {
      hosts: 'localhost:3000',
    }

    console.log("Connecting to Aerospike")


    const dummyClient = await Aerospike.connect(config)

    console.log("Waiting for client to collect all information about cluster nodes...")

    await new Promise(r => setTimeout(r, 15000));


    let listeners: MetricsListeners = new Aerospike.MetricsListeners(
      {
        enableListener,
        disableListener,
        nodeCloseListener,
        snapshotListener
      }
    )

    let policy: MetricsPolicy = new MetricsPolicy({
        metricsListeners: listeners,
      }
    )

    console.log("Enabling metrics...")

    await dummyClient.enableMetrics(policy)

    await new Promise(r => setTimeout(r, 3000));
    
    console.log("Closing node...")

    await container.stop();
    await container.remove();
  
    console.log("Giving client time to run the node_close listener...")

    let elapsed_secs = 0

    while (elapsed_secs < 25) {
        if(nodeCloseTriggered) {
            console.log("node_close_called is true. Passed")
            await dummyClient.disableMetrics()

            return await dummyClient.close()
        }
        elapsed_secs++;
        console.log("polling")
        await new Promise(r => setTimeout(r, 1000));
    }

    console.log("THIS FAILED")
    await dummyClient.close()

    assert.fail('nodeCloseListener was not called')

  })
})


