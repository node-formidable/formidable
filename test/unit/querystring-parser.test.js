'use strict';

const { QuerystringParser } = require('../../src/index');

test('on constructor', () => {
  const parser = new QuerystringParser();
  expect(parser.buffer).toBe('');
  expect(parser.constructor.name).toBe('QuerystringParser');
});

test('on .write', () => {
  const parser = new QuerystringParser();
  const a = Buffer.from('a=1');
  parser.write(a);
  expect(parser.bufferLength).toBe(a.length);

  const b = Buffer.from('&b=2');
  parser.write(b);
  expect(parser.buffer).toBe(a + b);
  expect(parser.bufferLength).toBe(a.length + b.length);
});

// ! skip
// test(function end =>
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
