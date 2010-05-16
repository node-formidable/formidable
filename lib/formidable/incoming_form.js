var sys = require('sys')
  , MultipartParser = require('./multipart_parser').MultipartParser
  , events = require('events');

var IncomingForm = exports.IncomingForm = function() {
  events.EventEmitter.call(this);

  this.headers = null;
  this.type = null;
  this.bytesTotal = null;
  this.bytesReceived = null;
};
sys.inherits(IncomingForm, events.EventEmitter);

IncomingForm.prototype.parse = function(req, cb) {
  this.writeHeaders(req.headers);

  var self = this;
  req
    .addListener('error', function(err) {
      self.pause();
      self.emit('error', err);
    })
    .addListener('data', function(buffer) {
      self.write(buffer);
    });

  this.pause = function() {
    req.pause();
    return true;
  };

  return this;
};

IncomingForm.prototype.writeHeaders = function(headers) {
  this.headers = headers;
  this._parseContentLength();
  this._parseContentType();
};

IncomingForm.prototype.pause = function() {
  // this does nothing, unless overwritten in IncomingForm.parse
  return false;
};

IncomingForm.prototype._parseContentType = function() {
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
      this.pause();
      this.emit('error', new Error('bad content-type header, no multipart boundary'));
    }
    return;
  }
};

IncomingForm.prototype._parseContentLength = function() {
  if (this.headers['content-length']) {
    this.bytesReceived = 0;
    this.bytesTotal = parseInt(this.headers['content-length'], 10);
  }
};