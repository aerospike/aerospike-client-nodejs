# Client Class

- [Methods](#methods)
	- [batch_get()](#methods/batch_get)
	- [close()](#methods/close)
	- [connect()](#methods/connect)
	- [get()](#methods/get)
	- [info()](#methods/info)
	- [operate()](#methods/operate)
	- [put()](#methods/put)
	- [remove()](#methods/remove)
	- [select()](#methods/select)


<a name="methods"></a>
## Methods

<a name="methods/batch_get"></a>
### batch_get(keys, [policy,] callback)

Read a batch of records from the cluster.

Parameters:

- `keys` – An array of key objects.
- `policy` – (optional) The BatchPolicy to use for this operation.
- `callback` – The function to call when the operation completes.

---

<a name="methods/close"></a>
### close()

Close the client connection to the cluster.

---

<a name="methods/connect"></a>
### connect()

Establish the client connection to the cluster.

---

<a name="methods/get"></a>
### get(key, [policy,] callback)

Read a record from the cluster using the key provided.

Parameters:

- `key` – A key object.
- `operations` – An array of operation objects.
- `policy` – (optional) A OperationPolicy to use for this operation.
- `callback` – The function to call when the operation completes.

---

<a name="methods/info"></a>
### info(request, [host,] [port,] callback)

Perform an info request against the cluster or specific host.

Parameters:

- `request` – The info request to send.
- `host` – (optional) The address of a specific host to send the request to.
- `port` – (optional) The port of a specific host to send the request to.
- `callback` – the function to call when the operation completes.

---

<a name="methods/operate"></a>
### operate(key, operations, [policy,] callback)

Parameters:

- `key` – a key object
- `operations` – an array of operation objects.
- `policy` – (optional) a OperationPolicy to use for this operation.
- `callback` – the function to call when the operation completes.

---

<a name="methods/put"></a>
### put(key, record, [metadata,] [policy,] callback)

Parameters:

- `key` – a key object
- `operations` – an array of operation objects.
- `policy` – (optional) a OperationPolicy to use for this operation.
- `callback` – the function to call when the operation completes.

---

<a name="methods/remove"></a>
### remove(key, [policy,] callback)

Parameters:

- `key` – a key object
- `operations` – an array of operation objects.
- `policy` – (optional) a OperationPolicy to use for this operation.
- `callback` – the function to call when the operation completes.

---

<a name="methods/select"></a>
### select(key, bins, [policy,] callback)

Parameters:

- `key` – a key object
- `operations` – an array of operation objects.
- `policy` – (optional) a OperationPolicy to use for this operation.
- `callback` – the function to call when the operation completes.

