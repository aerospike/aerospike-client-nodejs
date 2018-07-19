local function one(rec)
	return 1
end

local function add(a, b)
	return a + b
end

function count(stream)
	return stream : map(one) : reduce(add)
end
