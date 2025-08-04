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

import Aerospike, { status as statusModule, AerospikeError as ASError, Double as Doub, GeoJSON as GJ, Client as Cli, ConfigOptions, RecordMetadata, AerospikeBins, AerospikeRecord, Key, WritePolicy, Bin} from 'aerospike';

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


describe('REPLICA_RANDOM', function () {
  // const client: Cli = helper.client\
  //Aerospike.setDefaultLogging({level: Aerospike.log.TRACE})

  it('should write and validate records', async function () {
    expect(Aerospike.policy.replica.RANDOM).to.be.a('number')
    const config: any = new Aerospike.Config({
      hosts: helper.config.hosts,
      user: helper.config.user,
      password: helper.config.password,
      policies: {
        write: {
          replica: Aerospike.policy.replica.RANDOM,
        },
        read: {
          replica: (Aerospike.policy.replica as any).band,
        }
      },
    })

    const dummyClient: Cli = await Aerospike.connect(config)

    for (var i = 0; i < 20; i++) {
      let key = new Aerospike.Key('test', 'demo', i)
      console.log(key)
      await dummyClient.put(key, {a: 1})
      await dummyClient.get(key)
      // This must be verified manually, not yet automated.

      /* Must add this to C Client code inside as_event.c:

      cmd->node = as_partition_get_node(cmd->cluster, cmd->ns, cmd->partition, cmd->node,
                       cmd->replica, cmd->replica_size, &cmd->replica_index);
      printf("Node=%s\n", as_node_get_address_string(cmd->node));
      */

      /* Expected output:

      Key { ns: 'test', set: 'demo', key: 0, digest: null }
      Node=172.17.0.3:3101
      Node=172.17.0.3:3101
      Key { ns: 'test', set: 'demo', key: 1, digest: null }
      Node=172.17.0.2:3100
      Node=172.17.0.3:3101
      Key { ns: 'test', set: 'demo', key: 2, digest: null }
      Node=172.17.0.4:3102
      Node=172.17.0.3:3101
      
      Read Node can be any rack, but writes will prefer_rack 2
      */


    }
    await dummyClient.close()

  })
})
