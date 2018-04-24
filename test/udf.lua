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

function countGreaterThan(stream, binName, value)
  local function mapper(rec)
    if rec[binName] > value then
      return 1
    else
      return 0
    end
  end
  local function reducer(v1, v2)
    return v1 + v2
  end
  return stream : map(mapper) : reduce(reducer)
end

function even(stream, bin)
  local function filt(rec)
    return rec.value % 2 == 0
  end
  local function mapper(rec)
    return rec.value
  end
  return stream : filter(filt) : map(mapper)
end
