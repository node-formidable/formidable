var sys = require('sys')
  , MultipartParser = require('./multipart_parser').MultipartParser
  , Utf8Decoder = require('utf8decoder').Utf8Decoder
  , events = require('events');

var IncomingForm = exports.IncomingForm = function() {
  events.EventEmitter.call(this);

  this.hadError = false;

  this.encoding = 'utf-8';
  this.headers = null;
  this.type = null;
  this.bytesTotal = null;
  this.bytesReceived = null;

  this._parser = null;
};
sys.inherits(IncomingForm, events.EventEmitter);

IncomingForm.prototype.parse = function(req, cb) {
  this.pause = function() {
    req.pause();
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
  return bytesParsed;
};

IncomingForm.prototype.pause = function() {
  // this does nothing, unless overwritten in IncomingForm.parse
  return false;
};

IncomingForm.prototype.onPart = function(part) {
  if (!part.filename) {
    var value = ''
      , decoder
      , self = this;

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
  }
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
  if (this.hadError) {
    return;
  }

  this.hadError = true;
  this.pause();
  this.emit('error', err);
};

IncomingForm.prototype._parseContentLength = function() {
  if (this.headers['content-length']) {
    this.bytesReceived = 0;
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
    self.emit('end');
  };

  this._parser = parser;
};

IncomingForm.prototype._initUrlencoded = function() {
  this.type = 'urlencoded';
};