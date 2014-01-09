
function range(end, start) {
    start = start ? start : 0;
    end = end ? end : start + 1;
    var i, j;
    var a = Array(end-start+1);
    for ( i = 0, j = start; j < end; i++, j++ ) {
        a[i] = j;
    }
    return a;
}

module.exports = {
    range: range
}