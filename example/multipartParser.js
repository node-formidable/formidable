const { MultipartParser } = require('../lib/multipart_parser.js');


const multipartParser = new MultipartParser();

// hand crafted multipart
const boundary = '--abcxyz';
const next = '\r\n';
const formData = 'Content-Disposition: form-data; ';
const buffer = Buffer.from(
    `${boundary}${next}${formData}name="text"${next}${next}text ...${next}${next}${boundary}${next}${formData}name="z"${next}${next}text inside z${next}${next}${boundary}${next}${formData}name="file1"; filename="a.txt"${next}Content-Type: text/plain${next}${next}Content of a.txt.${next}${next}${boundary}${next}${formData}name="file2"; filename="a.html"${next}Content-Type: text/html${next}${next}<!DOCTYPE html><title>Content of a.html.</title>${next}${next}${boundary}--`
);

const logAnalyzed = (buffer, start, end) => {
    if (buffer && start && end) {
        console.log(String(buffer.slice(start, end)))
    }
};

// multipartParser.onPartBegin
// multipartParser.onPartEnd

// multipartParser.on('partData', logAnalyzed) // non supported syntax
multipartParser.onPartData = logAnalyzed;
multipartParser.onHeaderField = logAnalyzed;
multipartParser.onHeaderValue = logAnalyzed;
multipartParser.initWithBoundary(boundary.substring(2));


const bytesParsed = multipartParser.write(buffer);
const error = multipartParser.end();

if (error) {
    console.error(error);
}
