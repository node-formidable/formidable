if (global.GENTLY) require = GENTLY.hijack(require);
const { Transform } = require('stream');


class JSONParser extends Transform {
  constructor() {
    super({ readableObjectMode: true, encoding: 'utf-8' });
    this.chunks = [];
    this.bytesWritten = 0;
  }

  _transform(chunk, encoding, callback) {
    this.bytesWritten += chunk.length;
    this.chunks.push(String(chunk));// todo why is not already a string
    callback();
  }

  _flush(callback) {
    try {
      var fields = JSON.parse(this.chunks.join(''));
      for (var field in fields) {
        // this.push("a");
        this.push({
          field,
          value: fields[field],
        });
      }
    } catch (e) {
      this.emit('error', e);
    }
    this.chunks = null;
    callback();
  }
}

exports.JSONParser = JSONParser;
