# Client Class

- [Methods](#methods)
	- [batch_get()](#batch_get)
	- [close()](#close)
	- [connect()](#connect)
	- [get()](#get)
	- [info()](#info)
	- [operate()](#operate)
	- [put()](#put)
	- [remove()](#remove)
	- [select()](#select)


<a name="methods"></a>
## Methods



<a name="batch_get"></a>
### batch_get(keys, [policy,] callback)

Read a batch of records from the cluster.

Parameters:

- `keys` – An array of key objects.
- `policy` – (optional) The BatchPolicy to use for this operation.
- `callback` – The function to call when the operation completes.



<a name="close"></a>
### close()

Close the client connection to the cluster.



<a name="connect"></a>
### connect()

Establish the client connection to the cluster.



<a name="get"></a>
### get(key, [policy,] callback)

Read a record from the cluster using the key provided.

Parameters:

- `key` – A key object.
- `operations` – An array of operation objects.
- `policy` – (optional) A OperationPolicy to use for this operation.
- `callback` – The function to call when the operation completes.



<a name="info"></a>
### info(request, [host,] [port,] callback)

Perform an info request against the cluster or specific host.

Parameters:

- `request` – The info request to send.
- `host` – (optional) The address of a specific host to send the request to.
- `port` – (optional) The port of a specific host to send the request to.
- `callback` – the function to call when the operation completes.

The `request` argument is a string representing an info request. The `host` and `port` arguments are optional, and allow the request to be sent to a specific host, rather than the entire cluster. With the `host` and `port` defined, then client is not required to be connected to a cluster.

The `callback` argument should be function:

```js
function(error, response)
```

The `error` argument represents any error that may have occurred. 

Example:

```js
client.operate(key, "statistics", function(err, response) {
  // do something
});
```


<a name="operate"></a>
### operate(key, operations, [policy,] callback)

Perform multiple operations on a single record. 

Parameters:

- `key` – a key object
- `operations` – an array of operation objects.
- `policy` – (optional) a OperationPolicy to use for this operation.
- `callback` – the function to call when the operation completes.


The `operations` argument is an array of operations, which are populated via the [Operators object](operators.md). 

Example:

```js
var op = aerospike.Operators

var ops = [
  op.append('a', 'xyz'),
  op.incr('b', 10),
  op.read('b')
]

client.operate(key, ops, function(err, rec, meta) {
  // do something
});
```


<a name="put"></a>
### put(key, record, [metadata,] [policy,] callback)

Parameters:

- `key` – a key object
- `operations` – an array of operation objects.
- `policy` – (optional) a OperationPolicy to use for this operation.
- `callback` – the function to call when the operation completes.



<a name="remove"></a>
### remove(key, [policy,] callback)

Parameters:

- `key` – a key object
- `operations` – an array of operation objects.
- `policy` – (optional) a OperationPolicy to use for this operation.
- `callback` – the function to call when the operation completes.



<a name="select"></a>
### select(key, bins, [policy,] callback)

Parameters:

- `key` – a key object
- `operations` – an array of operation objects.
- `policy` – (optional) a OperationPolicy to use for this operation.
- `callback` – the function to call when the operation completes.

