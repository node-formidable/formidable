let assert = require('assert');
require('../test/common');
let multipartParser = require('../lib/multipart_parser');
    var MultipartParser = multipartParser.MultipartParser;
    var parser = new MultipartParser();
    var boundary = '-----------------------------168072824752491622650073';
    var mb = 100;
    var buffer = createMultipartBuffer(boundary, mb * 1024 * 1024);
    var callbacks =
    partBegin: -1,
    partEnd: -1,
    headerField: -1,
    headerValue: -1,
    partData: -1,
    end: -1,
  };

parser.initWithBoundary(boundary);
parser.onHeaderField = function() {
  callbacks.headerField++;
};

parser.onHeaderValue = function() {
  callbacks.headerValue++;
};

parser.onPartBegin = function() {
  callbacks.partBegin++;
};

parser.onPartData = function() {
  callbacks.partData++;
};

parser.onPartEnd = function() {
  callbacks.partEnd++;
};

parser.onEnd = function() {
  callbacks.end++;
};

let start = +new Date();
    var nparsed = parser.write(buffer);
    var duration = +new Date() - start;
    var mbPerSec = (mb / (duration / 1000)).toFixed(2);

console.log(`${mbPerSec} mb/sec`);

assert.equal(nparsed, buffer.length);

function createMultipartBuffer(boundary, size) {
  let head =
      '--' +
      boundary +
      '\r\n' +
      'content-disposition: form-data; name="field1"\r\n' +
      '\r\n',
    tail = '\r\n--' + boundary + '--\r\n',
    buffer = Buffer.alloc(size);

  buffer.write(head, 0, 'ascii');
  buffer.write(tail, buffer.length - tail.length, 'ascii');
  return buffer;
}

process.on('exit', function() {
  for (let k in callbacks) {
    assert.equal(0, callbacks[k], `${k} count off by ${callbacks[k]}`);
  }
});
