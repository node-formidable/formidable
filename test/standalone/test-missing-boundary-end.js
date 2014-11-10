var superagent = require('superagent')
  , assert = require('assert')
  , multiparty = require('../../')
  , http = require('http')

var server = http.createServer(function(req, resp) {
  var form = new multiparty.Form();

  var errCount = 0;
  form.on('error', function (err) {
    assert.ok(err);
    assert.equal(err.message, 'stream ended unexpectedly');
    assert.equal(err.status, 400);
    errCount += 1;
    resp.end();
  });
  form.on('part', function (part) {
    part.resume();
  });
  form.on('close', function () {
    assert.equal(errCount, 1);
  })

  form.parse(req);
});
server.listen(function() {
  var url = 'http://localhost:' + server.address().port + '/'
  var req = superagent.post(url)
  req.set('Content-Type', 'multipart/form-data; boundary=--WebKitFormBoundaryE19zNvXGzXaLvS5C')
  req.write('----WebKitFormBoundaryE19zNvXGzXaLvS5C\r\n');
  req.write('Content-Disposition: form-data; name="a[b]"\r\n');
  req.write('\r\n');
  req.write('3\r\n');
  req.write('----WebKitFormBoundaryE19zNvXGzXaLvS5C\r\n');
  req.write('Content-Disposition: form-data; name="a[c]"\r\n');
  req.write('\r\n');
  req.write('4\r\n');
  req.write('----WebKitFormBoundaryE19zNvXGzXaLvS5C\r\n');
  req.write('Content-Disposition: form-data; name="file"; filename="test.txt"\r\n');
  req.write('Content-Type: plain/text\r\n');
  req.write('\r\n');
  req.write('and\r\n');
  req.write('----WebKitFormBoundaryE19zNvXGzXaLvS5C\r\n');
  req.end(function(err, resp) {
    server.close();
  });
});
