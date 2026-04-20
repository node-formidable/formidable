import SuperHeaders from '@mjackson/headers';

export function createMultipartMessage(
  boundary,
  parts,
) {
  const chunks = [];

  function pushString(string) {
    chunks.push(new TextEncoder().encode(string));
  }

  function pushLine(line = '') {
    pushString(`${line}\r\n`);
  }

  if (parts) {
    for (const [name, value] of Object.entries(parts)) {
      pushLine(`--${boundary}`);

      if (typeof value === 'string') {
        const headers = new SuperHeaders({
          contentDisposition: {
            name,
            type: 'form-data',
          },
        });

        pushLine(`${headers}`);
        pushLine();
        pushLine(value);
      } else {
        const headers = new SuperHeaders({
          contentDisposition: {
            filename: value.filename,
            filenameSplat: value.filenameSplat,
            name,
            type: 'form-data',
          },
        });

        if (value.mediaType || value.contentType) {
          headers.contentType = value.mediaType || value.contentType;
        }

        pushLine(`${headers}`);
        pushLine();
        if (typeof value.content === 'string') {
          pushLine(value.content);
        } else {
          chunks.push(value.content);
          pushLine();
        }
      }
    }
  }

  pushString(`--${boundary}--`);

  return concat(chunks);
}

export function getRandomBytes(size) {
  const chunks = [];

  for (let i = 0; i < size; i += 65536) {
    chunks.push(crypto.getRandomValues(new Uint8Array(Math.min(size - i, 65536))));
  }

  return concat(chunks);
}

export function concat(chunks) {
  if (chunks.length === 1) {
    return chunks[0];
  }

  let length = 0;
  for (const chunk of chunks) {
    length += chunk.length;
  }

  const result = new Uint8Array(length);
  let offset = 0;

  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}
