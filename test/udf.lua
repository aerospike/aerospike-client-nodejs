function withArguments(rec, value)
  return value
end

function withoutArguments(rec)
  return 1
end

function noop(rec)
end


function createRecord(rec, binName, binValue)
  rec[binName] = binValue
  if (aerospike:exists(rec)) then
    status = aerospike:udpate(rec)
  else
    status = aerospike:create(rec)
  end
  return status
end

function updateRecord(rec, binName, binValue)
  rec[binName] = binValue
  aerospike:update(rec)
  return rec
end

function count(stream)
  local function mapper(rec)
    return 1
  end
  local function reducer(v1, v2)
    return v1 + v2
  end
  return stream : map(mapper) : reduce(reducer)
end

function multiply(stream, bin, factor)
  local function mult(rec)
    return map { value = rec[bin] * factor }
  end
  return stream : map(mult)
end
