/* eslint-disable class-methods-use-this */
/* eslint-disable no-underscore-dangle */

'use strict';

const os = require('os');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const once = require('once');
const dezalgo = require('dezalgo');
const { EventEmitter } = require('events');
const { StringDecoder } = require('string_decoder');

const DEFAULT_OPTIONS = {
  maxFields: 1000,
  maxFieldsSize: 20 * 1024 * 1024,
  maxFileSize: 200 * 1024 * 1024,
  keepExtensions: false,
  encoding: 'utf-8',
  hash: false,
  multiples: false,
  enabledPlugins: ['octetstream', 'querystring', 'multipart', 'json'],
};

const File = require('./File');
const DummyParser = require('./parsers/Dummy');
const MultipartParser = require('./parsers/Multipart');

function hasOwnProp(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

class IncomingForm extends EventEmitter {
  constructor(options = {}) {
    super();
    this.error = null;
    this.ended = false;

    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.uploadDir = this.uploadDir || os.tmpdir();

    this.headers = null;
    this.type = null;

    this.bytesReceived = null;
    this.bytesExpected = null;

    this._parser = null;
    this._flushing = 0;
    this._fieldsSize = 0;
    this._fileSize = 0;
    this._plugins = [];
    this.openedFiles = [];

    const enabledPlugins = []
      .concat(this.options.enabledPlugins)
      .filter(Boolean);

    if (enabledPlugins.length === 0) {
      throw new Error(
        'expect at least 1 enabled builtin plugin, see options.enabledPlugins',
      );
    }

    this.options.enabledPlugins.forEach((pluginName) => {
      const plgName = pluginName.toLowerCase();
      // eslint-disable-next-line import/no-dynamic-require, global-require
      this.use(require(path.join(__dirname, 'plugins', `${plgName}.js`)));
    });
  }

  use(plugin) {
    if (typeof plugin !== 'function') {
      throw new Error('.use: expect `plugin` to be a function');
    }
    this._plugins.push(plugin.bind(this));
    return this;
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

    // Setup callback first, so we don't miss anything from data events emitted immediately.
    if (cb) {
      const callback = once(dezalgo(cb));
      const fields = {};
      const files = {};

      this.on('field', (name, value) => {
        // TODO: too much nesting
        if (this.options.multiples && name.slice(-2) === '[]') {
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
        if (this.options.multiples) {
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
        callback(err, fields, files);
      });
      this.on('end', () => {
        callback(null, fields, files);
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
        if (this._parser) {
          this._parser.end();
        }
        this._maybeEnd();
      });

    return this;
  }

  writeHeaders(headers) {
    this.headers = headers;
    this._parseContentLength();
    this._parseContentType();

    if (!this._parser) {
      this._error(new Error('not parser found'));
      return;
    }

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
    this._handlePart(part);
  }

  _handlePart(part) {
    if (part.filename && typeof part.filename !== 'string') {
      this._error(new Error(`the part.filename should be string when exists`));
      return;
    }

    // This MUST check exactly for undefined. You can not change it to !part.filename.

    // todo: uncomment when switch tests to Jest
    // console.log(part);

    // ? NOTE(@tunnckocore): no it can be any falsey value, it most probably depends on what's returned
    // from somewhere else. Where recently I changed the return statements
    // and such thing because code style
    // ? NOTE(@tunnckocore): or even better, if there is no mime, then it's for sure a field
    // ? NOTE(@tunnckocore): filename is an empty string when a field?
    if (!part.mime) {
      let value = '';
      const decoder = new StringDecoder(
        part.transferEncoding || this.options.encoding,
      );

      part.on('data', (buffer) => {
        this._fieldsSize += buffer.length;
        if (this._fieldsSize > this.options.maxFieldsSize) {
          this._error(
            new Error(
              `options.maxFieldsSize exceeded, received ${this._fieldsSize} bytes of field data`,
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
      hash: this.options.hash,
    });
    file.on('error', (err) => {
      this._error(err);
    });
    this.emit('fileBegin', part.name, file);

    file.open();
    this.openedFiles.push(file);

    part.on('data', (buffer) => {
      this._fileSize += buffer.length;
      if (this._fileSize > this.options.maxFileSize) {
        this._error(
          new Error(
            `options.maxFileSize exceeded, received ${this._fileSize} bytes of file data`,
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
      this._parser = new DummyParser(this, this.options);
      return;
    }

    if (!this.headers['content-type']) {
      this._error(new Error('bad content-type header, no content-type'));
      return;
    }

    const results = [];
    const _dummyParser = new DummyParser(this, this.options);

    // eslint-disable-next-line no-plusplus
    for (let idx = 0; idx < this._plugins.length; idx++) {
      const plugin = this._plugins[idx];

      let pluginReturn = null;

      try {
        pluginReturn = plugin(this, this.options) || this;
      } catch (err) {
        // directly throw from the `form.parse` method;
        // there is no other better way, except a handle through options
        const error = new Error(
          `plugin on index ${idx} failed with: ${err.message}`,
        );
        error.idx = idx;
        throw error;
      }

      Object.assign(this, pluginReturn);

      // todo: use Set/Map and pass plugin name instead of the `idx` index
      this.emit('plugin', idx, pluginReturn);
      results.push(pluginReturn);
    }

    this.emit('pluginsResults', results);

    // NOTE: probably not needed, because we check options.enabledPlugins in the constructor
    // if (results.length === 0 /* && results.length !== this._plugins.length */) {
    //   this._error(
    //     new Error(
    //       `bad content-type header, unknown content-type: ${this.headers['content-type']}`,
    //     ),
    //   );
    // }
  }

  _error(err, eventName = 'error') {
    // if (!err && this.error) {
    //   this.emit('error', this.error);
    //   return;
    // }
    if (this.error || this.ended) {
      return;
    }

    this.error = err;
    this.emit(eventName, err);

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
    return new MultipartParser(this.options);
  }

  _getFileName(headerValue) {
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

  _uploadPath(filename) {
    const buf = crypto.randomBytes(16);
    let name = `upload_${buf.toString('hex')}`;

    if (this.options.keepExtensions) {
      let ext = path.extname(filename);
      ext = ext.replace(/(\.[a-z0-9]+).*/i, '$1');

      name += ext;
    }

    return path.join(this.uploadDir, name);
  }

  _maybeEnd() {
    // console.log('ended', this.ended);
    // console.log('_flushing', this._flushing);
    // console.log('error', this.error);
    if (!this.ended || this._flushing || this.error) {
      return;
    }

    this.emit('end');
  }
}

IncomingForm.DEFAULT_OPTIONS = DEFAULT_OPTIONS;
module.exports = IncomingForm;
