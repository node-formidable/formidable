'use strict';

const assert = require('assert');
const test = require('utest');

const { File } = require('../../src/index');

let file;
const now = new Date();

test('IncomingForm', {
  before() {
    file = new File({
      size: 1024,
      path: '/tmp/cat.png',
      name: 'cat.png',
      type: 'image/png',
      lastModifiedDate: now,
      filename: 'cat.png',
      mime: 'image/png',
    });
  },

  '#toJSON()': () => {
    const obj = file.toJSON();
    const len = Object.keys(obj).length;
    assert.equal(1024, obj.size);
    assert.equal('/tmp/cat.png', obj.path);
    assert.equal('cat.png', obj.name);
    assert.equal('image/png', obj.type);
    assert.equal('image/png', obj.mime);
    assert.equal('cat.png', obj.filename);
    assert.equal(now, obj.mtime);
    assert.equal(len, 8);
  },
});
