
/**
 * Returns a static record.
 */
function constant(bins) {
    return function(key, metadata) {
        return bins
    };
}

module.exports = {
    constant: constant
};