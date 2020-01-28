/* eslint-disable no-underscore-dangle */

'use strict';

const { Transform } = require('stream');

class MyTransform extends Transform {
  constructor() {
    // writableObjectMode , objectMode
    super({ readableObjectMode: true /* encoding: 'utf-8' */ });
  }

  _transform(chunk, encoding, callback) {
    console.log(typeof chunk, encoding);
    this.push({
      a: chunk,
      b: 'b',
    });
    callback();
  }

  // eslint-disable-next-line class-methods-use-this
  _flush(callback) {
    callback();
  }
}

const myTransform = new MyTransform();
console.log(myTransform._readableState.objectMode); // true

myTransform.on('data', console.log);
myTransform.write(Buffer.from('oyo'));
myTransform.end();
