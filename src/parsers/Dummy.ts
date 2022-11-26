/* eslint-disable no-underscore-dangle */

import { Transform, TransformCallback } from 'node:stream';
import { Formidable, IFormidableOptions } from '../types';

class DummyParser extends Transform {
  globalOptions: Partial<IFormidableOptions> | null;
  incomingForm: Formidable;

  constructor(incomingForm: Formidable, options: Partial<IFormidableOptions> = {}) {
    super();
    this.globalOptions = { ...options };
    this.incomingForm = incomingForm;
  }

  override _flush(callback: TransformCallback) {
    this.incomingForm.ended = true;
    this.incomingForm._maybeEnd();
    callback();
  }
}

export default DummyParser;
