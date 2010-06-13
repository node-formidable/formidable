require('../test/common');
var http = require('http')
  , sys = require('sys')
  , formidable = require('formidable')
  , server;

server = http.createServer(function(req, res) {
  if (req.url == '/') {
    res.writeHead(200, {'content-type': 'text/html'});
    res.end
      ( '<form action="/post" method="post">'
      + '<input type="text" name="title"><br>'
      + '<input type="text" name="data[foo][]"><br>'
      + '<input type="submit" value="Submit">'
      + '</form>'
      )
  } else if (req.url == '/post') {
    var form = new formidable.IncomingForm()
      , fields = [];

    form
      .addListener('error', function(err) {
        res.writeHead(200, {'content-type': 'text/plain'});
        res.end('error:\n\n'+sys.inspect(err));
      })
      .addListener('field', function(field, value) {
        p([field, value]);
        fields.push([field, value]);
      })
      .addListener('end', function() {
        puts('-> post done');
        res.writeHead(200, {'content-type': 'text/plain'});
        res.end('received fields:\n\n '+sys.inspect(fields));
      });
    form.parse(req);
  } else {
    res.writeHead(404, {'content-type': 'text/plain'});
    res.end('404');
  }
});
server.listen(TEST_PORT);

sys.puts('listening on http://localhost:'+TEST_PORT+'/');