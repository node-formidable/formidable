var sys = require('sys')
  , fs = require('fs')
  , path = require('path')
  , MultipartParser = require('./multipart_parser').MultipartParser
  , Utf8Decoder = require('utf8decoder').Utf8Decoder
  , events = require('events');

var IncomingForm = exports.IncomingForm = function() {
  events.EventEmitter.call(this);

  this.error = null;
  this.ended = false;

  this.uploadDir = '/tmp';
  this.encoding = 'utf-8';
  this.headers = null;
  this.type = null;
  this.bytesTotal = null;
  this.bytesExpected = null;

  this._parser = null;
  this._flushing = 0;
};
sys.inherits(IncomingForm, events.EventEmitter);

IncomingForm.prototype.parse = function(req, cb) {
  this.pause = function() {
    req.pause();
    return true;
  };

  this.resume = function() {
    req.resume();
    return true;
  };

  this.writeHeaders(req.headers);

  var self = this;
  req
    .addListener('error', function(err) {
      self._error(err);
    })
    .addListener('data', function(buffer) {
      self.write(buffer);
    });

  if (cb) {
    var fields = {}, files = {};
    this
      .addListener('field', function(name, value) {
        fields[name] = value;
      })
      .addListener('file', function(name, file) {
        files[name] = file;
      })
      .addListener('error', function(err) {
        cb(err, fields, files);
      })
      .addListener('end', function() {
        cb(null, fields, files);
      });
  }

  return this;
};

IncomingForm.prototype.writeHeaders = function(headers) {
  this.headers = headers;
  this._parseContentLength();
  this._parseContentType();
};

IncomingForm.prototype.write = function(buffer) {
  if (!this._parser) {
    this._error(new Error('unintialized parser'));
    return;
  }

  var bytesParsed = this._parser.write(buffer);
  if (bytesParsed !== buffer.length) {
    this._error(new Error('parser error, '+bytesParsed+' of '+buffer.length+' bytes parsed'));
  }

  this.bytesExpected += bytesParsed;

  return bytesParsed;
};

IncomingForm.prototype.pause = function() {
  // this does nothing, unless overwritten in IncomingForm.parse
  return false;
};

IncomingForm.prototype.resume = function() {
  // this does nothing, unless overwritten in IncomingForm.parse
  return false;
};


IncomingForm.prototype.onPart = function(part) {
  var self = this;

  if (!part.filename) {
    var value = ''
      , decoder;

    if (this.encoding.toLowerCase() == 'utf-8') {
      decoder = new Utf8Decoder();
      decoder.onString = function(str) {
        value += str;
      };
    }

    part.addListener('data', function(buffer) {
      if (decoder) {
        decoder.write(buffer);
      } else {
        value += buffer.toString(self.encoding);
      }
    });

    part.addListener('end', function() {
      if (value) {
        self.emit('field', part.name, value);
      }
    });
    return;
  }

  this._flushing++;

  var file = this._writeStream(this._uploadPath());
  part.addListener('data', function(buffer) {
    self.pause();
    file.write(buffer, function() {
      self.resume();
    });
  });

  part.addListener('end', function() {
    file.end(function() {
      self._flushing--;
      self.emit
        ( 'file'
        , part.name
        , { path: file.path
          , filename: part.filename
          , mime: part.mime
          }
        );
      self._maybeEnd();
    });
  });
};

IncomingForm.prototype._parseContentType = function() {
  if (!this.headers['content-type']) {
    this._error(new Error('bad content-type header, no content-type'));
    return;
  }

  if (this.headers['content-type'].match(/urlencoded/i)) {
    this.type = 'urlencoded';
    return;
  }

  if (this.headers['content-type'].match(/multipart/i)) {
    var m;
    if (m = this.headers['content-type'].match(/boundary=([^;]+)/i)) {
      this._initMultipart(m[1]);
    } else {
      this._error(new Error('bad content-type header, no multipart boundary'));
    }
    return;
  }

  this._error(new Error('bad content-type header, unknown content-type: '+this.headers['content-type']));
};

IncomingForm.prototype._error = function(err) {
  if (this.error) {
    return;
  }

  this.error = err;
  this.pause();
  this.emit('error', err);
};

IncomingForm.prototype._parseContentLength = function() {
  if (this.headers['content-length']) {
    this.bytesExpected = 0;
    this.bytesTotal = parseInt(this.headers['content-length'], 10);
  }
};

IncomingForm.prototype._newParser = function() {
  return new MultipartParser();
};

IncomingForm.prototype._initMultipart = function(boundary) {
  this.type = 'multipart';

  var parser = this._newParser()
    , self = this
    , headerField = ''
    , headerValue = ''
    , part
    , addHeader = function() {
        headerField = headerField.toLowerCase();
        part.headers[headerField] = headerValue;

        var m;
        if (headerField == 'content-disposition') {
          if (m = headerValue.match(/name="([^"]+)"/i)) {
            part.name = m[1];
          }

          if (m = headerValue.match(/filename="([^"]+)"/i)) {
            part.filename = m[1];
          }
        } else if (headerField == 'content-type') {
          part.mime = headerValue;
        }

        headerField = '';
        headerValue = '';
      };

  parser.initWithBoundary(boundary);

  parser.onPartBegin = function() {
    part = new events.EventEmitter();
    part.headers = {};
    part.name = null;
    part.filename = null;
    part.mime = null;
  };

  parser.onHeaderField = function(b, start, end) {
    if (headerValue) {
      addHeader();
    }
    headerField += b.toString(self.encoding, start, end);
  };

  parser.onHeaderValue = function(b, start, end) {
    headerValue += b.toString(self.encoding, start, end);
  };

  parser.onPartData = function(b, start, end) {
    if (headerValue) {
      addHeader();
      self.onPart(part);
    }

    part.emit('data', b.slice(start, end));
  };

  parser.onPartEnd = function() {
    part.emit('end');
  };

  parser.onEnd = function() {
    self.ended = true;
    self._maybeEnd();
  };

  this._parser = parser;
};

IncomingForm.prototype._initUrlencoded = function() {
  this.type = 'urlencoded';
};

IncomingForm.prototype._uploadPath = function() {
  var name = '';
  for (i = 0; i < 32; i++) {
    name += Math.floor(Math.random() * 16).toString(16);
  }

  return path.join(this.uploadDir, name);
};

IncomingForm.prototype._writeStream = function(path) {
  return new fs.WriteStream(path);
};

IncomingForm.prototype._maybeEnd = function() {
  if (!this.ended || this._flushing) {
    return;
  }

  this.emit('end');
};