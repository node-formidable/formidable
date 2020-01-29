'use strict';

const assert = require('assert');
const { QuerystringParser } = require('../../src/index');

let parser;

function test(testFn) {
  parser = new QuerystringParser();
  testFn();
}

test(function ctor() {
  assert.equal(parser.buffer, '');
  assert.equal(parser.constructor.name, 'QuerystringParser');
});

test(function write() {
  const a = Buffer.from('a=1');
  parser.write(a);
  assert.equal(parser.bufferLength, a.length);

  const b = Buffer.from('&b=2');
  parser.write(b);
  assert.equal(parser.buffer, a + b);
  assert.equal(parser.bufferLength, a.length + b.length);
});

// ! skip
// test(function end() {
//   const FIELDS = { a: ['b', { c: 'd' }], e: 'f' };

//   gently.expect(GENTLY.hijacked.querystring, 'parse', (str) => {
//     assert.equal(str, parser.buffer);
//     return FIELDS;
//   });

//   gently.expect(parser, 'onField', Object.keys(FIELDS).length, (key, val) => {
//     assert.deepEqual(FIELDS[key], val);
//   });

//   gently.expect(parser, 'onEnd');

//   parser.buffer = 'my buffer';
//   parser.end();
//   assert.equal(parser.buffer, '');
// });
