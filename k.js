 const Aerospike = require('./lib/aerospike')

 // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
 var config = {
   hosts: 'localhost:3000',
   // Timeouts disabled, latency dependent on server location. Configure as needed.
   policies: {
     read : new Aerospike.ReadPolicy({socketTimeout : 0, totalTimeout : 0}),
     write : new Aerospike.WritePolicy({socketTimeout : 0, totalTimeout : 0}),
    }
 }


const Context = Aerospike.cdt.Context
 
 const exp = Aerospike.exp
 const maps = Aerospike.maps
 const op = Aerospike.operations
 
 const key = new Aerospike.Key('test', 'demo', 'mykey1')
 
 const bins = {
    floatList: [2.4, 4.8, 7.2]
 }
 
 ;(async () => {
    const client = await Aerospike.connect(config)
      
    await client.put(key, bins)
 
    const addAllChildren = new Context().addAllChildren()
 
 
    const ops = [
      op.selectByPath('floatList', exp.pathSelectFlags.VALUE, addAllChildren)
    ]

    const result = await client.operate(key, ops)


    console.log(result.bins) // { floatList: [ 2.4, 4.8, 7.2 ] }
 
    await client.close()
 
 })();