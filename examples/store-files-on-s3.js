// To test this example you have to install aws-sdk nodejs package and create a bucket named "demo-bucket"

import http from 'http';
import { PassThrough } from 'stream';
import AWS from 'aws-sdk';
import formidable from '../src/index.js';


const s3Client = new AWS.S3({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_KEY,
  },
});

const uploadStream = (file) => {
  const pass = new PassThrough();
  s3Client.upload(
    {
      Bucket: 'demo-bucket',
      Key: file.newFilename,
      Body: pass,
    },
    (err, data) => {
      console.log(err, data);
    },
  );

  return pass;
};

const server = http.createServer((req, res) => {
  if (req.url === '/api/upload' && req.method.toLowerCase() === 'post') {
    // parse a file upload
    const form = formidable({
      fileWriteStreamHandler: uploadStream,
    });

    form.parse(req, () => {
      res.writeHead(200);
      res.end();
    });

    return;
  }

  // show a file upload form
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(`
    <h2>With Node.js <code>"http"</code> module</h2>
    <form action="/api/upload" enctype="multipart/form-data" method="post">
      <div>Text field title: <input type="text" name="title" /></div>
      <div>File: <input type="file" name="file"/></div>
      <input type="submit" value="Upload" />
    </form>
  `);
});

server.listen(3000, () => {
  console.log('Server listening on http://localhost:3000 ...');
});
