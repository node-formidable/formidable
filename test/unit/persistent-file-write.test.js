/* eslint-disable no-underscore-dangle */
import { jest } from "@jest/globals";
import PersistentFile from "../../src/PersistentFile.js";

// Covers https://github.com/node-formidable/formidable/issues/958: writing
// to a PersistentFile after its underlying write stream was destroyed (but
// before the stream's "close" event has fired, i.e. `.closed` is still
// false) must not attempt to write to it, since Node throws
// ERR_STREAM_DESTROYED ("Cannot call write after a stream was destroyed")
// for that, and that error surfaces outside of any catchable callback.
describe("PersistentFile write() guards against a destroyed stream", () => {
  let file;
  let writeStreamMock;

  beforeEach(() => {
    file = new PersistentFile({
      filepath: "/tmp/cat.png",
      originalFilename: "cat.png",
      newFilename: "dff1d2eaab9752165764dcd00",
      mimetype: "image/png",
    });

    writeStreamMock = {
      closed: false,
      destroyed: false,
      // Always resolves, whether or not the guard under test should have
      // short-circuited before reaching here - that way an unguarded write
      // still completes `file.write()`'s callback promptly, so a broken
      // guard fails its assertion immediately instead of timing out.
      write: jest.fn((writeBuffer, cb) => cb()),
    };
    file._writeStream = writeStreamMock;
  });

  test("write() calls through to the stream when it is neither closed nor destroyed", (done) => {
    const buffer = Buffer.alloc(5);

    file.write(buffer, () => {
      expect(writeStreamMock.write).toBeCalledWith(
        buffer,
        expect.any(Function)
      );
      done();
    });
  });

  test("write() is a no-op once the stream is closed", (done) => {
    writeStreamMock.closed = true;

    file.write(Buffer.alloc(5), () => {
      expect(writeStreamMock.write).not.toBeCalled();
      done();
    });
  });

  test("write() is a no-op once the stream is destroyed, even while closed is still false", (done) => {
    // This is the state a request-aborted destroy() can leave the stream in:
    // `destroyed` flips synchronously, `closed` only follows once the
    // underlying fd finishes closing.
    writeStreamMock.destroyed = true;

    file.write(Buffer.alloc(5), () => {
      expect(writeStreamMock.write).not.toBeCalled();
      done();
    });
  });
});
