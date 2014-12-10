-- A simple UDF that just returns the value of the bin 'test-bin'.
local function get_test_bin(rec)
	return rec['i']
end

-- A simple arithmetic UDF that adds two arguments and returns the result.
local function add(a, b)
	return a + b
end

-- An aggregation UDF that uses the local UDFs above to execute a 'map reduce'
-- operation and return the overall result.
function sum_test_bin(stream)
	return stream : map(get_test_bin) : reduce(add)
end

-- A UDF that returns the sum of the argument and the bin value of 'test-bin'.
local function add_test_bin(a, rec)
	return a + rec['i']
end

-- An aggregation UDF that uses local UDFs above to execute an aggregation and
-- return the overall result.
function sum_test_bin_2(stream)
	return stream : aggregate(0, add_test_bin) : reduce(add)
end

-- A UDF that returns true if the bin value of 'test-bin' is even, false if not.
local function even_test_bin(rec)
	return rec['i'] % 2 == 0
end

-- An aggregation UDF that uses local UDFs above to execute an aggregation after
-- applying a filter, and return the overall result.
function sum_test_bin_even(stream)
	return stream : filter(even_test_bin) : aggregate(0, add_test_bin) : reduce(add)
end


-- A UDF that parses the string in 'numbers-bin'. Each numeric token found is
-- inserted (as a key) in supplied map m with initial value 1. If the key
-- already exists the value is incremented. The resulting map m is returned.
local function parse_numbers(m, rec)
	local s = rec['i']
	for n in string.gmatch(s, "%d+") do
		m[n] = (m[n] or 0) + 1
	end
	return m
end

-- A UDF that merges two maps, such that the resulting map's keys are the union
-- of the original maps' keys, and each resulting map value is the sum of the
-- original maps' values at that key if both had the key, or the original map's
-- value at that key if only one map had the key.
local function map_merge(m1, m2)
	return map.merge(m1, m2, add)
end

-- An aggregation UDF that uses local UDFs above to execute an aggregation of
-- map objects (not to be confused with the 'map' in 'map reduce') and return
-- the overall result.
function count_numbers(stream)
	return stream : aggregate(map(), parse_numbers) : reduce(map_merge)
end


