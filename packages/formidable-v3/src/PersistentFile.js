/* eslint-disable no-underscore-dangle */

import crypto from 'node:crypto';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';

class PersistentFile extends EventEmitter {
  constructor({
    filepath,
    hashAlgorithm,
    mimetype,
    newFilename,
    originalFilename,
  }) {
    super();

    this.lastModifiedDate = null;
    Object.assign(this, {
      filepath,
      hashAlgorithm,
      mimetype,
      newFilename,
      originalFilename,
    });

    this.size = 0;
    this._writeStream = null;

    if (typeof this.hashAlgorithm === 'string') {
      this.hash = crypto.createHash(this.hashAlgorithm);
    } else {
      this.hash = null;
    }
  }

  open() {
    this._writeStream = fs.createWriteStream(this.filepath);
    this._writeStream.on('error', (err) => {
      this.emit('error', err);
    });
  }

  toJSON() {
    const json = {
      filepath: this.filepath,
      length: this.length,
      mimetype: this.mimetype,
      mtime: this.lastModifiedDate,
      newFilename: this.newFilename,
      originalFilename: this.originalFilename,
      size: this.size,
    };
    if (this.hash && this.hash !== '') {
      json.hash = this.hash;
    }
    return json;
  }

  toString() {
    return `PersistentFile: ${this.newFilename}, Original: ${this.originalFilename}, Path: ${this.filepath}`;
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
    const filepath = this.filepath;
    setTimeout(() => {
      fs.unlink(filepath, () => {});
    }, 1);
  }
}

export default PersistentFile;
