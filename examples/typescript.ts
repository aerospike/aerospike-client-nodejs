import * as Aerospike from 'aerospike';

(async function () {
  let client = null;
  try {
    client = await Aerospike.connect();
    const key = new Aerospike.Key('test', 'test', 'abcd');
    const bins = {
      name: 'Norma',
      age: 31
    };

    await client.put(key, bins);
    const record = await client.get(key);
    console.info('Record:', record);
    await client.remove(key);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    if (client) client.close();
  }
})();
