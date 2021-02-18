/* eslint-disable no-underscore-dangle */

'use strict';

const crypto = require('crypto');
const { EventEmitter } = require('events');

class VolatileFile extends EventEmitter {
  constructor(properties) {
    super();

    Object.assign(this, properties);

    this.size = 0;
    this._writeStream = null;

    if (typeof this.hash === 'string') {
      this.hash = crypto.createHash(properties.hash);
    } else {
      this.hash = null;
    }
  }

  open() {
    this._writeStream = this.createFileWriteStream(this.filename);
    this._writeStream.on('error', (err) => {
      this.emit('error', err);
    });
  }

  destroy() {
    this._writeStream.destroy();
  }

  toJSON() {
    const json = {
      size: this.size,
      name: this.filename,
      type: this.mime,
      length: this.length,
      filename: this.filename,
      mime: this.mime,
    };
    if (this.hash && this.hash !== '') {
      json.hash = this.hash;
    }
    return json;
  }

  toString() {
    return `VolatileFile: ${this.filename}`;
  }

  write(buffer, cb) {
    if (this.hash) {
      this.hash.update(buffer);
    }

    if (this._writeStream.closed || this._writeStream.destroyed) {
      cb();
      return;
    }

    this._writeStream.write(buffer, () => {
      this.size += buffer.length;
      this.emit('progress', this.size);
      cb();
    });
  }

  end(cb) {
    if (this.hash) {
      this.hash = this.hash.digest('hex');
    }
    this._writeStream.end(() => {
      this.emit('end');
      cb();
    });
  }
}

module.exports = VolatileFile;
