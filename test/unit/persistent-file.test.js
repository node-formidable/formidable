'use strict';

const PersistentFile = require('../../src/PersistentFile');

const now = new Date();
const file = new PersistentFile({
  size: 1024,
  path: '/tmp/cat.png',
  name: 'cat.png',
  type: 'image/png',
  lastModifiedDate: now,
  filename: 'cat.png',
  mimetype: 'image/png',
});

test('PersistentFile#toJSON()', () => {
  const obj = file.toJSON();

  expect('/tmp/cat.png').toBe(obj.path);
  expect('image/png').toBe(obj.mimetype);
  expect('cat.png').toBe(obj.filename);
  expect(now).toBe(obj.mtime);
});
