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

describe('Test metrics cluster name', async function () {
  const client: Cli = helper.client

  helper.skipUnlessAdvancedMetrics(this)



  let snapshotTriggered: boolean = false
  let disableTriggered: boolean = false


  function enableListener() {
    return
  }

  function snapshotListener(cluster: any) {
    snapshotTriggered = false
    return
  }


  function nodeCloseListener(node: any) {
    return
  }

  function disableListener(cluster: any) {
    disableTriggered = false
    expect(cluster.clusterName).to.eql("pass_test")
    return
  }


  it('Test metrics cluster name retrival', async function () {

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

    console.log("Waiting for client to collect all information about cluster nodes...")

    const config: any = {
      hosts: "localhost:3000",
      clusterName: "docker"
    }

    const dummyClient = await Aerospike.connect(config)

    console.log("Waiting for client to collect all information about cluster nodes...")

    await new Promise(r => setTimeout(r, 5000));


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



    await dummyClient.disableMetrics()

    await dummyClient.close()
    expect(disableTriggered).to.eql(false)
    await container.stop();
    return await container.remove();
    
  })
})


