import { createWriteStream, unlink } from 'node:fs';
import FormidableFile from './abstract.js';

export type PersistentFileOptions = Pick<FormidableFile, 'filepath' | 'newFilename' | 'originalFilename' | 'mimetype' | 'hashAlgorithm'>;

export class PersistentFile extends FormidableFile {
  constructor(options: PersistentFileOptions) {
    super(
      'PersistentFile',
      createWriteStream(options.filepath),
      options.hashAlgorithm,
      options.filepath,
      options.originalFilename,
      options.originalFilename,
      options.mimetype,
    );
  }

  destroy() {
    super.destroy();

    setTimeout(() => {
      unlink(this.filepath, () => {});
    }, 1)
  }
}
