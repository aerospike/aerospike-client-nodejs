
/**
 * Returns a static record.
 */
function constant(metadata) {
    return function(key) {
        return metadata;
    };
}

module.exports = {
    constant: constant
};