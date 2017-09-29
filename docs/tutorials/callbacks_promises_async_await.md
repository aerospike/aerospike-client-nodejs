Starting with version 3.0, the Aerospike Node.js client supports both
Node.js-style callbacks as well as Promises for all asynchronous database
operations. If you are using Node.js v8 or later, that means you can also use
the client with async/await. This brief tutorial demonstrates how to use all
three methods of dealing with asynchronous client operations.

In all three cases we will implement a trivial demo program, that writes a new
record to an Aerospike database, then reads that record back, and finally
deletes the record. Potential errors will need to be handled correctly in each
of these steps. We also need to take care to close the client connection at the
end of the program because if the connection is left open this will prevent the
Node.js event loop from closing down.

## Callbacks

First we will use traditional Node.js style callbacks to handle asynchronous
database operations. All client commands accept a callback function as the last
function parameter. This callback function will be called once the database
operation has completed. The exact method signature for the callback varies
from command to command. But all callback functions take an `error` value as
their first argument. The `error` value will either be `null`, if the operation
was successful, or else it will be an instance of the `AerospikeError` class.

As a second parameter, some callbacks will receive a single result value. E.g.
the callback for the client's `get` command returns the `Record` object that it
read from the database. Other operations, such as the `truncate` command do not
return a result value. In any case, the result value will be `undefined` if the
operation failed, i.e. if the callback is called with an `AerospikeError`.

Here is our simple demo that writes, reads and finally deletes a single record
from the database:

```javascript
const Aerospike = require('aerospike')

function abort (error, client) {
  console.error('Error:', error)
  if (client) client.close()
  process.exit(1)
}

Aerospike.connect(function (error, client) {
  if (error) abort(error, client)

  let key = new Aerospike.Key('test', 'test', 'abcd')
  let bins = {
    name: 'Norma',
    age: 31
  }

  client.put(key, bins, function (error) {
    if (error) abort(error, client)
    client.get(key, function (error, record) {
      if (error) abort(error, client)
      console.info('Record:', record)
      client.remove(key, function (error) {
        if (error) abort(error, client)
        client.close()
      })
    })
  })
})
```

Notice how we need to check for errors in every single callback function. If
the none of the database operations fails, we need to close the client
connection in the last callback that is being executed, i.e. after the `remove`
operation was successfully completed. In case of an error we also need to close
the connection before terminating the program.

## Promises

The Mozilla Developer Network (MDN) describes Promises as follows: "A Promise
is an object representing the eventual completion or failure of an asynchronous
operation. [...] Essentially, a promise is a returned object to which you
attach callbacks, instead of passing callbacks into a function." More
information about the usage of Promises can be found in [this excellent
guide](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises)
on the MDN web site.

To use Promises with the Aerospike Node.js client, you simply omit the callback
parameter when calling any of the client's asynchronous database operations. If
no callback function is passed, the client will return a Promise instead.

In the case of a successful completion of the database operation, the Promise
will resolve to the same result value passed to the Node.js-style callback. In
the case of a failure, the Promise resolves to an `AerospikeError` instance
instead.

Let's see, how our simple demo looks like when using Promises instead of
Node.js-style callback functions:

```javascript
const Aerospike = require('aerospike')

Aerospike.connect()
  .then(client => {
    let key = new Aerospike.Key('test', 'test', 'abcd')
    let bins = {
      name: 'Norma',
      age: 31
    }

    return client.put(key, bins)
      .then(() => client.get(key))
      .then(record => console.info('Record:', record))
      .then(() => client.remove(key))
      .then(() => client.close())
      .catch(error => {
        client.close()
        throw error
      })
  })
  .catch(error => {
    console.error('Error:', error)
    process.exit(1)
  })
```

You can see that the demo makes heavy use of "promise chaining" to execute two
or more asynchronous operations back to back, where each subsequent operation
starts when the previous operation succeeds, with the result from the previous
step. This simplifies error handling, as we only need to handle errors once at
the end of the chain.

But note that we still need to take care to close the client connection
regardless of whether the operations succeed or fail.

## async/await

In our last version of the demo program, we are making use of the new `await`
operator and `async` functions introduced in Node.js v8. To [quote
MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function)
again, "the purpose of async/await functions is to simplify the behavior of
using promises synchronously and to perform some behavior on a group of
Promises. Just as Promises are similar to structured callbacks, async/await is
similar to combining generators and promises."

Using the new `await` operator, our Promises-based demo can be simplified
further:

```javascript
const Aerospike = require('aerospike')

;(async function () {
  let client
  try {
    client = await Aerospike.connect()
    let key = new Aerospike.Key('test', 'test', 'abcd')
    let bins = {
      name: 'Norma',
      age: 31
    }

    await client.put(key, bins)
    let record = await client.get(key)
    console.info('Record:', record)
    await client.remove(key)
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  } finally {
    if (client) client.close()
  }
})()
```

The `await` expression causes async function execution to pause, to wait for
the Promise's resolution, and to resume the async function execution when the
value is resolved. It then returns the resolved value. If the value is not a
Promise, it's converted to a resolved Promise.

If the Promise is rejected, the `await` expression throws the rejected value.

Note that we have to wrap our code in an anonymous, `async` function to use
`await`.

Because we can use regular `try...catch...finally` statements to handle
synchronous as well as asynchronous errors when using `await`, we can ensure
that the client connection gets close regardless of whether the database
operations succeeded or failed.
