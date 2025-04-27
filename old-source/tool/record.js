/* eslint-disable no-param-reassign */
const http = require('http');
const fs = require('fs');

let connections = 0;

const server = http.createServer((req, res) => {
  const { socket } = req;
  console.log('Request: %s %s -> %s', req.method, req.url, socket.filename);

  req.on('end', () => {
    if (req.url !== '/') {
      res.end(
        JSON.stringify({
          method: req.method,
          url: req.url,
          filename: socket.filename,
        }),
      );
      return;
    }

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(
      '<form action="/upload" enctype="multipart/form-data" method="post">' +
        '<input type="text" name="title"><br>' +
        '<input type="file" name="upload" multiple="multiple"><br>' +
        '<input type="submit" value="Upload">' +
        '</form>',
    );
  });
});

server.on('connection', (socket) => {
  connections += 1;

  socket.id = connections;
  socket.filename = `connection-${socket.id}.http`;
  socket.file = fs.createWriteStream(socket.filename);
  socket.pipe(socket.file);

  console.log('--> %s', socket.filename);
  socket.on('close', () => {
    console.log('<-- %s', socket.filename);
  });
});

const port = process.env.PORT || 8080;
server.listen(port, () => {
  console.log('Recording connections on port %s', port);
});
