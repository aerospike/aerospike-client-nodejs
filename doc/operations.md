# Client Operations

## get()

Get a record from the database via a key.

	client.get(Key, Options?, function(Error, Bins, Key, Metadata))

Example:

	client.get(["test", "demo", "a"], function(err, bins) {
		// process result
	})

## put()

Put a record int o the database via key.

	client.put(Key, Bins, Metadata?, Options?, function(Error, Metadata, Key))

Example:

	var bins = {
		a: 123,
		b: "abc"
	}

	client.put(["test", "demo", "a"], bins, function(err) {
		// process result
	})
