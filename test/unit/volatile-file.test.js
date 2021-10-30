import {jest} from '@jest/globals';
import VolatileFile from '../../src/VolatileFile.js';


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
      xname: 'cat.png',
      originalFilename: 'cat.png',
      mimetype: 'image/png',
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

    expect(writeStreamMock).toBeCalled();
    expect(writeStreamInstanceMock.on).toBeCalledWith(
      'error',
      expect.any(Function),
    );
  });

  test('toJSON()', () => {
    const obj = file.toJSON();

    expect(obj.mimetype).toBe('image/png');
    expect(obj.originalFilename).toBe('cat.png');
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
