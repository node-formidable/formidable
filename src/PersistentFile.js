/* eslint-disable no-underscore-dangle */

'use strict';

const fs = require('fs');
const crypto = require('crypto');
const { EventEmitter } = require('events');

class PersistentFile extends EventEmitter {
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
    this._writeStream = new fs.WriteStream(this.path);
    this._writeStream.on('error', (err) => {
      this.emit('error', err);
    });
  }

  toJSON() {
    const json = {
      size: this.size,
      path: this.path,
      newName: this.newName,
      mime: this.mime,
      mtime: this.lastModifiedDate,
      length: this.length,
      filename: this.filename,
    };
    if (this.hash && this.hash !== '') {
      json.hash = this.hash;
    }
    return json;
  }

  toString() {
    return `PersistentFile: ${this.filename}, Path: ${this.path}`;
  }

  write(buffer, cb) {
    if (this.hash) {
      this.hash.update(buffer);
    }

    if (this._writeStream.closed) {
      cb();
      return;
    }

    this._writeStream.write(buffer, () => {
      this.lastModifiedDate = new Date();
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

  destroy() {
    this._writeStream.destroy();
  }
}

module.exports = PersistentFile;
