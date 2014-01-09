
/**
 * Returns a generator for string keys.
 */
function string_prefix(namespace, set, prefix) {
    var i = 0;
    return function() {
        return { ns: namespace, set: set, key: prefix + "" + (i++)};
    };
}

/**
 * Returns a generator for integer keys.
 */
function integer_random(namespace, set, divisor) {
    return function() {
        var a = Math.random();
        var n = divisor ? divisor : 1000;
        return { ns: namespace, set: set, key: a % n};
    };
}


function range(keygen, end, start) {
    start = start ? start : 0;
    end = end ? end : start + 1;
    var i = 0;
    var a = []
    for ( ; i < end; i++ ) {
        a.push(keygen());
    }
    return a;
}

module.exports = {
    string_prefix: string_prefix,
    integer_random: integer_random,
    range: range
};