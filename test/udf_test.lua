function rec_update( rec , bin1, bin2)
	rec['intbin'] = bin1
	rec['strbin'] = bin2
	status = aerospike:update(rec)
	return status
end

function rec_create( rec )
	rec['intbin'] = 123
	rec['strbin'] = 'foobar'
	status = aerospike:create(rec)
	return status
end

