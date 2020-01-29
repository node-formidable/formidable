/* eslint-disable class-methods-use-this */
/* eslint-disable no-underscore-dangle */

'use strict';

const os = require('os');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Stream } = require('stream');
const { EventEmitter } = require('events');
const { StringDecoder } = require('string_decoder');

const { File } = require('./file');
const { JSONParser } = require('./json_parser');
const { DummyParser } = require('./dummy_parser');
const { OctetParser } = require('./octet_parser');
const { defaultOptions } = require('./default_options');
const { MultipartParser } = require('./multipart_parser');
const { QuerystringParser } = require('./querystring_parser');

function hasOwnProp(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

class IncomingForm extends EventEmitter {
  constructor(options = {}) {
    super();
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
  }

  parse(req, cb) {
    this.pause = () => {
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

    this.resume = () => {
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
      const fields = {};
      const files = {};
      this.on('field', (name, value) => {
        // TODO: too much nesting
        if (this.multiples && name.slice(-2) === '[]') {
          const realName = name.slice(0, name.length - 2);
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
        // if (name === 'simple') {
        //   console.log('fields name!!', name);
        //   console.log('fields value!!', value);
        // }
      });
      this.on('file', (name, file) => {
        // TODO: too much nesting
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
        // console.log('files!!', files);
        // if (name === 'simple') {
        //   console.log('files name!!', name);
        //   console.log('files value!!', file);
        // }
      });
      this.on('error', (err) => {
        cb(err, fields, files);
      });
      this.on('end', () => {
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
  }

  writeHeaders(headers) {
    this.headers = headers;
    this._parseContentLength();
    this._parseContentType();
    this._parser.once('error', (error) => {
      this._error(error);
    });
  }

  write(buffer) {
    if (this.error) {
      return null;
    }
    if (!this._parser) {
      this._error(new Error('uninitialized parser'));
      return null;
    }

    this.bytesReceived += buffer.length;
    this.emit('progress', this.bytesReceived, this.bytesExpected);

    this._parser.write(buffer);

    return this.bytesReceived;
  }

  pause() {
    // this does nothing, unless overwritten in IncomingForm.parse
    return false;
  }

  resume() {
    // this does nothing, unless overwritten in IncomingForm.parse
    return false;
  }

  onPart(part) {
    // this method can be overwritten by the user
    this.handlePart(part);
  }

  handlePart(part) {
    if (part.filename && typeof part.filename !== 'string') {
      this._error(new Error(`the part.filename should be string when exists`));
      return;
    }

    // This MUST check exactly for undefined. You can not change it to !part.filename.

    // ? NOTE(@tunnckocore): no it can be any falsey value, it most probably depends on what's returned
    // from somewhere else. Where recently I changed the return statements
    // and such thing because code style
    // ? NOTE(@tunnckocore): or even better, if there is no mime, then it's for sure a field
    // ? NOTE(@tunnckocore): filename is an empty string when a field
    if ((part.filename !== '' && !part.filename) || !part.mime) {
      let value = '';
      const decoder = new StringDecoder(part.transferEncoding || this.encoding);

      part.on('data', (buffer) => {
        this._fieldsSize += buffer.length;
        if (this._fieldsSize > this.maxFieldsSize) {
          this._error(
            new Error(
              `maxFieldsSize exceeded, received ${this._fieldsSize} bytes of field data`,
            ),
          );
          return;
        }
        value += decoder.write(buffer);
      });

      part.on('end', () => {
        this.emit('field', part.name, value);
      });
      return;
    }

    this._flushing += 1;

    const file = new File({
      path: this._uploadPath(part.filename),
      name: part.filename,
      type: part.mime,
      hash: this.hash,
    });

    this.emit('fileBegin', part.name, file);

    file.open();
    this.openedFiles.push(file);

    part.on('data', (buffer) => {
      this._fileSize += buffer.length;
      if (this._fileSize > this.maxFileSize) {
        this._error(
          new Error(
            `maxFileSize exceeded, received ${this._fileSize} bytes of file data`,
          ),
        );
        return;
      }
      if (buffer.length === 0) {
        return;
      }
      this.pause();
      file.write(buffer, () => {
        this.resume();
      });
    });

    part.on('end', () => {
      file.end(() => {
        this._flushing -= 1;
        this.emit('file', part.name, file);
        this._maybeEnd();
      });
    });
  }

  // eslint-disable-next-line max-statements
  _parseContentType() {
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
      const m = this.headers['content-type'].match(
        /boundary=(?:"([^"]+)"|([^;]+))/i,
      );
      if (m) {
        this._initMultipart(m[1] || m[2]);
      } else {
        this._error(
          new Error('bad content-type header, no multipart boundary'),
        );
      }
      return;
    }

    if (this.headers['content-type'].match(/json/i)) {
      this._initJSONencoded();
      return;
    }

    this._error(
      new Error(
        `bad content-type header, unknown content-type: ${this.headers['content-type']}`,
      ),
    );
  }

  _error(err) {
    if (this.error || this.ended) {
      return;
    }

    this.error = err;
    this.emit('error', err);

    if (Array.isArray(this.openedFiles)) {
      this.openedFiles.forEach((file) => {
        file._writeStream.destroy();
        setTimeout(fs.unlink, 0, file.path, () => {});
      });
    }
  }

  _parseContentLength() {
    this.bytesReceived = 0;
    if (this.headers['content-length']) {
      this.bytesExpected = parseInt(this.headers['content-length'], 10);
    } else if (this.headers['transfer-encoding'] === undefined) {
      this.bytesExpected = 0;
    }

    if (this.bytesExpected !== null) {
      this.emit('progress', this.bytesReceived, this.bytesExpected);
    }
  }

  _newParser() {
    return new MultipartParser();
  }

  _initMultipart(boundary) {
    this.type = 'multipart';

    const parser = new MultipartParser();
    let headerField;
    let headerValue;
    let part;

    parser.initWithBoundary(boundary);

    // eslint-disable-next-line max-statements, consistent-return
    parser.on('data', ({ name, buffer, start, end }) => {
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
        const m = headerValue.match(
          // eslint-disable-next-line no-useless-escape
          /\bname=("([^"]*)"|([^\(\)<>@,;:\\"\/\[\]\?=\{\}\s\t/]+))/i,
        );
        if (headerField === 'content-disposition') {
          if (m) {
            part.name = m[2] || m[3] || '';
          }

          part.filename = this._fileName(headerValue);
        } else if (headerField === 'content-type') {
          part.mime = headerValue;
        } else if (headerField === 'content-transfer-encoding') {
          part.transferEncoding = headerValue.toLowerCase();
        }

        headerField = '';
        headerValue = '';
      } else if (name === 'headersEnd') {
        switch (part.transferEncoding) {
          case 'binary':
          case '7bit':
          case '8bit': {
            const dataPropagation = (ctx) => {
              if (ctx.name === 'partData') {
                part.emit('data', ctx.buffer.slice(ctx.start, ctx.end));
              }
            };
            const dataStopPropagation = (ctx) => {
              if (ctx.name === 'partEnd') {
                part.emit('end');
                parser.off('data', dataPropagation);
                parser.off('data', dataStopPropagation);
              }
            };
            parser.on('data', dataPropagation);
            parser.on('data', dataStopPropagation);
            break;
          }
          case 'base64': {
            const dataPropagation = (ctx) => {
              if (ctx.name === 'partData') {
                part.transferBuffer += ctx.buffer
                  .slice(ctx.start, ctx.end)
                  .toString('ascii');

                /*
                    four bytes (chars) in base64 converts to three bytes in binary
                    encoding. So we should always work with a number of bytes that
                    can be divided by 4, it will result in a number of buytes that
                    can be divided vy 3.
                    */
                const offset = parseInt(part.transferBuffer.length / 4, 10) * 4;
                part.emit(
                  'data',
                  Buffer.from(
                    part.transferBuffer.substring(0, offset),
                    'base64',
                  ),
                );
                part.transferBuffer = part.transferBuffer.substring(offset);
              }
            };
            const dataStopPropagation = (ctx) => {
              if (ctx.name === 'partEnd') {
                part.emit('data', Buffer.from(part.transferBuffer, 'base64'));
                part.emit('end');
                parser.off('data', dataPropagation);
                parser.off('data', dataStopPropagation);
              }
            };
            parser.on('data', dataPropagation);
            parser.on('data', dataStopPropagation);
            break;
          }
          default:
            return this._error(new Error('unknown transfer-encoding'));
        }

        this.onPart(part);
      } else if (name === 'end') {
        this.ended = true;
        this._maybeEnd();
      }
    });

    this._parser = parser;
  }

  _fileName(headerValue) {
    // matches either a quoted-string or a token (RFC 2616 section 19.5.1)
    const m = headerValue.match(
      // eslint-disable-next-line no-useless-escape
      /\bfilename=("(.*?)"|([^\(\)<>@,;:\\"\/\[\]\?=\{\}\s\t/]+))($|;\s)/i,
    );
    if (!m) return null;

    const match = m[2] || m[3] || '';
    let filename = match.substr(match.lastIndexOf('\\') + 1);
    filename = filename.replace(/%22/g, '"');
    filename = filename.replace(/&#([\d]{4});/g, (_, code) =>
      String.fromCharCode(code),
    );
    return filename;
  }

  _initUrlencoded() {
    this.type = 'urlencoded';

    const parser = new QuerystringParser(this.maxFields);

    parser.on('data', ({ key, value }) => {
      this.emit('field', key, value);
    });

    parser.onEnd = () => {
      this.ended = true;
      this._maybeEnd();
    };

    this._parser = parser;
  }

  _initOctetStream() {
    this.type = 'octet-stream';
    const filename = this.headers['x-file-name'];
    const mime = this.headers['content-type'];

    const file = new File({
      path: this._uploadPath(filename),
      name: filename,
      type: mime,
    });

    this.emit('fileBegin', filename, file);
    file.open();
    this.openedFiles.push(file);
    this._flushing += 1;

    this._parser = new OctetParser();

    // Keep track of writes that haven't finished so we don't emit the file before it's done being written
    let outstandingWrites = 0;

    this._parser.on('data', (buffer) => {
      this.pause();
      outstandingWrites += 1;

      file.write(buffer, () => {
        outstandingWrites -= 1;
        this.resume();

        if (this.ended) {
          this._parser.emit('doneWritingFile');
        }
      });
    });

    this._parser.on('end', () => {
      this._flushing -= 1;
      this.ended = true;

      const done = () => {
        file.end(() => {
          this.emit('file', 'file', file);
          this._maybeEnd();
        });
      };

      if (outstandingWrites === 0) {
        done();
      } else {
        this._parser.once('doneWritingFile', done);
      }
    });
  }

  _initJSONencoded() {
    this.type = 'json';

    const parser = new JSONParser();

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
  }

  _uploadPath(filename) {
    const buf = crypto.randomBytes(16);
    let name = `upload_${buf.toString('hex')}`;

    if (this.keepExtensions) {
      let ext = path.extname(filename);
      ext = ext.replace(/(\.[a-z0-9]+).*/i, '$1');

      name += ext;
    }

    return path.join(this.uploadDir, name);
  }

  _maybeEnd() {
    if (!this.ended || this._flushing || this.error) {
      return;
    }

    this.emit('end');
  }
}

IncomingForm.IncomingForm = IncomingForm;
exports.IncomingForm = IncomingForm;
exports.default = IncomingForm;
module.exports = exports.default;
