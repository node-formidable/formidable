const common = require('../common');

const { QuerystringParser } = require(`${common.lib}/querystring_parser`);
let gently;
let parser;

function test(test) {
  gently = new Gently();
  parser = new QuerystringParser();
  test();
  gently.verify(test.name);
}

test(function constructor() {
  assert.equal(parser.buffer, '');
  assert.equal(parser.constructor.name, 'QuerystringParser');
});

test(function write() {
  const a = Buffer.from('a=1');
  assert.equal(parser.write(a), a.length);

  const b = Buffer.from('&b=2');
  parser.write(b);
  assert.equal(parser.buffer, a + b);
});

test(function end() {
  const FIELDS = { a: ['b', { c: 'd' }], e: 'f' };

  gently.expect(GENTLY.hijacked.querystring, 'parse', function(str) {
    assert.equal(str, parser.buffer);
    return FIELDS;
  });

  gently.expect(parser, 'onField', Object.keys(FIELDS).length, function(
    key,
    val,
  ) {
    assert.deepEqual(FIELDS[key], val);
  });

  gently.expect(parser, 'onEnd');

  parser.buffer = 'my buffer';
  parser.end();
  assert.equal(parser.buffer, '');
});
