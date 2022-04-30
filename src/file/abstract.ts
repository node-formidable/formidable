import { Writable } from 'node:stream';
import { createHash } from 'node:crypto';
import { EventEmitter } from 'node:events';


export class FormidableFile extends EventEmitter {
  public readonly hashCreator?: ReturnType<typeof createHash>;
  public hash?: string;

  public lastModifiedDate?: Date;
  /**
   * The size of the uploaded file in bytes.
   * If the file is still being uploaded (see `'fileBegin'` event), this property says how many bytes of the file have been written to disk so far.
   */
  public size = 0;


  constructor(
    public readonly fileType: string,
    public readonly writeStream: Writable,
    /** If `false`, hash will not generate. Otherwise specify a string accepted by node's `createHash` */
    public readonly hashAlgorithm: false | Parameters<typeof createHash>[0],
    /** The path this file is being written to. You can modify this in the `'fileBegin'` event in case you are unhappy with the way formidable generates a temporary path for your files. */
    public filepath: string,
    /** The name this file had according to the uploading client. */
    public originalFilename: string | undefined,
    /** Calculated based on options provided */
    public newFilename: string | undefined,
    /** The mime type of this file, according to the uploading client. */
    public mimetype: string | undefined,
  ) {
    super();

    if (typeof this.hashAlgorithm === 'string') {
      this.hashCreator = createHash(this.hashAlgorithm);
      this.hash = '';
    }

    this.writeStream.on('error', (err) => {
      this.emit('error', err);
    });
  }

  write(
    buffer: Buffer,
    callback: () => void,
  ) {
    if (this.hashCreator) {
      this.hashCreator.update(buffer);
    }

    if (this.writeStream.destroyed) {
      callback();
      return;
    }

    this.writeStream.write(buffer, () => {
      this.size += buffer.length;
      this.emit('progress', this.size);
      callback();
    });
  }

  end(callback: () => void) {
    if (this.hashCreator) {
      this.hash = this.hashCreator.digest('hex');
    }
    this.writeStream.end(() => {
      this.emit('end');
      callback();
    });
  }


  destroy() {
    this.writeStream.destroy();
  }

  toJSON() {
    const json = {
      size: this.size,
      newFilename: this.newFilename,
      originalFilename: this.originalFilename,
      mimetype: this.mimetype,
      hash: this.hashCreator
    };
    if (this.hashCreator && this.hash !== '') {
      json.hash = this.hashCreator;
    }
    return json;
  }

  toString() {
    return `${this.fileType}: ${this.newFilename}, Original: ${this.originalFilename}, Path: ${this.filepath}`;
  }
}

export default FormidableFile;
