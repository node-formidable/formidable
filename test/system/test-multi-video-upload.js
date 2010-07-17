require('../common');
var BOUNDARY = '---------------------------10102754414578508781458777923'
  , FIXTURE = TEST_FIXTURES+'/multi_video.upload'
  , fs = require('fs')
  , sys = require('sys')
  , http = require('http')
  , formidable = require('formidable')
  , server = http.createServer();

server.addListener('request', function(req, res) {
  var form = new formidable.IncomingForm()
    , files = {};

  form.uploadDir = TEST_TMP;
  form.parse(req);

  form
    .addListener('field', function(field, value) {
      assert.equal(field, 'title');
      assert.equal(value, '');
    })
    .addListener('file', function(field, file) {
      assert.equal(field, 'upload');
      files[file.filename] = true;
    })
    .addListener('end', function() {
      assert.deepEqual
        ( files
        , { 'shortest_video.flv': true
          , 'shortest_video.mp4' :true
          }
        );
      server.close();
      res.writeHead(200);
      res.end('good');
    });
});

server.listen(TEST_PORT, function() {
  var client = http.createClient(TEST_PORT)
    , headers = {'content-type': 'multipart/form-data; boundary='+BOUNDARY}
    , request = client.request('POST', '/', headers)
    , fixture = new fs.ReadStream(FIXTURE);

  fixture
    .addListener('data', function(b) {;
      request.write(b);
    })
    .addListener('end', function() {
      request.end();
    });
});