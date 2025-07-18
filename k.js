const Aerospike = require('./lib/aerospike')

let config = {
    hosts: [
        { addr: "127.0.0.1", port: 4333,  tlsname: 'child'}
    ],
    user: 'child',
    password: 'password',
	//tls: {
	//	enable: true,
	//	cafile: '/etc/aerospike/ssl/root.crt',
	//	certfile: '/etc/aerospike/ssl/brawn.crt',
	//	keyfile: '/etc/aerospike/ssl/brawn.key.pem',
	//	keyfilePassword: 'citrusstore'
	//}
	tls: {
		enable: true,
		cafile: '/etc/aerospike/ssl/root.crt',
		certfile: '/etc/aerospike/ssl/child.crt',
		keyfile: '/etc/aerospike/ssl/child.key.pem'
	},
	authMode: Aerospike.auth.AUTH_PKI
}


console.log(Aerospike.auth)


;(async function () {
	let client;
	try {



    	client = await Aerospike.connect(config)

    	let record = await client.put(new Aerospike.Key("test", "demo", 1), {'a': 1})
    	console.log(record)
    }
    catch(error){
    	console.log(error)
    }
    finally{
    	await client.close()
    }
})()
