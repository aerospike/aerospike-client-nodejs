const Aerospike = require('aerospike')

const config = {
  hosts: '172.17.0.3:3000',
  log: {
    level: Aerospike.log.DEBUG,
    file: process.stdout.fd
  }
}
const key = new Aerospike.Key('test', 'demo', 'demo')

// process.on('uncaughtException', (err, origin) => {
//   fs.writeSync(
//     process.stderr.fd,
//     `Caught exception: ${err}\n` +
//     `Exception origin: ${origin}`
//   );
// });

console.log('Connect')
Aerospike.connect(config)
  .then(client => {
    const bins = {
      i: 123,
      s: 'hello',
      b: Buffer.from('world'),
      d: new Aerospike.Double(3.1415),
      g: new Aerospike.GeoJSON({ type: 'Point', coordinates: [103.913, 1.308] }),
      l: [1, 'a', { x: 'y' }],
      m: { foo: 4, bar: 7 }
    }
    const meta = { ttl: 0 }
    const policy = new Aerospike.WritePolicy({
      exists: Aerospike.policy.exists.CREATE_OR_REPLACE,
      timeout: 20000
    })

    console.log('Put')
    return client.put(key, bins, meta, policy)
      .then(() => {
        const ops = [
          Aerospike.operations.incr('i', 1),
          Aerospike.operations.read('i'),
          Aerospike.lists.append('l', 'z'),
          Aerospike.maps.removeByKey('m', 'bar')
        ]

        console.log('Operate')
        return client.operate(key, ops)
      })
      .then(result => {
        console.log(result.bins) // => { c: 4, i: 124, m: null }

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
      .catch(error => {
        console.log('Error')
        client.close()
        return Promise.reject(error)
      })
  })
  .catch(error => console.log(error))
