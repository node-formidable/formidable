var http = require('http')
  , sys = require('sys');

http.createServer(function(req, res) {
  sys.p(req.headers);
  req.addListener('data', function(chunk) {
    sys.print(chunk);
  });
}).listen(8001);