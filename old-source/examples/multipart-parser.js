import { Blob } from 'node:buffer';
import { Readable } from 'node:stream';
import { FormData, formDataToBlob } from 'formdata-polyfill/esm.min.js'
import { MultipartParser } from '../src/index.js';

const blob1 = new Blob(
  ['Content of a.txt.'],
  { type: 'text/plain' }
);

const blob2 = new Blob(
  ['<!DOCTYPE html><title>Content of a.html.</title>'],
  { type: 'text/html' }
);

const fd = new FormData();
fd.set('text', 'some text ...');
fd.set('z', 'text inside z');
fd.set('file1', blob1, 'a.txt');
fd.set('file2', blob2, 'a.html');

const multipartParser = new MultipartParser();
multipartParser.on('data', ({ name, buffer, start, end }) => {
  console.log(`${name}:`);
  if (buffer && start && end) {
    console.log(String(buffer.slice(start, end)));
  }
  console.log();
});
multipartParser.on('error', console.error);

const blob = formDataToBlob(fd);
const boundary = blob.type.split('boundary=')[1];

multipartParser.initWithBoundary(boundary);

Readable.from(blob.stream()).pipe(multipartParser);
