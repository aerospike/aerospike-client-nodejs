local function putBin(r,name,value)
    if not aerospike:exists(r) then aerospike:create(r) end
    r[name] = value
    aerospike:update(r)
end

-- Set a particular bin
function writeBin(r,name,value)
    putBin(r,name,value)
end

-- Get a particular bin
function readBin(r,name)
    return r[name]
end

-- Return generation count of record
function getGeneration(r)
    return record.gen(r)
end

-- Update record only if gen hasn't changed
function writeIfGenerationNotChanged(r,name,value,gen)
    if record.gen(r) == gen then
        r[name] = value
        aerospike:update(r)
    end
end

-- Set a particular bin only if record does not already exist.
function writeUnique(r,name,value)
    if not aerospike:exists(r) then
        r[name] = value
        aerospike:update(r)
    end
end

-- Set a particular bin only if value is between 1 and 10.
function writeWithValidation(r,name,value)
    if value >= 1 and value <= 10 then
        r[name] = value
        aerospike:update(r)
    else
        error("Value out of range")
    end
end

-- Return 1 if value exists in list bin, 0 otherwise.
function valueExists(r,name,value)
    local list = r[name]
    if list == nil then
        return 0
    end
    for i = 1, #list do
        if list[i] == value then
            return 1
        end
    end
    return 0
end
