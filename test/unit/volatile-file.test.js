'use strict';

const VolatileFile = require('../../src/VolatileFile');

describe('VolatileFile', () => {
  let file;
  let writeStreamInstanceMock;
  let writeStreamMock;

  beforeEach(() => {
    writeStreamInstanceMock = {
      on: jest.fn(),
      destroy: jest.fn(),
      end: jest.fn(),
      write: jest.fn(),
    };
    writeStreamMock = jest.fn(() => writeStreamInstanceMock);

    file = new VolatileFile({
      size: 1024,
      name: 'cat.png',
      type: 'image/png',
      filename: 'cat.png',
      mime: 'image/png',
      createFileWriteStream: writeStreamMock,
    });

    file.open();
  });

  test('open()', (done) => {
    const error = new Error('test');
    file.on('error', (err) => {
      expect(err).toBe(error);
      done();
    });

    file.emit('error', error);

    expect(writeStreamMock).toBeCalledWith('cat.png');
    expect(writeStreamInstanceMock.on).toBeCalledWith(
      'error',
      expect.any(Function),
    );
  });

  test('toJSON()', () => {
    const obj = file.toJSON();
    const len = Object.keys(obj).length;

    expect(obj.size).toBe(1024);
    expect(obj.name).toBe('cat.png');
    expect(obj.type).toBe('image/png');
    expect(obj.mime).toBe('image/png');
    expect(obj.filename).toBe('cat.png');
    expect(6).toBe(len);
  });

  test('toString()', () => {
    expect(file.toString()).toBe('VolatileFile: cat.png');
  });

  test('write()', (done) => {
    const buffer = Buffer.alloc(5);
    writeStreamInstanceMock.write.mockImplementationOnce((writeBuffer, cb) => {
      expect(buffer).toBe(writeBuffer);
      cb();
    });
    file.on('progress', (size) => {
      expect(size).toBe(1029);
    });

    file.write(buffer, () => {
      done();
    });
  });

  test('end()', (done) => {
    writeStreamInstanceMock.end.mockImplementationOnce((cb) => {
      cb();
    });
    const fileEmitSpy = jest.spyOn(file, 'emit');

    file.end(() => done());

    expect(fileEmitSpy).toBeCalledWith('end');
  });

  test('destroy()', () => {
    file.destroy();
    expect(writeStreamInstanceMock.destroy).toBeCalled();
  });
});
