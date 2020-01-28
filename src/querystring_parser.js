/* eslint-disable no-underscore-dangle */
const { Transform } = require('stream');
const querystring = require('querystring');

// This is a buffering parser, not quite as nice as the multipart one.
// If I find time I'll rewrite this to be fully streaming as well
class QuerystringParser extends Transform {
  constructor(maxKeys) {
    super({ readableObjectMode: true });
    this.maxKeys = maxKeys;
    this.buffer = '';
  }

  _transform(buffer, encoding, callback) {
    this.buffer += buffer.toString('ascii');
    callback();
  }

  _flush(callback) {
    const fields = querystring.parse(this.buffer, '&', '=', {
      maxKeys: this.maxKeys,
    });
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

exports.QuerystringParser = QuerystringParser;
