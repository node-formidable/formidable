/* eslint-disable no-underscore-dangle */

import { Transform, TransformCallback } from 'node:stream';
import { IFormidableOptions } from '../types';

// This is a buffering parser, have a look at StreamingQuerystring.js for a streaming parser
class QuerystringParser extends Transform {
  globalOptions: Partial<IFormidableOptions>
  buffer: string;
  bufferLength: number;

  constructor(options: Partial<IFormidableOptions> = {}) {
    super({ readableObjectMode: true });
    this.globalOptions = { ...options };
    this.buffer = '';
    this.bufferLength = 0;
  }

  override _transform(buffer: any, encoding: BufferEncoding, callback: TransformCallback) {
    this.buffer += buffer.toString('ascii');
    this.bufferLength = this.buffer.length;
    callback();
  }

  override _flush(callback: TransformCallback) {
    const fields = new URLSearchParams(this.buffer);
    for (const [key, value] of fields) {
      this.push({
        key,
        value,
      });
    }
    this.buffer = '';
    callback();
  }
}

export default QuerystringParser;
