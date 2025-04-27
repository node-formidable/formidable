const common = require('../common');

const CHUNK_LENGTH = 10;
const multipartParser = require(`${common.lib}/multipart_parser`);
const { MultipartParser } = multipartParser;
const parser = new MultipartParser();
const fixtures = require(`${TEST_FIXTURES}/multipart`);

Object.keys(fixtures).forEach(function(name) {
  const fixture = fixtures[name];
  const buffer = Buffer.alloc(Buffer.byteLength(fixture.raw, 'binary'));
  let offset = 0;
  let chunk;
  let nparsed;

  const parts = [];
  let part = null;
  let headerField;
  let headerValue;
  let endCalled = '';

  parser.initWithBoundary(fixture.boundary);
  parser.onPartBegin = function() {
    part = { headers: {}, data: '' };
    parts.push(part);
    headerField = '';
    headerValue = '';
  };

  parser.onHeaderField = function(b, start, end) {
    headerField += b.toString('ascii', start, end);
  };

  parser.onHeaderValue = function(b, start, end) {
    headerValue += b.toString('ascii', start, end);
  };

  parser.onHeaderEnd = function() {
    part.headers[headerField] = headerValue;
    headerField = '';
    headerValue = '';
  };

  parser.onPartData = function(b, start, end) {
    const str = b.toString('ascii', start, end);
    part.data += b.slice(start, end);
  };

  parser.onEnd = function() {
    endCalled = true;
  };

  buffer.write(fixture.raw, 0, undefined, 'binary');

  while (offset < buffer.length) {
    if (offset + CHUNK_LENGTH < buffer.length) {
      chunk = buffer.slice(offset, offset + CHUNK_LENGTH);
    } else {
      chunk = buffer.slice(offset, buffer.length);
    }
    offset += CHUNK_LENGTH;

    nparsed = parser.write(chunk);
    if (nparsed != chunk.length) {
      if (fixture.expectError) {
        return;
      }
      puts('-- ERROR --');
      p(chunk.toString('ascii'));
      throw new Error(
        `${chunk.length} bytes written, but only ${nparsed} bytes parsed!`,
      );
    }
  }

  if (fixture.expectError) {
    throw new Error('expected parse error did not happen');
  }

  assert.ok(endCalled);
  assert.deepEqual(parts, fixture.parts);
});
