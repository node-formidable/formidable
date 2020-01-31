'use strict';

const { File } = require('../../src/index');

const now = new Date();
const file = new File({
  size: 1024,
  path: '/tmp/cat.png',
  name: 'cat.png',
  type: 'image/png',
  lastModifiedDate: now,
  filename: 'cat.png',
  mime: 'image/png',
});

test('File#toJSON()', () => {
  const obj = file.toJSON();
  const len = Object.keys(obj).length;

  expect(1024).toBe(obj.size);
  expect('/tmp/cat.png').toBe(obj.path);
  expect('cat.png').toBe(obj.name);
  expect('image/png').toBe(obj.type);
  expect('image/png').toBe(obj.mime);
  expect('cat.png').toBe(obj.filename);
  expect(now).toBe(obj.mtime);
  expect(len).toBe(8);
});
