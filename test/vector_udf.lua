-- Record and stream UDFs for the vector tests (test/vector/udf.ts).

-- Returns its argument unchanged.
function echo(rec, value)
  return value
end

-- Returns bin v of the record.
function read_v(rec)
  return rec['v']
end

-- Writes value to bin v.
function write_v(rec, value)
  rec['v'] = value
  if aerospike:exists(rec) then
    return aerospike:update(rec)
  end
  return aerospike:create(rec)
end

-- Returns the Lua type and byte size of bin v, as the server sees it.
function describe_v(rec)
  local v = rec['v']
  return type(v) .. ':' .. tostring(bytes.size(v))
end

local function bin_v(rec) return rec['v'] end
local function first(a, b) return a end

-- Stream UDF: the stage after reduce runs in the client.
function stream_v(stream)
  return stream : map(bin_v) : reduce(first) : map(function (v) return v end)
end

-- Stream UDF: the Lua type and byte size of bin v in the client stage.
function stream_describe_v(stream)
  return stream : map(bin_v) : reduce(first) : map(function (v) return type(v) .. ':' .. tostring(bytes.size(v)) end)
end
