    const Aerospike = require('./lib/aerospike')
    const exp = Aerospike.exp;
    const lists = Aerospike.lists;
    
    




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
 
 const key = new Aerospike.Key('test', 'demo', 'mykey1')



 ;(async () => {
    const client = await Aerospike.connect({
      hosts: "127.0.0.1:3000",
    });
    
    const filter = Aerospike.filter;
    
    // Define the namespace and set for the records
    const NAMESPACE = "test";
    const SET = "cust_data";
    
      // Sample customer data
    const customers = [
      { key: 1, name: "Tim", age: 312, country: "Australia" },
      { key: 2, name: "Bob", age: 47, country: "Canada" },
      { key: 3, name: "Jo", age: 15, country: "USA" },
      { key: 4, name: "Steven", age: 23, country: "Botswana" },
      { key: 5, name: "Susan", age: 32, country: "Canada" },
      { key: 6, name: "Jess", age: 17, country: "Botswana" },
      { key: 7, name: "Sam", age: 18, country: "USA" },
      { key: 8, name: "Alex", age: 47, country: "Canada" },
      { key: 9, name: "Pam", age: 56, country: "Australia" },
      { key: 10, name: "Vivek", age: 12, country: "India" },
      { key: 11, name: "Kiril", age: 22, country: "Sweden" },
      { key: 12, name: "Bill", age: 23, country: "UK" },
    ];
    
    // Insert sample customers to demonstrate which records get indexed
    const promises = customers.map((customer) => {
      return client.put(new Aerospike.Key(NAMESPACE, SET, customer.key), {
        name: customer.name,
        age: customer.age,
        country: customer.country,
      });
    });
    
    await Promise.all(promises);

    // Create a query object
    const query = client.query(NAMESPACE, SET);
    
//    const obj = {
//      ns: 'test',
//      set: 'demo',
//      exp: 'lHuTEJMEk1ECo2FnZRKVfwEAkxYNk1EDp2NvdW50cnmSfpOqA0F1c3RyYWxpYacDQ2FuYWRhqQNCb3Rzd2FuYZNRAqNhZ2WRAA==',
//      index: 'cust_index',
//      type: Aerospike.indexType.DEFAULT,
//      datatype: Aerospike.indexDataType.NUMERIC
//    }
//    console.log(await client.createExpIndex(obj))

    
    // Query via the expression index to fetch records for customers that are 25 and older
    query.whereWithIndexName(
      filter.range(null, 25, Number.MAX_SAFE_INTEGER),
      "cust_index",
    );

    // Execute the query and print the results
    const results = await query.results();
    
    for (const result of results) {
      console.log(result);
    }

    await client.close()
 
 })();