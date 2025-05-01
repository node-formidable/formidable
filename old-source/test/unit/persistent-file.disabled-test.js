import {jest} from '@jest/globals';
import fs from 'node:fs';
import PersistentFile from '../../src/PersistentFile.js';

const mockFs = fs;
const now = new Date();
const file = new PersistentFile({
  size: 1024,
  filepath: '/tmp/cat.png',
  name: 'cat.png',
  type: 'image/png',
  lastModifiedDate: now,
  originalFilename: 'cat.png',
  newFilename: 'dff1d2eaab9752165764dcd00',
  mimetype: 'image/png',
});

const mockFn = jest.fn();
jest.mock('fs', () => {
  return {
    ...mockFs,
    unlink: mockFn,
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

  test('toString()', () => {
    const result = file.toString();
    expect(result).toBe('PersistentFile: dff1d2eaab9752165764dcd00, Original: cat.png, Path: /tmp/cat.png')
  });

  test('destroy()', () => {
    file.open();
    file.destroy();
    // eslint-disable-next-line global-require
    expect(mockFn).toBeCalled();
  });
});
