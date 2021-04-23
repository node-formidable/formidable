import { QuerystringParser } from '../../src/index.js';

test('on constructor', () => {
  const parser = new QuerystringParser();
  expect(parser.constructor.name).toBe('QuerystringParser');
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
