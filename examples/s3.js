if (!process.env.S3_BUCKET || !process.env.S3_KEY || !process.env.S3_SECRET) {
  console.log("To run this example, do this:");
  console.log("npm install aws-sdk");
  console.log('S3_BUCKET="(your s3 bucket)" S3_KEY="(your s3 key)" S3_SECRET="(your s3 secret) node examples/s3.js"');
  process.exit(1);
}

var http = require('http');
var util = require('util');
var multiparty = require('../');
var AWS = require('aws-sdk');
var PORT = process.env.PORT || 27372;

var bucket = process.env.S3_BUCKET;
var s3Client = new AWS.S3({
  accessKeyId: process.env.S3_KEY,
  secretAccessKey: process.env.S3_SECRET,
  // See: http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Config.html#constructor-property
});

var server = http.createServer(function(req, res) {
  if (req.url === '/') {
    res.writeHead(200, {'content-type': 'text/html'});
    res.end(
      '<form action="/upload" enctype="multipart/form-data" method="post">'+
      '<input type="text" name="path" placeholder="s3 key here"><br>'+
      '<input type="file" name="upload"><br>'+
      '<input type="submit" value="Upload">'+
      '</form>'
    );
  } else if (req.url === '/upload') {
    var form = new multiparty.Form();
    var destPath;
    form.on('field', function(name, value) {
      if (name === 'path') {
        destPath = value;
      }
    });
    form.on('part', function(part) {
      s3Client.putObject({
        Bucket: bucket,
        Key: destPath,
        ACL: 'public-read',
        Body: part,
        ContentLength: part.byteCount,
      }, function(err, data) {
        if (err) throw err;
        console.log("done", data);
        res.end("OK");
        console.log("https://s3.amazonaws.com/" + bucket + '/' + destPath);
      });
    });
    form.parse(req);
    
  } else {
    res.writeHead(404, {'content-type': 'text/plain'});
    res.end('404');
  }

  function onEnd() {
    throw new Error("no uploaded file");
  }
});
server.listen(PORT, function() {
  console.info('listening on http://0.0.0.0:'+PORT+'/');
});
