
/**
 * Returns a static record.
 */
function constant(bins) {
    return function(key, metadata) {
        return bins
    };
}

/**
 * Returns a record from bins spec'd using generators record.
 */
function record(bins) {
    return function(key, metadata) {
        var out = {};
        for ( var bin in bins ) {
            out[bin] = bins[bin]()
        }
        return out;
    };
}

module.exports = {
    constant: constant,
    record: record
};