const Aerospike = require('aerospike')
const shared = require('./shared')

async function get (client, argv) {
  const key = new Aerospike.Key(argv.namespace, argv.set, argv.key)
  const record = await client.get(key)
  console.info(record)
}

exports.command = 'get <key>'
exports.describe = 'Fetch a record from the database'
exports.handler = shared.run(get)
