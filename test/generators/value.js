
/*******************************************************************************
 * HELPERS
 ******************************************************************************/

function random(min,max) {
    var rand = Math.floor(Math.random() * 0x100000000) % max;
    return rand < min ? min : rand;
}

function merge(o1, o2) {
    var o3 = {};
    var k;
    if ( o1 ) {
        for ( k in o1 ) {
            o3[k] = o1[k];
        }
    }
    if ( o2 ) {
        for ( k in o2 ) {
            o3[k] = o2[k];
        }
    }
    return o3;
}

/*******************************************************************************
 * GENERATORS
 ******************************************************************************/

function constant(value) {
    return function() {
        return value;
    }
}

function string(options) {
    var opt = merge(string.defaults, options);
    var seq = 0;
    return function() {
        if ( opt.random === true ) {
            var len = random(opt.length.min, opt.length.max);
            var arr = new Array(len);
            for (var i = 0; i < len; i++) {
                arr[i] = opt.charset[random(0, opt.charset.length)];
            }
            return opt.prefix + arr.join('') + opt.suffix;
        }
        else {
            return opt.prefix + (seq++) + opt.suffix;
        }
    }
}

string.defaults = {
    random: true,
    length: {
        min: 1,
        max: 128
    },
    prefix: '',
    suffix: '',
    charset: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz'
};


function bytes(options) {
    var opt = merge(bytes.defaults, options);
    return function() {
        var len = random(opt.length.min, opt.length.max);
        var buf = new Buffer(len);
        for (var i = 0; i < len; i++) {
            buf[i] = random(opt.byte.min, opt.byte.max);
        }
        return buf;
    }
}

bytes.defaults = {
    length: {
        min: 1,
        max: 1024
    },
    byte: {
        min: 0,
        max: 255
    }
};

function integer(options) {
    var opt = merge(integer.defaults, options);
    var seq = opt.min;
    return function() {
        return opt.random === true ? random(opt.min, opt.max) : seq++;
    }
}

integer.defaults = {
    random: true,
    min: 0,
    max: 0xffffff
};


module.exports = {
    bytes: bytes,
    contant: constant,
    integer: integer,
    string: string
};
