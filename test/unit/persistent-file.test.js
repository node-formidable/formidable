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

  expect(obj.path).toBe('/tmp/cat.png');
  expect(obj.mimetype).toBe('image/png');
  expect(obj.filename).toBe('cat.png');
  expect(obj.mtime).toBe(now);
});
