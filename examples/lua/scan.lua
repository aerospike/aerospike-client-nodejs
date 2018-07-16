function increment(rec, bin, amount)
	bin = bin or 'i';
	amount = amount or 1;
	trace("Incrementing bin '%s' by %i", bin, amount);
	rec[bin] = rec[bin] + amount;
	aerospike:update(rec);
end
