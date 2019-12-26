if (global.GENTLY) require = GENTLY.hijack(require);

var crypto = require('crypto');
var fs = require('fs');
var util = require('util'),
    path = require('path'),
    File = require('./file'),
    defaultOptions = require('./default_options').defaultOptions,
    DummyParser = require('./dummy_parser').DummyParser,
    MultipartParser = require('./multipart_parser').MultipartParser,
    QuerystringParser = require('./querystring_parser').QuerystringParser,
    OctetParser       = require('./octet_parser').OctetParser,
    JSONParser = require('./json_parser').JSONParser,
    StringDecoder = require('string_decoder').StringDecoder,
    EventEmitter = require('events').EventEmitter,
    Stream = require('stream').Stream,
    os = require('os');

function hasOwnProp(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function IncomingForm(options = {}) {
  if (!(this instanceof IncomingForm)) return new IncomingForm(options);
  EventEmitter.call(this);

  this.error = null;
  this.ended = false;

  Object.assign(this, defaultOptions, options);
  this.uploadDir = this.uploadDir || os.tmpdir();

  this.headers = null;
  this.type = null;

  this.bytesReceived = null;
  this.bytesExpected = null;

  this._parser = null;
  this._flushing = 0;
  this._fieldsSize = 0;
  this._fileSize = 0;
  this.openedFiles = [];

  return this;
}
util.inherits(IncomingForm, EventEmitter);
exports.IncomingForm = IncomingForm;

IncomingForm.prototype.parse = function(req, cb) {
  this.pause = function() {
    try {
      req.pause();
    } catch (err) {
      // the stream was destroyed
      if (!this.ended) {
        // before it was completed, crash & burn
        this._error(err);
      }
      return false;
    }
    return true;
  };

  this.resume = function() {
    try {
      req.resume();
    } catch (err) {
      // the stream was destroyed
      if (!this.ended) {
        // before it was completed, crash & burn
        this._error(err);
      }
      return false;
    }

    return true;
  };

  // Setup callback first, so we don't miss anything from data events emitted
  // immediately.
  if (cb) {
    var fields = {}, files = {};
    this
      .on('field', function(name, value) {
        if (this.multiples && name.slice(-2) === '[]') {
          var realName = name.slice(0, name.length - 2);
          if (hasOwnProp(fields, realName)) {
            if (!Array.isArray(fields[realName])) {
              fields[realName] = [fields[realName]];
            }
          } else {
            fields[realName] = [];
          }
          fields[realName].push(value);
        } else {
          fields[name] = value;
        }
      })
      .on('file', function(name, file) {
        if (this.multiples) {
          if (hasOwnProp(files, name)) {
            if (!Array.isArray(files[name])) {
              files[name] = [files[name]];
            }
            files[name].push(file);
          } else {
            files[name] = file;
          }
        } else {
          files[name] = file;
        }
      })
      .on('error', function(err) {
        cb(err, fields, files);
      })
      .on('end', function() {
        cb(null, fields, files);
      });
  }

  // Parse headers and setup the parser, ready to start listening for data.
  this.writeHeaders(req.headers);

  // Start listening for data.
  req
    .on('error', (err) => {
      this._error(err);
    })
    .on('aborted', () => {
      this.emit('aborted');
      this._error(new Error('Request aborted'));
    })
    .on('data', (buffer) => {
      try {
        this.write(buffer);
      } catch (err) {
        this._error(err);
      }
    })
    .on('end', () => {
      if (this.error) {
        return;
      }

      this._parser.end();
    });

  
  return this;
};

IncomingForm.prototype.writeHeaders = function(headers) {
  this.headers = headers;
  this._parseContentLength();
  this._parseContentType();
  this._parser.once('error', (error) => {
    this._error(error);
  });
};

IncomingForm.prototype.write = function(buffer) {
  if (this.error) {
    return;
  }
  if (!this._parser) {
    this._error(new Error('uninitialized parser'));
    return;
  }

  this.bytesReceived += buffer.length;
  this.emit('progress', this.bytesReceived, this.bytesExpected);

  this._parser.write(buffer);

  return bytesReceived;
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
  // this method can be overwritten by the user
  this.handlePart(part);
};

IncomingForm.prototype.handlePart = function(part) {
  // This MUST check exactly for undefined. You can not change it to !part.filename.
  if (part.filename === undefined) {
    var value = ''
      , decoder = new StringDecoder(this.encoding);

    part.on('data', (buffer) => {
      this._fieldsSize += buffer.length;
      if (this._fieldsSize > this.maxFieldsSize) {
        this._error(new Error(`maxFieldsSize exceeded, received ${this._fieldsSize} bytes of field data`));
        return;
      }
      value += decoder.write(buffer);
    });

    part.on('end', () => {
      this.emit('field', part.name, value);
    });
    return;
  }

  this._flushing++;

  var file = new File({
    path: this._uploadPath(part.filename),
    name: part.filename,
    type: part.mime,
    hash: this.hash
  });

  this.emit('fileBegin', part.name, file);

  file.open();
  this.openedFiles.push(file);

  part.on('data', (buffer) => {
    this._fileSize += buffer.length;
    if (this._fileSize > this.maxFileSize) {
      this._error(new Error(`maxFileSize exceeded, received ${this._fileSize} bytes of file data`));
      return;
    }
    if (buffer.length == 0) {
      return;
    }
    this.pause();
    file.write(buffer, () => {
      this.resume();
    });
  });

  part.on('end', () => {
    file.end(() => {
      this._flushing--;
      this.emit('file', part.name, file);
      this._maybeEnd();
    });
  });
};


IncomingForm.prototype._parseContentType = function() {
  if (this.bytesExpected === 0) {
    this._parser = new DummyParser(this);
    return;
  }

  if (!this.headers['content-type']) {
    this._error(new Error('bad content-type header, no content-type'));
    return;
  }

  if (this.headers['content-type'].match(/octet-stream/i)) {
    this._initOctetStream();
    return;
  }

  if (this.headers['content-type'].match(/urlencoded/i)) {
    this._initUrlencoded();
    return;
  }

  if (this.headers['content-type'].match(/multipart/i)) {
    var m = this.headers['content-type'].match(/boundary=(?:"([^"]+)"|([^;]+))/i);
    if (m) {
      this._initMultipart(m[1] || m[2]);
    } else {
      this._error(new Error('bad content-type header, no multipart boundary'));
    }
    return;
  }

  if (this.headers['content-type'].match(/json/i)) {
    this._initJSONencoded();
    return;
  }

  this._error(new Error(`bad content-type header, unknown content-type: ${this.headers['content-type']}`));
};

IncomingForm.prototype._error = function(err) {
  if (this.error || this.ended) {
    return;
  }

  this.error = err;
  this.emit('error', err);

  if (Array.isArray(this.openedFiles)) {
    this.openedFiles.forEach(function(file) {
      file._writeStream.destroy();
      setTimeout(fs.unlink, 0, file.path, function(error) { });
    });
  }
};

IncomingForm.prototype._parseContentLength = function() {
  this.bytesReceived = 0;
  if (this.headers['content-length']) {
    this.bytesExpected = parseInt(this.headers['content-length'], 10);
  } else if (this.headers['transfer-encoding'] === undefined) {
    this.bytesExpected = 0;
  }

  if (this.bytesExpected !== null) {
    this.emit('progress', this.bytesReceived, this.bytesExpected);
  }
};

IncomingForm.prototype._newParser = function() {
  return new MultipartParser();
};

IncomingForm.prototype._initMultipart = function(boundary) {
  this.type = 'multipart';

  var parser = new MultipartParser(),
      headerField,
      headerValue,
      part;

  parser.initWithBoundary(boundary);

  parser.on('data', ({name, buffer, start, end}) => {
    if (name === 'partBegin') {
        part = new Stream();
        part.readable = true;
        part.headers = {};
        part.name = null;
        part.filename = null;
        part.mime = null;

        part.transferEncoding = 'binary';
        part.transferBuffer = '';

        headerField = '';
        headerValue = '';
    } else if (name === 'headerField') {
        headerField += buffer.toString(this.encoding, start, end);
    } else if (name === 'headerValue') {
        headerValue += buffer.toString(this.encoding, start, end);
    } else if (name === 'headerEnd') {
        headerField = headerField.toLowerCase();
        part.headers[headerField] = headerValue;

        // matches either a quoted-string or a token (RFC 2616 section 19.5.1)
        var m = headerValue.match(/\bname=("([^"]*)"|([^\(\)<>@,;:\\"\/\[\]\?=\{\}\s\t/]+))/i);
        if (headerField == 'content-disposition') {
            if (m) {
                part.name = m[2] || m[3] || '';
            }

            part.filename = this._fileName(headerValue);
        } else if (headerField == 'content-type') {
            part.mime = headerValue;
        } else if (headerField == 'content-transfer-encoding') {
            part.transferEncoding = headerValue.toLowerCase();
        }

        headerField = '';
        headerValue = '';
    } else if (name === 'headersEnd') {

        switch(part.transferEncoding){
            case 'binary':
            case '7bit':
            case '8bit': {
                const dataPropagation = ({name, buffer, start, end}) => {
                    if (name === 'partData') {
                        part.emit('data', buffer.slice(start, end));
                    }
                };
                const dataStopPropagation = ({name}) => {
                    if (name === 'partEnd') {
                        part.emit('end');
                        parser.off('data', dataPropagation);
                        parser.off('data', dataStopPropagation);
                    }
                };
                parser.on('data', dataPropagation);
                parser.on('data', dataStopPropagation);
                break;
            } case 'base64': {
            const dataPropagation = ({name, buffer, start, end}) => {
                if (name === 'partData') {
                    part.transferBuffer += buffer.slice(start, end).toString('ascii');

                    /*
                    four bytes (chars) in base64 converts to three bytes in binary
                    encoding. So we should always work with a number of bytes that
                    can be divided by 4, it will result in a number of buytes that
                    can be divided vy 3.
                    */
                    var offset = parseInt(part.transferBuffer.length / 4, 10) * 4;
                    part.emit('data', Buffer.from(part.transferBuffer.substring(0, offset), 'base64'));
                    part.transferBuffer = part.transferBuffer.substring(offset);
                }
            };
            const dataStopPropagation = ({name}) => {
                if (name === 'partEnd') {
                    part.emit('data', Buffer.from(part.transferBuffer, 'base64'));
                    part.emit('end');
                    parser.off('data', dataPropagation);
                    parser.off('data', dataStopPropagation);
                }
            };
            parser.on('data', dataPropagation);
            parser.on('data', dataStopPropagation);
            break;

        } default:
                return this._error(new Error('unknown transfer-encoding'));
        }

        this.onPart(part);
    } else if (name === 'end') {
        this.ended = true;
        this._maybeEnd();
    }
  });

  this._parser = parser;
};

IncomingForm.prototype._fileName = function(headerValue) {
  // matches either a quoted-string or a token (RFC 2616 section 19.5.1)
  var m = headerValue.match(/\bfilename=("(.*?)"|([^\(\)<>@,;:\\"\/\[\]\?=\{\}\s\t/]+))($|;\s)/i);
  if (!m) return;

  var match = m[2] || m[3] || '';
  var filename = match.substr(match.lastIndexOf('\\') + 1);
  filename = filename.replace(/%22/g, '"');
  filename = filename.replace(/&#([\d]{4});/g, function(m, code) {
    return String.fromCharCode(code);
  });
  return filename;
};

IncomingForm.prototype._initUrlencoded = function() {
  this.type = 'urlencoded';

  var parser = new QuerystringParser(this.maxFields);

  parser.on('data', ({key, value}) => {
    this.emit('field', key, value);
  });

  parser.onEnd = () => {
    this.ended = true;
    this._maybeEnd();
  };

  this._parser = parser;
};

IncomingForm.prototype._initOctetStream = function() {
  this.type = 'octet-stream';
  var filename = this.headers['x-file-name'];
  var mime = this.headers['content-type'];

  var file = new File({
    path: this._uploadPath(filename),
    name: filename,
    type: mime
  });

  this.emit('fileBegin', filename, file);
  file.open();
  this.openedFiles.push(file);
  this._flushing++;

  this._parser = new OctetParser();

  //Keep track of writes that haven't finished so we don't emit the file before it's done being written
  var outstandingWrites = 0;

  this._parser.on('data', (buffer) => {
    this.pause();
    outstandingWrites++;

    file.write(buffer, () => {
      outstandingWrites--;
      this.resume();

      if(this.ended){
        this._parser.emit('doneWritingFile');
      }
    });
  });

  this._parser.on('end', () => {
    this._flushing--;
    this.ended = true;

    var done = () => {
      file.end(() => {
        this.emit('file', 'file', file);
        this._maybeEnd();
      });
    };

    if(outstandingWrites === 0){
      done();
    } else {
      this._parser.once('doneWritingFile', done);
    }
  });
};

IncomingForm.prototype._initJSONencoded = function() {
  this.type = 'json';

  var parser = new JSONParser();

  parser.on('data', ({ key, value }) => {
    this.emit('field', key, value);
  });
  // parser.on('data', (key) => {
  //   this.emit('field', key);
  // });

  parser.once('end', () => {
    this.ended = true;
    this._maybeEnd();
  });

  this._parser = parser;
};

IncomingForm.prototype._uploadPath = function(filename) {
  var buf = crypto.randomBytes(16);
  var name = `upload_${buf.toString('hex')}`;

  if (this.keepExtensions) {
    var ext = path.extname(filename);
    ext     = ext.replace(/(\.[a-z0-9]+).*/i, '$1');

    name += ext;
  }

  return path.join(this.uploadDir, name);
};

IncomingForm.prototype._maybeEnd = function() {
  if (!this.ended || this._flushing || this.error) {
    return;
  }

  this.emit('end');
};
