
var keygen = require('../generators/key');
var metagen = require('../generators/metadata');
var recgen = require('../generators/record');
var putgen = require('../generators/put');
var valgen = require('../generators/value');

var rgen = recgen.record({
    i: valgen.integer(),
    s: valgen.string(),
    b: valgen.bytes()
});

for ( var i = 0; i < 10; i++ ) {
    var rec = rgen();
    console.log('record: ', rec);
}
