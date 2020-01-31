'use strict';

const assert = require('assert');

const MultipartParser = require('../src/parsers/Multipart');

const parser = new MultipartParser();
const customBoundary = '-----------------------------168072824752491622650073';
const mb = 1000; // 1GB
const buf = createMultipartBuffer(customBoundary, mb * 1024 * 1024);

const calls = {
  partBegin: 0,
  headerField: 0,
  headerValue: 0,
  headerEnd: 0,
  headersEnd: 0,
  partData: 0,
  partEnd: 0,
  end: 0,
};

const start = Date.now();

parser.initWithBoundary(customBoundary);
parser.on('data', ({ name }) => {
  calls[name] += 1;
});

parser.write(buf);

const duration = Date.now() - start;
const mbPerSec = (mb / (duration / 1000)).toFixed(2);

console.log(`${mbPerSec} mb/sec`);

function createMultipartBuffer(boundary, size) {
  const head =
    `--${boundary}\r\n` +
    `content-disposition: form-data; name="field1"\r\n` +
    `\r\n`;
  const tail = `\r\n--${boundary}--\r\n`;
  const buffer = Buffer.alloc(size);

  buffer.write(head, 0, 'ascii');
  buffer.write(tail, buffer.length - tail.length, 'ascii');
  return buffer;
}

process.on('exit', () => {
  assert.deepStrictEqual(calls, {
    partBegin: 1,
    headerField: 1,
    headerValue: 2,
    headerEnd: 1,
    headersEnd: 1,
    partData: 2,
    partEnd: 1,
    end: 1,
  });
  // Object.keys(events).forEach((k) => {
  //   console.log(k, events[k]);
  //   // assert.equal(callbacks[k], 0, `${k} count off by ${callbacks[k]}`);
  // });
});
