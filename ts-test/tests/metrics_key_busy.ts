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

import Aerospike, { status as statusModule, AerospikeError as ASError, MetricsPolicy, Cluster, Double as Doub, GeoJSON as GJ, Client as Cli, NamespaceMetrics, MetricsListeners} from 'aerospike';

import { expect } from 'chai'; 
import * as helper from './test_helper';

const keygen: any = helper.keygen
const metagen: any = helper.metagen
const recgen: any = helper.recgen
const valgen: any = helper.valgen

const status: typeof statusModule = Aerospike.status
const AerospikeError: typeof ASError = Aerospike.AerospikeError
const Double: typeof Doub = Aerospike.Double
const GeoJSON: typeof GJ = Aerospike.GeoJSON


describe('Metrics Key Busy', function () {

  helper.skipUnlessMetricsKeyBusy(this)

  let totalKeyBusyCount = 0

  function emptyListener() {

  }

  function emptyNodeListener(node: Node) {

  }


  function emptyClusterListener(cluster: Cluster) {

  }


  function listenerTimeoutCount(cluster: Cluster) {
    for (const node of cluster.nodes) {
      let NamespaceMetrics: Array<NamespaceMetrics> = node.metrics
      for (const index of NamespaceMetrics) {
        totalKeyBusyCount += index.keyBusyCount
      }
    }
    return
  }

  it('should write and validate records', async function () {
    const config: any = new Aerospike.Config({
      hosts: [
        { addr: '0.0.0.0', port: 3100 },
        { addr: '0.0.0.0', port: 3101 },
        { addr: '0.0.0.0', port: 3102 },
      ],
      rackIds: [4, 2, 1],
      rackAware: true,
      policies: {
        write: {
          replica: Aerospike.policy.replica.PREFER_RACK,
        },
        read: {
          replica: Aerospike.policy.replica.PREFER_RACK,
        }
      },
      log: {
        level: Aerospike.log.TRACE,
      }
    })


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



    const dummyClient: Cli = await Aerospike.connect(config)


    await dummyClient.enableMetrics(policy)

    let promiseList = []
    for (var i = 0; i < 100; i++) {
      let key = new Aerospike.Key('test', 'demo', 1)
      promiseList.push(dummyClient.put(key, {a: 1}))
      promiseList.push(dummyClient.get(key))


    }
    try{
      const results = await Promise.all(promiseList)

    }
    catch(error: any){

    }

    await new Promise(r => setTimeout(r, 3000));

    expect(totalKeyBusyCount).to.be.greaterThan(0)
    await dummyClient.close()

  })
})
