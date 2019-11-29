var common = require('../test/common');
var http = require('http'),
    util = require('util'),
    os = require('os'),
    formidable = common.formidable,
    port = common.port,
    server;

server = http.createServer(function(req, res) {
  if (req.url === '/') {
    res.writeHead(200, {'content-type': 'text/html'});
    res.end(
      `<form action="/upload" enctype="multipart/form-data" method="post">
        <label>simple<input type="text" name="simple"></label><br>

        <label>array text 0<input type="text" name="atext[]"></label><br>
        <label>array text 1<input type="text" name="atext[]"></label><br>

        <label>file simple<input type="file" name="filesimple"></label><br>

        <label>file attribute multiple<input type="file" name="multiplefile" multiple></label><br>

        <label>file html array0<input type="file" name="filearray[]"></label><br>
        <label>file html array1<input type="file" name="filearray[]"></label><br>

        <label>file html array and mulitple0<input type="file" name="mfilearray[]" multiple></label><br>
        <label>file html array and mulitple1<input type="file" name="mfilearray[]" multiple></label><br>
        <br>
        <button>Upload</button>
      </form>`
    );
  } else if (req.url === '/upload') {
    var form = new formidable.IncomingForm({multiples: true});

    form.uploadDir = os.tmpdir();

    form.parse(req, function (error, fields, files) {
      res.writeHead(200, {'content-type': 'text/plain'});
      res.write('received fields:\n\n '+util.inspect(fields));
    })
  } else {
    res.writeHead(404, {'content-type': 'text/plain'});
    res.end('404');
  }
});
server.listen(port);

console.log('listening on http://localhost:'+port+'/');
