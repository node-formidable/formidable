import { MultipartParser } from '../src/index.js';


// hand crafted multipart
const boundary = '--abcxyz';
const next = '\r\n';
const formData = 'Content-Disposition: form-data; ';
const bufferToWrite = Buffer.from(
  `${boundary}${next}${formData}name="text"${next}${next}some text ...${next}${next}${boundary}${next}${formData}name="z"${next}${next}text inside z${next}${next}${boundary}${next}${formData}name="file1"; filename="a.txt"${next}Content-Type: text/plain${next}${next}Content of a.txt.${next}${next}${boundary}${next}${formData}name="file2"; filename="a.html"${next}Content-Type: text/html${next}${next}<!DOCTYPE html><title>Content of a.html.</title>${next}${next}${boundary}--`,
);

const multipartParser = new MultipartParser();
multipartParser.on('data', ({ name, buffer, start, end }) => {
  console.log(`${name}:`);
  if (buffer && start && end) {
    console.log(String(buffer.slice(start, end)));
  }
  console.log();
});
multipartParser.on('error', (error) => {
  console.error(error);
});

multipartParser.initWithBoundary(boundary.substring(2)); // todo make better error message when it is forgotten
// const shouldWait = !multipartParser.write(buffer);
multipartParser.write(bufferToWrite);
multipartParser.end();
// multipartParser.destroy();
