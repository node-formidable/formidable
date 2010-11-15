require('../common');
var Parser = require('formidable/json_parser').JSONParser,
    Buffer = require('buffer').Buffer,
    gently,
    parser;

function test(test) {
  gently = new Gently();
  parser = new Parser();
  test();
  gently.verify(test.name);
}

test(function constructor() {
  assert.equal(parser.buffer, '');
  assert.equal(parser.constructor.name, 'JSONParser');
});

test(function write() {
  var a = new Buffer('{"foo": "bar", "truthy": true, "falsy": false, "arr": [1, 3.1415926, "PI", [99, 100], {"bar": "baz"}]');
  assert.equal(parser.write(a), 101);

  var b = new Buffer(', "null": null}');
  parser.write(b);
  assert.equal(parser.buffer, a + b);
});

test(function end() {
  var FIELDS = {foo: "bar", truthy: true, falsy: false, arr: [1, 3.1415926, "PI", [99, 100], {bar: "baz"}], "null": null};

  gently.expect(JSON, 'parse', function(str) {
    assert.equal(str, parser.buffer);
    return FIELDS;
  });

  gently.expect(parser, 'onField', Object.keys(FIELDS).length, function(key, val) {
    assert.deepEqual(FIELDS[key], val);
  });

  gently.expect(parser, 'onEnd');

  parser.buffer = 'any crap left';
  parser.end();
  assert.equal(parser.buffer, '');
});
