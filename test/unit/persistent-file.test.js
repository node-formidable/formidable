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
  mime: 'image/png',
});

jest.mock('fs', () => {
  const fs = jest.requireActual('fs');
  return {
    ...fs,
    unlink: jest.fn(),
  };
});

describe('PersistentFile', () => {
  test('toJSON()', () => {
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

  test('destroy()', () => {
    file.open();
    file.destroy();
    // eslint-disable-next-line global-require
    expect(require('fs').unlink).toBeCalled();
  });
});
