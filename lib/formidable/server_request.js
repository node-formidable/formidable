var sys = require('sys')
  , events = require('events');

var ServerRequest = exports.ServerRequest = function() {
  this.tmpDir = '/tmp';
  this.httpRequest = null;
  this.headers = null;
  this.bytesTotal = null;
  this.type = null;
  this.multipartBoundary = null;
  // this.buffer = null;
};
sys.inherits(ServerRequest, events.EventEmitter);

ServerRequest.prototype.fromNodeRequest = function(req) {
  this.httpRequest = req;

  var self = this;
  this.writeHeaders(req.headers);
  this.httpRequest
    .addListener('data', function(buffer) {
      self.write(buffer);
    })
    .addListener('end', function() {
      self.end();
    });
};

ServerRequest.prototype.writeHeaders = function(headers) {
  this.headers = headers;
  this.parseContentLength();
  this.parseContentType();
}

ServerRequest.prototype.parseContentLength = function() {
  if (this.headers['content-length']) {
    this.bytesTotal = parseInt(this.headers['content-length'], 10);
  }
};

ServerRequest.prototype.parseContentType = function() {
  if (!this.headers['content-type']) {
    return;
  }

  if (this.headers['content-type'].match(/urlencoded/i)) {
    this.type = 'urlencoded';
    return;
  }

  if (this.headers['content-type'].match(/multipart/i)) {
    this.type = 'multipart';

    var m;
    if (m = this.headers['content-type'].match(/boundary=([^;]+)/i)) {
      this.boundary = m[1];
    } else {
      this.boundary = null;
      this.emit('error', new Error('malformed request, no multipart boundary'));
      this.pause();
    }
    return;
  }
};

ServerRequest.prototype.write = function(buffer) {
  this.expected = [0, 33, 255, 42,  23];
  this.expectedBytes = 0;

  // this.buffer = this.buffer.concat(buffer);
  // while (this.buffer.indexOf('--AADNSJKAS') == -1) {
  //   
  // }
}