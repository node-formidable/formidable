/* eslint-disable no-underscore-dangle */

import fs from 'node:fs';
import crypto from 'node:crypto';
import { EventEmitter } from 'node:events';
import type { IFile } from './types'
import { Writable } from 'node:stream';

class PersistentFile extends EventEmitter implements IFile {
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

  constructor({ filepath, newFilename, originalFilename, mimetype, hashAlgorithm }: Partial<IFile>) {
    super();

    this.lastModifiedDate = null;

    this.filepath = filepath;
    this.newFilename = newFilename;
    this.originalFilename = originalFilename;
    this.mimetype = mimetype;
    this.hashAlgorithm = hashAlgorithm;

    this.size = 0;
    this.length = null;
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
      size: this.size,
      filepath: this.filepath,
      newFilename: this.newFilename,
      mimetype: this.mimetype,
      mtime: this.lastModifiedDate,
      length: this.length,
      originalFilename: this.originalFilename,
      ...((this.hash && this.hash !== '') && {hash: this.hash})
    };
    return json;
  }

  override toString() {
    return `PersistentFile: ${this.newFilename}, Original: ${this.originalFilename}, Path: ${this.filepath}`;
  }

  write(buffer: Buffer, cb: () => void) {
    if (this.hash && this.hash instanceof crypto.Hash) {
      this.hash.update(buffer);
    }

    // @ts-ignore: Relies on undocumented Node internal. Documented as of Node v18.0.0
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

  end(cb: () => void) {
    if (this.hash && this.hash instanceof crypto.Hash) {
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
    setTimeout(function () {
        fs.unlink(filepath, () => {});
    }, 1)
  }
}

export default PersistentFile;
