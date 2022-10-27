/* eslint-disable no-underscore-dangle */

import { createHash, Hash } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { Writable } from 'node:stream';
import type { IFile } from './types'

class VolatileFile extends EventEmitter implements IFile {
  lastModifiedDate: Date | null;
  size: IFile['size'];
  length: IFile['length'];
  _writeStream: Writable | null;
  hash: IFile['hash'];
  filepath: IFile['filepath'];
  newFilename: IFile['newFilename'];
  originalFilename: IFile['originalFilename'];
  mimetype: IFile['mimetype'];
  hashAlgorithm: IFile['hashAlgorithm'];
  createFileWriteStream: IFile['createFileWriteStream'];

  constructor({ filepath, newFilename, originalFilename, mimetype, hashAlgorithm, createFileWriteStream }: Partial<IFile>) {
    super();

    this.lastModifiedDate = null;

    this.filepath = filepath;
    this.newFilename = newFilename;
    this.originalFilename = originalFilename;
    this.mimetype = mimetype;
    this.hashAlgorithm = hashAlgorithm;
    this.createFileWriteStream = createFileWriteStream;

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
      size: this.size,
      newFilename: this.newFilename,
      length: this.length,
      originalFilename: this.originalFilename,
      mimetype: this.mimetype,
      ...((this.hash && this.hash !== '') && {hash: this.hash})
    };
    return json;
  }

  override toString() {
    return `VolatileFile: ${this.originalFilename}`;
  }

  write(buffer: Buffer, cb: () => void) {
    if (this.hash && this.hash instanceof Hash) {
      this.hash.update(buffer);
    }

    // @ts-ignore: Relies on undocumented Node internal. Documented as of Node v18.0.0
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

  end(cb: () => void) {
    if (this.hash && this.hash instanceof Hash) {
      this.hash = this.hash.digest('hex');
    }
    this._writeStream.end(() => {
      this.emit('end');
      cb();
    });
  }
}

export default VolatileFile;
