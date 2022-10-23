import { PassThrough } from 'node:stream';
import { IFormidableOptions } from '../types';

class OctetStreamParser extends PassThrough {
  globalOptions: Partial<IFormidableOptions>

  constructor(options: Partial<IFormidableOptions> = {}) {
    super();
    this.globalOptions = { ...options };
  }
}

export default OctetStreamParser;
