'use strict';

const assert = require('assert');

const { MultipartParser } = require('../../src/index');

let parser;

function test(testFn) {
  parser = new MultipartParser();
  testFn();
}

test(function constructor() {
  assert.strictEqual(parser.boundary, null);
  assert.strictEqual(parser.state, 0);
  assert.strictEqual(parser.flags, 0);
  assert.strictEqual(parser.boundaryChars, null);
  assert.strictEqual(parser.index, null);
  assert.strictEqual(parser.lookbehind, null);
  assert.strictEqual(parser.constructor.name, 'MultipartParser');
});

test(function initWithBoundary() {
  const boundary = 'abc';
  parser.initWithBoundary(boundary);
  assert.deepEqual(Array.prototype.slice.call(parser.boundary), [
    13,
    10,
    45,
    45,
    97,
    98,
    99,
  ]);
  assert.strictEqual(parser.state, MultipartParser.STATES.START);

  assert.deepEqual(parser.boundaryChars, {
    10: true,
    13: true,
    45: true,
    97: true,
    98: true,
    99: true,
  });
});

test(function parserError() {
  const boundary = 'abc';
  const buffer = Buffer.alloc(5);

  parser.initWithBoundary(boundary);
  buffer.write('--ad', 0);
  // assert.strictEqual(parser.bufferLength, 0);
  parser.write(buffer);
  assert.strictEqual(parser.bufferLength, 5);
});

// ! skip
// test(function end() {
//   (function testError() {
//     assert.strictEqual(
//       parser.end().message,
//       `MultipartParser.end(): stream ended unexpectedly: ${parser.explain()}`,
//     );
//   })();

//   (function testRegular() {
//     parser.state = MultipartParser.STATES.END;
//     assert.strictEqual(parser.end(), undefined);
//   })();
// });
