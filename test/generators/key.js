var valgen = require('./value');

/**
 * Returns a generator for bytes keys.
 */
function bytes(namespace, set, options) {
    var bgen = valgen.bytes(options);
    return function() {
        return { ns: namespace, set: set, key: bgen()};
    };
}

/**
 * Returns a generator for string keys.
 */
function string(namespace, set, options) {
    var sgen = valgen.string(options);
    return function() {
        return { ns: namespace, set: set, key: sgen()};
    };
}

/**
 * Returns a generator for integer keys.
 */
function integer(namespace, set, options) {
    var igen = valgen.integer(options);
    return function() {
        return { ns: namespace, set: set, key: igen()};
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
    bytes: bytes,
    integer: integer,
    string: string,
    range: range
};