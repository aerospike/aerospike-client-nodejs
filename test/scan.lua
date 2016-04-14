function createBin(rec, binName, binValue)
  rec[binName] = binValue
  aerospike:update(rec)
  return rec
end
