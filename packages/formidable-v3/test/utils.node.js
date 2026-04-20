import { Readable } from 'node:stream';

import { createMultipartMessage } from './utils.js';

export function createMultipartRequest(
  boundary,
  parts,
) {
  const body = createMultipartMessage(boundary, parts);

  const request = createReadable(body);
  request.headers = {
    'content-type': `multipart/form-data; boundary=${boundary}`,
  };

  return request;
}

export function createReadable(content, chunkSize = 16 * 1024) {
  let i = 0;

  return new Readable({
    read() {
      if (i < content.length) {
        this.push(content.subarray(i, i + chunkSize));
        i += chunkSize;
      } else {
        this.push(null);
      }
    },
  });
}
