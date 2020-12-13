'use strict';

const VolatileFile = require('../../src/VolatileFile');

const file = new VolatileFile({
  size: 1024,
  name: 'cat.png',
  type: 'image/png',
  filename: 'cat.png',
  mime: 'image/png',
});

test('VolatileFile#toJSON()', () => {
  const obj = file.toJSON();
  const len = Object.keys(obj).length;

  expect(obj.size).toBe(1024);
  expect(obj.name).toBe('cat.png');
  expect(obj.type).toBe('image/png');
  expect(obj.mime).toBe('image/png');
  expect(obj.filename).toBe('cat.png');
  expect(6).toBe(len);
});

test('VolatileFile#toString()', () => {
  expect(file.toString()).toBe('VolatileFile: cat.png');
});

test('VolatileFile#write()', (done) => {
  file.on('progress', (size) => {
    expect(size).toBe(1029);
  });

  const buffer = Buffer.alloc(5);
  file.write(buffer, () => {
    done();
  });
});

test('VolatileFile#end()', (done) => {
  const fileEmitSpy = jest.spyOn(file, 'emit');

  file.end(() => done());

  expect(fileEmitSpy).toBeCalledWith('end');
});
