function rec_update( rec , bin1, bin2)
	rec['intbin'] = bin1
	rec['strbin'] = bin2
	if (aerospike:exists(rec)) then
		status = aerospike:update(rec)
	else
		status = aerospike:create(rec)
	end
	return status
end

function rec_create( rec )
	rec['intbin'] = 123
	rec['strbin'] = 'foobar'
	if (aerospike:exists(rec)) then
		status = aerospike:udpate(rec)
	else
		status = aerospike:create(rec)
	end
	return status
end

