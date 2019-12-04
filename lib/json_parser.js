if (global.GENTLY) require = GENTLY.hijack(require);
const { Transform } = require('stream');


class JSONParser extends Transform {
  constructor() {
    super({ readableObjectMode: true });
    this.chunks = [];
    this.bytesWritten = 0;
  }

  _transform(chunk, encoding, callback) {
    this.bytesWritten += chunk.length;
    this.chunks.push(String(chunk));// todo consider using a string decoder
    callback();
  }

  _flush(callback) {
    try {
      var fields = JSON.parse(this.chunks.join(''));
      for (var key in fields) {
        this.push({
          key,
          value: fields[key],
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
