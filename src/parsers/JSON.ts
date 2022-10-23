/* eslint-disable no-underscore-dangle */

import { Transform, TransformCallback } from 'node:stream';
import { IFormidableOptions } from '../types';

class JSONParser extends Transform {
  chunks: string[];
  globalOptions: Partial<IFormidableOptions> | null

  constructor(options: Partial<IFormidableOptions> = {}) {
    super({ readableObjectMode: true });
    this.chunks = [];
    this.globalOptions = { ...options };
  }

  override _transform(chunk: any, encoding: BufferEncoding, callback: TransformCallback) {
    this.chunks.push(String(chunk)); // todo consider using a string decoder
    callback();
  }

  override _flush(callback: TransformCallback) {
    try {
      const fields = JSON.parse(this.chunks.join(''));
      this.push(fields);
    } catch (e) {
      callback(e);
      return;
    }
    this.chunks = [];
    callback();
  }
}

export default JSONParser;
