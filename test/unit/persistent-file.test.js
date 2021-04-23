import {jest} from '@jest/globals';
import PersistentFile from '../../src/PersistentFile.js';

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

    expect(obj.filepath).toBe('/tmp/cat.png');
    expect(obj.mimetype).toBe('image/png');
    expect(obj.originalFilename).toBe('cat.png');
  });

  test('destroy()', () => {
    file.open();
    file.destroy();
    // eslint-disable-next-line global-require
    expect(require('fs').unlink).toBeCalled();
  });
});
