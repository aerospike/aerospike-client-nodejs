# Client Operations

## get()

Get a record from the database via a key.

	client.get(Key, function(Error, Record))

Example:

	client.get(["test", "demo", "a"], function(err, rec) {
		// process result
	})

## put()

Put a record int o the database via key.

	client.put(Key, Record, function(Error, Record))

Example:

	var rec = {
		a: 123,
		b: "abc"
	}

	client.put(["test", "demo", "a"], rec, function(err, key, meta) {
		// process result
	})
