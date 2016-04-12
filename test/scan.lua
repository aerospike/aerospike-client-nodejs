function udpateRecord(rec)
	rec['i'] = rec['i']+1;
	aerospike:update(rec);
end

function createBin(rec, binName, binValue)
  rec[binName] = binValue
  aerospike:update(rec)
  return rec
end
