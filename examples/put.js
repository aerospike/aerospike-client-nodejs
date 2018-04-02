const Aerospike = require('aerospike')
const shared = require('./shared')

async function put (client, argv) {
  const key = new Aerospike.Key(argv.namespace, argv.set, argv.key)
  const bins = parseBins(argv.bins)
  const meta = buildMeta(argv)
  const policy = buildPolicy(argv)
  console.info(key, bins, meta, policy)
  await client.put(key, bins, meta, policy)
}

// @param { String[] } binStrs - list of "<name>=<value>" pairs
function parseBins (binStrs) {
  return binStrs.reduce((bins, current) => {
    let [name, value] = current.split('=')
    bins[name] = value
    return bins
  }, {})
}

function buildMeta (argv) {
  let meta = { }
  if (argv.ttl) {
    meta.ttl = argv.ttl
  }
  return meta
}

function buildPolicy (argv) {
  let policy = { }
  if (argv.create) {
    policy.exists = Aerospike.policy.exists.CREATE
  }
  if (argv.replace) {
    policy.exists = Aerospike.policy.exists.REPLACE
  }
  if (argv.update) {
    policy.exists = Aerospike.policy.exists.UPDATE
  }
  return policy
}

exports.command = 'put <key> <bins...>'
exports.describe = 'Write a record to the database. <bins> should be a list of one or more "<bin>=<value>" pairs, e.g. `node . put <key> s=foo i=42`.'
exports.handler = shared.run(put)
exports.builder = {
  'time-to-live': {
    alias: 'ttl',
    describe: 'Record\'s time-to-live in seconds',
    group: 'Command:',
    type: 'number'
  },
  'create': {
    describe: 'Create a new record',
    group: 'Command:',
    requiresArg: false,
    conflicts: ['update', 'replace']
  },
  'replace': {
    describe: 'Replace an existing record',
    group: 'Command:',
    requiresArg: false,
    conflicts: ['create', 'update']
  },
  'update': {
    describe: 'Update an existing record',
    group: 'Command:',
    requiresArg: false,
    conflicts: ['create', 'replace']
  }
}
