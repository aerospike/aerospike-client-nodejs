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
// ****************************************************************************

'use strict'

import Aerospike, {Client, Config, Job, IndexJob, indexDataType, indexType, cdt, InfoAllResponse} from 'aerospike'; 

import options from './util/options';
import * as semver from 'semver';
import { SemVer } from 'semver';
import * as path from 'path';
import { runInNewProcessFn } from './util/run_in_new_process';
import { Suite } from 'mocha';

import * as chai from 'chai';
const expect: any = chai.expect;
(global as any).expect = expect;

export {options}
export const namespace = options.namespace
export const set = options.set

import * as keygen from './generators/key';
import * as metagen from './generators/metadata';
import * as recgen from './generators/record';
import * as valgen from './generators/value';
import * as putgen from './generators/put';
import * as util from './util';

export { keygen, metagen, recgen, valgen, putgen, util };
let testConfigs = options.getConfig()
const config: Config = testConfigs.config
const helper_client_exists = testConfigs.omitHelperClient
let client: any;
client = Aerospike.client(config)


export {client, config}

Aerospike.setDefaultLogging(config.log ?? {})




  class UDFHelper {
    private client: Client;
    constructor(client: Client) {
      this.client = client;
    }

    register(filename: string) {
      const script = path.join(__dirname, filename);
      return this.client.udfRegister(script)
        .then((job: Job) => job.wait(50));
    }

    remove(filename: string) {
      return this.client.udfRemove(filename)
        .then((job: Job) => job.wait(50))
        .catch((error: any) => {
          if (error.code !== Aerospike.status.ERR_UDF) {
            return Promise.reject(error);
          }
        });
    }
  }

  class IndexHelper {
    private client: Client;
    constructor(client: Client) {
      this.client = client;
    }

    create(indexName: string, setName: string, binName: string, dataType: indexDataType, indexType: indexType, context?: cdt.Context) {
      const index = {
        ns: options.namespace,
        set: setName,
        bin: binName,
        index: indexName,
        type: indexType || Aerospike.indexType.DEFAULT,
        datatype: dataType,
        context
      };
      const retries = 3;
      for (let attempt = 0; attempt < retries; attempt++) {
        const job: any = this.client.createIndex(index)
        .then((job: IndexJob) => {
          job.wait(10)
          return
        })
        .catch((error: any) => {
          if (error.code === Aerospike.status.ERR_INDEX_FOUND) {
            return;
          }
          if (attempt === retries - 1) {
            return Promise.reject(error);
          }
        })
      };  
    }

    remove(indexName: string) {
      return this.client.indexRemove(options.namespace, indexName)
        .catch((error: any) => {
          if (error.code === Aerospike.status.ERR_INDEX_NOT_FOUND) {
            // ignore - index does not exist
          } else {
            return Promise.reject(error);
          }
        });
    }
  }


  class ServerInfoHelper {
    private features: Set<string>;
    private edition: string;
    private build: string;
    private namespaceInfo: { [key: string]: any };
    private cluster: any[];
    private client: Client;
    constructor(client: Client) {
      this.features = new Set();
      this.edition = 'community';
      this.build = '';
      this.namespaceInfo = {};
      this.cluster = [];
      this.client = client;
    }

    hasFeature(feature: string) {
      return this.features.has(feature);
    }

    isEnterprise() {
      return this.edition.match('Enterprise');
    }

    isVersionInRange(versionRange: string) {
      const version: string = process.env.AEROSPIKE_VERSION_OVERRIDE || this.build;
      const semverVersion: SemVer | null = semver.coerce(version); // truncate a build number like "4.3.0.2-28-gdd9f506" to just "4.3.0"
      return semver.satisfies(semverVersion!, versionRange);
    }

    supportsTtl() {
      const { config } = this.namespaceInfo;
      return config['nsup-period'] > 0 || config['allow-ttl-without-nsup'] === 'true';
    }

    fetchInfo() {
      return this.client.infoAll('build\nedition\nfeatures')
        .then((results: InfoAllResponse[]) => {
          results.forEach((response: InfoAllResponse) => {
            const info = Aerospike.info.parse(response.info);
            this.edition = info.edition;
            this.build = info.build;
            const features = info.features;
            if (Array.isArray(features)) {
              features.forEach(feature => this.features.add(feature));
            }
          });
        });
    }

    fetchNamespaceInfo(ns: string) {
      const nsKey = `namespace/${ns}`;
      const cfgKey = `get-config:context=namespace;id=${ns}`;
      return this.client.infoAny([nsKey, cfgKey].join('\n'))
        .then((results: string) => {
          const info = Aerospike.info.parse(results);
          this.namespaceInfo = {
            info: info[nsKey],
            config: info[cfgKey],
          };
        });
    }

    randomNode() {
      const nodes = this.client.getNodes();
      const i = Math.floor(Math.random() * nodes.length);
      return nodes[i];
    }
  }


  const udfHelper = new UDFHelper(client)
  const indexHelper = new IndexHelper(client)
  const serverInfoHelper = new ServerInfoHelper(client)

  export const udf = udfHelper
  export const index = indexHelper
  export const cluster = serverInfoHelper

  export function runInNewProcess(fn: Function, data: any) {
    if (data === undefined) {
      data = null
    }
    const env = {
      NODE_PATH: path.join(process.cwd(), 'node_modules')
    }
    return runInNewProcessFn(fn, env, data)
  }

  export function skip(this: any, ctx: Suite, message: string) {
    ctx.beforeEach(function (this: any) {
      this.skip(message)
    })
  }

  export function skipIf (this: any, ctx: Suite, condition: any, message: string) {
    ctx.beforeEach(function (this: any) {
      let skip = condition
      if (typeof condition === 'function') {
        skip = condition()
      }
      if (skip) {
        this.skip(message)
      }
    })
  }

  export function skipUnless (ctx: Suite, condition: any, message: string) {
    if (typeof condition === 'function') {
      skipIf(ctx, () => !condition(), message)
    } else {
      skipIf(ctx, !condition, message)
    }
  }

  export function skipUnlessSupportsFeature (this: any, feature: string, ctx: Suite) {
    skipUnless(ctx, () => this.cluster.hasFeature(feature), `requires server feature "${feature}"`)
  }

  export function skipUnlessEnterprise(this: any, ctx: Suite) {
    skipUnless(ctx, () => this.cluster.isEnterprise(), 'requires enterprise edition')
  }

  export function skipUnlessVersion(this: any, versionRange: any, ctx: Suite) {
    skipUnless(ctx, () => this.cluster.isVersionInRange(versionRange), `cluster version does not meet requirements: "${versionRange}"`)
  }


  export function skipUnlessVersionAndEnterprise (this: any, versionRange: any, ctx: Suite) {
    skipUnless(ctx, () => {
      return (this.cluster.isVersionInRange(versionRange) && (this.cluster.isEnterprise())) }, `cluster version does not meet requirements: "${versionRange} and/or requires enterprise"`)
  }

  export function skipUnlessVersionAndCommunity (this: any, versionRange: any, ctx: Suite) {
    skipUnless(ctx, () => {
      return (this.cluster.isVersionInRange(versionRange) && (!this.cluster.isEnterprise())) 

    }, `cluster version does not meet requirements: "${versionRange} and/or requires enterprise"`)
  }

  export function skipUnlessSupportsTtl(this: any, ctx: Suite) {
    skipUnless(ctx, () => this.cluster.supportsTtl(), 'test namespace does not support record TTLs')
  }

  export function skipUnlessXDR(this: any, ctx: Suite) {
    skipUnless(ctx, () => options.testXDR, 'XDR tests disabled')
    return options.testXDR
  }

  export function skipUnlessAdvancedMetrics(this: any, ctx: Suite) {
    skipUnless(ctx, () => options.testMetrics, 'Advanced metrics tests disabled')
  }

  export function skipUnlessAdvancedMetrics(this: any, ctx: Suite) {
    skipUnless(ctx, () => options.testMetrics, 'Advanced metrics tests disabled')
  }
  
  export function skipUnlessPreferRack(this: any, ctx: Suite) {
    skipUnless(ctx, () => options.testPreferRack, 'Prefer rack tests disabled')
  }

  export function skipUnlessMetricsKeyBusy(this: any, ctx: Suite) {
    skipUnless(ctx, () => options.testMetricsKeyBusy, 'Prefer rack tests disabled')
  }

  if (process.env.GLOBAL_CLIENT !== 'false') {
    /* global before */
    before(() => {
      if(helper_client_exists){
        client.connect()
        .then(() => serverInfoHelper.fetchInfo())
        .then(() => serverInfoHelper.fetchNamespaceInfo(options.namespace))
        .catch((error: any) => {
          console.error('ERROR:', error)
          console.error('CONFIG:', client.config)
          throw error
        })
      }
    })

    /* global after */
    after(function (done) {
      if(helper_client_exists){
        client.close()
      }
      done()
    })
  }
  
