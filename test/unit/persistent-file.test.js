'use strict';

const PersistentFile = require('../../src/PersistentFile');

const now = new Date();
const file = new PersistentFile({
  size: 1024,
  filepath: '/tmp/cat.png',
  name: 'cat.png',
  type: 'image/png',
  lastModifiedDate: now,
  originalFilename: 'cat.png',
  mimetype: 'image/png',
});

test('PersistentFile#toJSON()', () => {
  const obj = file.toJSON();

  expect(obj.filepath).toBe('/tmp/cat.png');
  expect(obj.mimetype).toBe('image/png');
  expect(obj.originalFilename).toBe('cat.png');
});
