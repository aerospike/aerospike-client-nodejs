const Aerospike = require('aerospike')

// INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
const config = {
  hosts: '127.0.0.1 :3000',
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
      l: [1, 'a', {x: 'y'}],
      m: {foo: 4, bar: 7}
    }
    const meta = { ttl: 10000 }
    const policy = new Aerospike.WritePolicy({
      exists: Aerospike.policy.exists.CREATE_OR_REPLACE,
      // Timeouts disabled, latency dependent on server location. Configure as needed.
      socketTimeout : 0, 
      totalTimeout : 0
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
        console.log(result.bins) // => { i: 124, l: 4, m: null }

        return client.get(key)
      })
      .then(record => {
        console.log(record.bins) // => { i: 124,
                                 //      s: 'hello',
                                 //      b: <Buffer 77 6f 72 6c 64>,
                                 //      d: 3.1415,
                                 //      g: '{"type":"Point","coordinates":[103.913,1.308]}',
                                 //      l: [ 1, 'a', { x: 'y' }, 'z' ],
                                 //      m: { foo: 4 } }
      })
      .then(() => client.close())
  })
  .catch(error => {
    console.error('Error: %s [%i]', error.message, error.code)
    if (error.client) {
      error.client.close()
    }
  })