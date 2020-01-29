/* eslint-disable no-underscore-dangle */

'use strict';

const fs = require('fs');
const crypto = require('crypto');
const { EventEmitter } = require('events');

class File extends EventEmitter {
  constructor(properties) {
    super();

    this.size = 0;
    this.path = null;
    this.name = null;
    this.type = null;
    this.hash = null;
    this.lastModifiedDate = null;

    this._writeStream = null;

    // eslint-disable-next-line guard-for-in, no-restricted-syntax
    for (const key in properties) {
      this[key] = properties[key];
    }

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
      name: this.name,
      type: this.type,
      mtime: this.lastModifiedDate,
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
    return `File: ${this.name}, Path: ${this.path}`;
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
}

module.exports = File;
