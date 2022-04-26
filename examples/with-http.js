import http from 'node:http';
import formidable from '../src/index.js';


const server = http.createServer((req, res) => {
  // handle common internet errors
  // to avoid server crash
  req.on('error', console.error);
  res.on('error', console.error);


  if (req.url === '/api/upload' && req.method.toLowerCase() === 'post') {
    // parse a file upload
    const form = formidable({
      defaultInvalidName: 'invalid',
      uploadDir: `uploads`,
      keepExtensions: true,
      createDirsFromUploads: true,
      allowEmptyFiles: true,
      minFileSize: 0,
      filename(name, ext, part, form) {
        // todo use only valid chars and check length
        // originalFilename will have slashes with relative path if a
        // directory was uploaded
        return part.originalFilename;
      },
      filter: function ({name, originalFilename, mimetype}) {
        return Boolean(originalFilename);
        // keep only images
        // return mimetype?.includes("image");
      }
      // maxTotalFileSize: 4000,
      // maxFileSize: 1000,

    });

    form.parse(req, (err, fields, files) => {
      if (err) {
        console.error(err);
        res.writeHead(err.httpCode || 400, { 'Content-Type': 'text/plain' });
        res.end(String(err));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ fields, files }, null, 2));
    });

    return;
  }

  // else show a file upload form
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(`
    <h2>With Node.js <code>"http"</code> module</h2>
    <form action="/api/upload" enctype="multipart/form-data" method="post">
      <div>Text field title: <input type="text" name="title" /></div>
      <div>File: <input type="file" name="multipleFiles" multiple /></div>
      <div>Folders: <input type="file" name="folders" webkitdirectory directory multiple /></div>
      <input type="submit" value="Upload" />
    </form>

    <form action="/api/upload" enctype="multipart/form-data" method="post">
      <div>Text field title: <input type="text" name="title" /></div>
      <div>Text field with same name: <input type="text" name="title" /></div>
      <div>Other field <input type="text" name="other" /></div>
      <input type="submit" value="submit simple" />
    </form>
  `);
});

server.listen(3000, () => {
  console.log('Server listening on http://localhost:3000 ...');
});
