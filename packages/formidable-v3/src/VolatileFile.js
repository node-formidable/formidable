/* eslint-disable no-underscore-dangle */

import { createHash } from 'node:crypto';
import { EventEmitter } from 'node:events';

class VolatileFile extends EventEmitter {
  constructor({
    createFileWriteStream,
    filepath,
    hashAlgorithm,
    mimetype,
    newFilename,
    originalFilename,
  }) {
    super();

    this.lastModifiedDate = null;
    Object.assign(this, {
      createFileWriteStream, filepath, hashAlgorithm, mimetype, newFilename, originalFilename,
    });

    this.size = 0;
    this._writeStream = null;

    if (typeof this.hashAlgorithm === 'string') {
      this.hash = createHash(this.hashAlgorithm);
    } else {
      this.hash = null;
    }
  }

  open() {
    this._writeStream = this.createFileWriteStream(this);
    this._writeStream.on('error', (err) => {
      this.emit('error', err);
    });
  }

  destroy() {
    this._writeStream.destroy();
  }

  toJSON() {
    const json = {
      length: this.length,
      mimetype: this.mimetype,
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
    return `VolatileFile: ${this.originalFilename}`;
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

export default VolatileFile;
