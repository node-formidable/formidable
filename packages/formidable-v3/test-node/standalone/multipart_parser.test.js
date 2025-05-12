import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import test from 'node:test';

import { malformedMultipart } from '../../src/FormidableError.js';
import MultipartParser from '../../src/parsers/Multipart.js';

test('MultipartParser does not hang', async (_t, done) => {
  const mime = `--_\r\n--_--\r\n`;
  const parser = new MultipartParser();
  parser.initWithBoundary('_');
  try {
    for await (const {
      buffer, end, name, start,
    } of Readable.from(mime).pipe(parser)) {
      console.log(name, buffer ? buffer.subarray(start, end).toString() : '');
    }
  } catch (err) {
    assert.deepEqual(err.code, malformedMultipart);
    done();
    return;
    // console.error('error');
    // console.error(e);
  }
  assert.ok(false, 'should catch error');
});
