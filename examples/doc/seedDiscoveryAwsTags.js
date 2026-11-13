// *****************************************************************************
// Copyright 2026 Aerospike, Inc.
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

const Aerospike = require('../harness/aerospikeClient')

// The aws-tags provider finds seed hosts by listing the running EC2
// instances that match the filters, in the region and account of the
// credentials, and refreshes them every refreshIntervalMs. It needs only the
// ec2:DescribeInstances permission. Credentials come from the standard AWS
// chain (environment, shared credentials file, EKS web identity, ECS and EKS
// Pod Identity, instance metadata) unless accessKeyId and secretAccessKey are
// set. It runs only in thread mode, the default.
//
// To run it, set AEROSPIKE_AWS_REGION and AEROSPIKE_AWS_TAG (key=value) to
// match your cluster's instances; it is skipped otherwise.
async function runExample ({ args, console, skipUnless }) {
  const region = process.env.AEROSPIKE_AWS_REGION
  const tag = process.env.AEROSPIKE_AWS_TAG
  skipUnless(region && tag && tag.includes('='), 'set AEROSPIKE_AWS_REGION and AEROSPIKE_AWS_TAG=key=value')

  const [key, value] = tag.split('=')
  const config = {
    hosts: [{ addr: args.host, port: args.port }],
    discovery: {
      provider: 'aws-tags',
      aws: {
        region,
        filters: [{ name: `tag:${key}`, values: [value] }],
        addressField: 'privateIp',
        port: args.port
      },
      mergePolicy: 'merge'
    },
    log: { level: Aerospike.log.ERROR }
  }
  if (args.user) {
    config.user = args.user
    config.password = args.password
  }

  const client = await Aerospike.connect(config)
  try {
    console.info(`Connected with aws-tags seed discovery in ${region}, nodes: ${client.getNodes().length}`)
  } finally {
    client.close()
  }
}

module.exports = { name: 'SeedDiscoveryAwsTags', runExample }
