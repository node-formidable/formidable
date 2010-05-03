var http = require('http')
  , sys = require('sys');

http.createServer(function(req, res) {
  req.addListener('data', function(buffer) {
    sys.p(Object.keys(buffer.constructor.prototype));
  });
}).listen(8001);