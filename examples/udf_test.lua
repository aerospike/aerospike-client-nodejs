function func_cache( rec , bin1, bin2)
	rec['intbin'] = bin1
	rec['strbin'] = bin2
	if ( aerospike:exists(rec) ) then
		status = aerospike:update(rec)
	else
		status = aerospike:create(rec)
	end
	return status
end

