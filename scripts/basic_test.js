const Aerospike = require('aerospike')

const host = process.env.AEROSPIKE_HOST || '127.0.0.1'
const port = Number(process.env.AEROSPIKE_PORT || 3000)
const user = process.env.AEROSPIKE_USER
const password = process.env.AEROSPIKE_PASSWORD

const config = {
  hosts: `${host}:${port}`
}

if (user) {
  config.user = user
}
if (password) {
  config.password = password
}

const key = new Aerospike.Key('test', 'demo', 'demo')

Aerospike.connect(config)
  .then(client => {
    const bins = {
      i: 123,
      s: 'hello',
      b: Buffer.from('world'),
      d: new Aerospike.Double(3.1415),
      g: Aerospike.GeoJSON.Point(103.913, 1.308),
      l: [1, 'a', { x: 'y' }],
      m: { foo: 4, bar: 7 }
    }
    const meta = { ttl: 10000 }
    const policy = new Aerospike.WritePolicy({
      exists: Aerospike.policy.exists.CREATE_OR_REPLACE,
      socketTimeout: 0,
      totalTimeout: 0
    })

    return client.put(key, bins, meta, policy)
      .then(() => {
        const ops = [
          Aerospike.operations.incr('i', 1),
          Aerospike.operations.read('i'),
          Aerospike.lists.append('l', 'z'),
          Aerospike.maps.removeByKey('m', 'bar')
        ]

        return client.operate(key, ops)
      })
      .then(result => {
        console.log(result.bins)

        return client.get(key)
      })
      .then(record => {
        console.log(record.bins)
      })
      .then(() => client.close())
  })
  .catch(error => {
    console.error('Error: %s [%i]', error.message, error.code)
    if (error.client) {
      error.client.close()
    }
    process.exit(1)
  })
