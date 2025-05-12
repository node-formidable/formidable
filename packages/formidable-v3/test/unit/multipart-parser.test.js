import { parsers } from '../../src/index.js';

test('on constructor', () => {
  const parser = new parsers.MultipartParser();
  expect(parser.boundary).toBeNull();
  expect(parser.state).toBe(0);
  expect(parser.flags).toBe(0);
  expect(parser.boundaryChars).toBeNull();
  expect(parser.index).toBeNull();
  expect(parser.lookbehind).toBeNull();
  expect(parser.constructor.name).toBe('MultipartParser');
});

test('initWithBoundary', () => {
  const boundary = 'abc';
  const parser = new parsers.MultipartParser();
  parser.initWithBoundary(boundary);

  // eslint-disable-next-line prefer-reflect
  expect(Array.prototype.slice.call(parser.boundary)).toMatchObject([
    13,
    10,
    45,
    45,
    97,
    98,
    99,
  ]);
  expect(parser.state).toBe(parsers.MultipartParser.STATES.START);

  expect(parser.boundaryChars).toMatchObject({
    10: true,
    13: true,
    45: true,
    97: true,
    98: true,
    99: true,
  });
});

test('initWithBoundary failing', () => {
  const parser = new parsers.MultipartParser();
  const boundary = 'abc';
  const buffer = Buffer.alloc(5);

  parser.initWithBoundary(boundary);
  buffer.write('--ad', 0);
  expect(parser.bufferLength).toBe(0);

  parser.write(buffer);
  expect(parser.bufferLength).toBe(5);
});

test('on .end() throwing', () => {
  const parser = new parsers.MultipartParser();
  parser.once('error', () => {});

  const res = parser.end();
  expect(res.state).toBe(0);

  // expect(() => { parser.end() }).toThrow(/MultipartParser/);
  // expect(() => { parser.end() }).toThrow(/stream ended unexpectedly/);
  // expect(() => { parser.end() }).toThrow(parser.explain());
});

test('on .end() successful', () => {
  const parser = new parsers.MultipartParser();
  parser.state = parsers.MultipartParser.STATES.END;

  const res = parser.end();
  expect(res.state).toBe(12);
});
