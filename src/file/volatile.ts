import { Writable } from 'node:stream';
import FormidableFile from './abstract.js';
import { PersistentFileOptions } from './persistent.js';

export interface VolatileFileOptions extends PersistentFileOptions {
  createFileWriteStream: (options: PersistentFileOptions) => Writable;
}

export class VolatileFile extends FormidableFile {
  constructor(options: VolatileFileOptions) {
    super(
      'VolatileFile',
      options.createFileWriteStream(options),
      options.hashAlgorithm,
      options.filepath,
      options.originalFilename,
      options.originalFilename,
      options.mimetype,
    );
  }
}
