/* eslint-disable no-underscore-dangle */

'use strict';

const crypto = require('crypto');
const { EventEmitter } = require('events');

class VolatileFile extends EventEmitter {
  constructor(properties) {
    super();

    this.size = 0;
    this.name = null;
    this.type = null;
    this.hash = null;

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

  // eslint-disable-next-line class-methods-use-this
  open() {}

  // eslint-disable-next-line class-methods-use-this
  destroy() {}

  toJSON() {
    const json = {
      size: this.size,
      name: this.name,
      type: this.type,
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
    return `VolatileFile: ${this.name}`;
  }

  write(buffer, cb) {
    if (this.hash) {
      this.hash.update(buffer);
    }

    this.size += buffer.length;
    this.emit('progress', this.size);
    cb();
  }

  end(cb) {
    if (this.hash) {
      this.hash = this.hash.digest('hex');
    }
    this.emit('end');
    cb();
  }
}

module.exports = VolatileFile;
