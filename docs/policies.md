# Policies

Policies provide the ability to modify the behavior of operations.

This document provides information on the structure of policy objects for specific
operations and the allowed values for some of the policies.

- [`Policy Objects`](#Objects)
- [`Policy Values`](#Values)

<a name="Objects"></a>
## Objects

Policy objects are objects which define the behavior of associated operations.

When invoking an operation, you can choose to provide a policy:

```js
client.get(key, {timeout: 1000}, function (error, record, meta, key) { 
  if (error && error.code !== status.AEROSPIKE_OK) {
    // handle failure
  } else {
    // handle success
  }
})
```
<!--
################################################################################
ApplyPolicy
################################################################################
-->
<a name="ApplyPolicy"></a>

### Apply Policy Object

A policy effecting the behavior of UDF execution.

Attributes:

- `key`             – Specifies the behavior for the key.
                      For values, see [Key Policy Values](policies.md#key).
- `timeout`         – Maximum time in milliseconds to wait for the operation to
                      complete. If 0 (zero), then the value will default to
                      global default timeout value
- `commitLevel`     - Commit Level of the operation. Specifies whether to be commited
                      only in Master replica copy or all the replica copies.
                      For values, see [Commit Level Policy Values](policies.md#commitLevel).

<!--
################################################################################
BatchPolicy
################################################################################
-->
<a name="BatchPolicy"></a>

### Batch Policy Object

A policy effecting the behavior of batch operations.

Attributes:

- `timeout`         – Maximum time in milliseconds to wait for the operation to
                      complete. If 0 (zero), then the value will default to
                      global default timeout value.

<!--
################################################################################
InfoPolicy
################################################################################
-->
<a name="InfoPolicy"></a>

### Info Policy Object

A policy effecting the behavior of info operations.

Attributes:

- `check_bounds`    – Ensure the request is within allowable size limits
- `send_as_is`      – Send request without any further processing
- `timeout`         – Maximum time in milliseconds to wait for the operation to
                      complete. If 0 (zero), then the value will default to
                      global default timeout value

<!--
################################################################################
OperatePolicy
################################################################################
-->
<a name="OperatePolicy"></a>

### Operate Policy Object

A policy effecting the behavior of operate operations.

Attributes:

- `key`              – Specifies the behavior for the key.
                       For values, see [Key Policy Values](policies.md#key).
- `gen`              – Specifies the behavior for the generation value.
                       For values, see [Generation Policy Values](policies.md#gen).
- `retry`            – Specifies the behavior for failed operations.
                       For values, see [Retry Policy Values](policies.md#retry).
- `timeout`          – Maximum time in milliseconds to wait for the operation to
                       complete. If 0 (zero), then the value will default to
                       global default timeout value
- `commitLevel`      - Commit Level of the operation. Specifies whether to be commited
                       only in Master replica copy or all the replica copies.
                       For values, see [Commit Level Policy Values](policies.md#commitLevel).
- `replica`          - Specifies which partition replica to read from.
                       For values, see [Replica Policy](policies.md#replica).
- `consistencyLevel` - Specifies the number of replicas to be consulted in a read operation
                       to provide the desired consistency guarantee.
                       For values, see [Consistency Level Policy Values](policies.md#consistencyLevel).

<!--
################################################################################
ReadPolicy
################################################################################
-->
<a name="ReadPolicy"></a>

### Read Policy Object

A policy effecting the behaviour of read operations.

Attributes:

- `key`              – Specifies the behavior for the key.
                       For values, see [Key Policy Values](policies.md#key).
- `timeout`          – Integer datatype. Maximum time in milliseconds to wait for
                       the operation to complete. If 0 (zero), then the value
                       will default to global default timeout value.
- `replica`          - Specifies which partition replica to read from.
                       For values, see [Replica Policy](policies.md#replica).
- `consistencyLevel` - Specifies the number of replicas to be consulted in a read operation
                       to provide the desired consistency guarantee.
                       For values, see [Consistency Level Policy Values](policies.md#consistencyLevel).

<!--
################################################################################
RemovePolicy
################################################################################
-->
<a name="RemovePolicy"></a>

### Remove Policy Object

A policy effecting the behaviour of remove operations.

Attributes:

- `gen`             – Specifies the behavior for the generation value.
                      For values, see [Generation Policy Values](policies.md#gen).
- `generation`      – The generation of the record to be removed.
- `key`             – Specifies the behavior for the key.
                      For values, see [Key Policy Values](policies.md#key).
- `retry`           – Specifies the retry behavior of failed operations.
                      For values, see [Retry Policy Values](policies.md#retry).
- `commitLevel`     - Commit Level of the operation. Specifies whether to be commited
                      only in Master replica copy or all the replica copies.
                      For values, see [Commit Level Policy Values](policies.md#commitLevel).

<!--
################################################################################
WritePolicy
################################################################################
-->
<a name="WritePolicy"></a>

### Write Policy Object

A policy effecting the behaviour of write operations.

Attributes:

- `gen`             – Specifies the behavior for the generation value.
                      For values, see [Generation Policy Values](policies.md#gen).
- `exists`          – Specifies the behavior for the existence of the record.
                      For values, see [Exists Policy Values](policies.md#exists).
- `key`             – Specifies the behavior for the key.
                      For values, see [Key Policy Values](policies.md#key).
- `retry`           – Specifies the retry behavior of failed operations.
                      For values, see [Retry Policy Values](policies.md#retry).
- `timeout`         – Maximum time in milliseconds to wait for the operation to
                      complete. If 0 (zero), then the value will default to
                      global default values.
- `commitLevel`     - Commit Level of the operation. Specifies whether to be commited
                      only in Master replica copy or all the replica copies.
                      For values, see [Commit Level Policy Values](policies.md#commitLevel).

<a name="Values"></a>
## Values

The following are values allowed for various policies.

An enumeration of the values are available in `aerospike.policy` object, which can be accessed similarly to:

```js
var aerospike = require('aerospike')

aerospike.policy.gen.GT
```

<!--
################################################################################
key
################################################################################
-->
<a name="key"></a>

### Key Policy Values

#### DIGEST

Sends the digest value of the key. This is the recommended mode of operation. This calculates the digest and sends the digest to the server. The digest is only calculated on the client, and not on the server.

```js
aerospike.policy.key.DIGEST
```

#### SEND

Sends the key. This policy is ideal if you want to reduce the number of bytes sent over the network. This will only work if the combination of the set and key value are less than 20 bytes, which is the size of the digest. This will also cause the digest to be computed once on the client and once on the server. If your values are not less than 20 bytes, then you should just use Policy.Key.DIGEST

```js
aerospike.policy.key.SEND
```

<!--
################################################################################
retry
################################################################################
-->
<a name="retry"></a>

### Retry Policy Values

#### NONE

Only attempts an operation once

```js
aerospike.policy.retry.NONE
```

#### ONCE

If an operation fails, attempts the operation one more time

```js
aerospike.policy.retry.ONCE
```

<!--
################################################################################
gen
################################################################################
-->
<a name="gen"></a>

### Generation Policy Values

#### IGNORE

Writes a record, regardless of generation.

```js
aerospike.policy.gen.IGNORE
```

#### EQ

Writes a record, ONLY if generations are equal.

```js
aerospike.policy.gen.EQ
```

#### GT

Writes a record, ONLY if local generation is greater-than remote generation.

```js
aerospike.policy.gen.GT
```

#### DUP

Writes a record creating a duplicate, ONLY if the generation collides.

```js
aerospike.policy.gen.DUP
```

<!--
################################################################################
exists
################################################################################
-->
<a name="exists"></a>

### Exists Policy Values

#### IGNORE

Writes the record, regardless of existence.

```js
aerospike.policy.exists.IGNORE
```

#### CREATE

Creates a record, ONLY if it doesn't exist.

```js
aerospike.policy.exists.CREATE
```

<!--
################################################################################
replica
################################################################################
-->
<a name="replica"></a>

### Replica Policy Values

#### MASTER

Read only from Master Replica node.

```js
aerospike.policy.replica.MASTER
```

#### ANY

Read from an unspecified Replica node.

```js
aerospike.policy.replica.ANY
```

<!--
################################################################################
consistencyLevel
################################################################################
-->
<a name="consistencyLevel"></a>

### ConsistencyLevel Policy Values

#### ONE

Involve a single replica in the operation.

```js
aerospike.policy.consistencyLevel.ONE
```

#### ALL

Involve all replicas in the operation.

```js
aerospike.policy.consistencyLevel.ALL
```
<!--
################################################################################
commitLevel
################################################################################
-->
<a name="commitLevel"></a>

### CommitLevel Policy Values

#### ALL

Return succcess only after successfully committing all replicas

```js
aerospike.policy.commitLevel.ALL
```

#### MASTER

Return succcess after successfully committing the master replica

```js
aerospike.policy.commitLevel.MASTER
```
