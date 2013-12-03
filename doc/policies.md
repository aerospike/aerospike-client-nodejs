# Policies Object

The Policies object contains an enumeration of values for policies. modify the behavior of database operations. The policies object provides values that are available for each policy.

Example:

```js
var policies = aerospike.Policies

client.get(key, {key=policies.Key.SEND}, callback)
```



## Key Policy Values

#### DIGEST

Send the digest value of the key. This is the recommended mode of operation. This calculates the digest and send the digest to the server. The digest is only calculated on the client, and not on the server. 

```js
policies.Key.DIGEST
```

#### SEND

Send the key. This policy is ideal if you want to reduce the number of bytes sent over the network. This will only work if the combination the set and key value are less than 20 bytes, which is the size of the digest. This will also cause the digest to be computer once on the client and once on the server. If your values are not less than 20 bytes, then you should just use Policy.Key.DIGEST

```js
policies.Key.SEND
```


## Retry Policy Values

#### NONE

Only attempt an operation once

```js
policies.Retry.NONE
```

#### ONCE

If an operation fails, attempt the operation one more time

```js
policies.Retry.ONCE
```


## Generation Policy Values

#### IGNORE

Write a record, regardless of generation.

```js
policies.Generation.IGNORE
```

#### EQ

Write a record, ONLY if generations are equal.

```js
policies.Generation.EQ
```

#### GT

Write a record, ONLY if local generation is greater-than remote generation.

```js
policies.Generation.GT
```

#### DUP

Write a record creating a duplicate, ONLY if the generation collides.

```js
policies.Generation.DUP
```


## Exists Policy Values

#### IGNORE

Write the record, regardless of existence

```js
policies.Exists.IGNORE
```

#### CREATE

Create a record, ONLY if it doesn't exist

```js
policies.Exists.CREATE
```
