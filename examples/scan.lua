function udpateRecord(rec)
	rec['i'] = rec['i']+1;
	aerospike:update(rec);
end
