/* eslint-disable no-underscore-dangle */

import { Transform } from 'stream';
import { parse } from 'querystring';

// This is a buffering parser, not quite as nice as the multipart one.
// If I find time I'll rewrite this to be fully streaming as well
class QuerystringParser extends Transform {
  constructor(options = {}) {
    super({ readableObjectMode: true });
    this.globalOptions = { ...options };
    this.buffer = '';
    this.bufferLength = 0;
  }

  _transform(buffer, encoding, callback) {
    this.buffer += buffer.toString('ascii');
    this.bufferLength = this.buffer.length;
    callback();
  }

  _flush(callback) {
    const fields = parse(this.buffer, '&', '=');
    // eslint-disable-next-line no-restricted-syntax, guard-for-in
    for (const key in fields) {
      this.push({
        key,
        value: fields[key],
      });
    }
    this.buffer = '';
    callback();
  }
}

export default QuerystringParser;
