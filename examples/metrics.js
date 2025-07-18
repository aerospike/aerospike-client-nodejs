#!/usr/bin/env node
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

const Aerospike = require('aerospike')
const shared = require('./shared')

shared.runner()

async function metrics (client, argv) {
  const policy = {}
  if (argv.customListeners) {
    const listeners = new Aerospike.MetricsListeners(
      {
        enableListener,
        disableListener,
        nodeCloseListener,
        snapshotListener
      }
    )
    policy.metricsListeners = listeners
  }
  if (argv.reportDir) {
    policy.reportDir = argv.reportDir
  }
  if (argv.reportSizeLimit) {
    policy.reportSizeLimit = argv.reportSizeLimit
  }
  if (argv.interval) {
    policy.interval = argv.interval
  }
  if (argv.latencyColumns) {
    policy.latencyColumns = argv.latencyColumns
  }
  if (argv.latencyShift) {
    policy.latencyShift = argv.latencyShift
  }
  if (argv.labels) {
    policy.labels = argv.labels
  }
  if (argv.appId) {
    policy.appId = argv.appId
  }
  console.log('Enabling Metrics with the following policy:')
  console.log(policy)
  await client.enableMetrics(policy)
  await new Promise(resolve => setTimeout(resolve, 5000))
  await client.disableMetrics()
  await new Promise(resolve => setTimeout(resolve, 0)) // Let the event loop cycle and allows disable listener to fire.
}

function enableListener () {
  console.log('Enable listener called.')
}

function snapshotListener (cluster) {
  console.log('Snapshot listener called')
  console.log(cluster)
}

function nodeCloseListener (node) {
  console.log('Node Close listener called')
  console.log(node)
}

function disableListener (cluster) {
  console.log('Disabled listener called')
  console.log(cluster)
}

exports.command = 'metrics'
exports.describe = 'Enable Client metrics'
exports.handler = shared.run(metrics)
exports.builder = {
  customListeners: {
    describe: 'Use custom listener callbacks defined with nodejs functions',
    type: 'boolean',
    default: false
  },
  reportDir: {
    describe: 'Directory in which metrics reports will be placed',
    type: 'string',
    default: '.'
  },
  reportSizeLimit: {
    describe: 'Metrics file size soft limit in bytes for listeners that write logs.',
    type: 'number',
    default: 1000000
  },
  interval: {
    describe: 'Number of cluster tend iterations between metrics notification events.',
    type: 'number',
    default: 2
  },
  latencyColumns: {
    describe: 'Number of elapsed time range buckets in latency histograms.',
    type: 'number',
    default: 7
  },
  latencyShift: {
    describe: 'Power of 2 multiple between each range bucket in latency histograms starting at column 3.',
    type: 'number',
    default: 1
  },
  labels: {
    describe: 'List of name/value labels that is applied when exporting metrics.',
    type: 'array',
    default: []
  },
  appId: {
    describe: 'Application identifier that is applied when exporting metrics.',
    type: 'string',
    default: '.'
  }

}
