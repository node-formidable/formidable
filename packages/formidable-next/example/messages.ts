export function concat(chunks: Uint8Array[]): Uint8Array {
  if (chunks.length === 1) {
    return chunks[0] as Uint8Array;
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

// export function getRandomBytes(size: number): Uint8Array {
//   let chunks: Uint8Array[] = [];

//   for (let i = 0; i < size; i += 65536) {
//     // chunks.push(crypto.getRandomValues(new Uint8Array(Math.min(size - i, 65536))));
//     chunks.push(new TextEncoder().encode('sasasasasasasasa'));
//   }

//   return concat(chunks);
// }

const NodeDefaultHighWaterMark = 65_536;

export class MultipartMessage {
  boundary: string;
  content: Uint8Array;

  constructor(boundary: string, partSizes: number[]) {
    this.boundary = boundary;

    const chunks: Uint8Array[] = [];

    function pushString(string: string): void {
      chunks.push(new TextEncoder().encode(string));
    }

    function pushLine(line = ''): void {
      pushString(`${line}\r\n`);
    }

    for (const [i, partSize] of partSizes.entries()) {
      pushLine(`--${boundary}`);
      pushLine(`Content-Disposition: form-data; name="file_field${i}"; filename="file${i}.txt"`);
      pushLine('Content-Type: text/plain');
      pushLine();
      pushString('a'.repeat(partSize));
      // pushString(new TextDecoder('utf-8').decode(getRandomBytes(partSizes[i])));
      // pushString(`hello ${partSizes[i]} world`);
      // chunks.push(getRandomBytes(partSizes[i]));
      pushLine();
    }

    pushString(`--${boundary}--`);

    this.content = concat(chunks);
  }

  * generateChunks(chunkSize = NodeDefaultHighWaterMark): Generator<Uint8Array> {
    // console.log('content size:', { chunkSize, contentSize: this.content.length });

    for (let i = 0; i < this.content.length; i += chunkSize) {
      yield this.content.subarray(i, i + chunkSize);
    }
  }
}

const oneKb = 1024;
const oneMb = 1024 * oneKb;

export const oneSmallFile = new MultipartMessage('----boundary123', [oneKb]);

export const oneLargeFile = new MultipartMessage('----boundary123', [10 * oneMb]);

export const oneHundredSmallFiles = new MultipartMessage(
  '----boundary123',
  Array.from({ length: 100 }).fill(oneKb) as any,
);

export const fiveLargeFiles = new MultipartMessage('----boundary123', [
  10 * oneMb,
  3 * oneMb,
  10 * oneMb,
  50 * oneMb,
  20 * oneMb,
  5 * oneMb,
  20 * oneMb,
  12 * oneMb,
  1 * oneMb,
  10 * oneMb,
  3 * oneMb,
  10 * oneMb,
  50 * oneMb,
  20 * oneMb,
  5 * oneMb,
  20 * oneMb,
  12 * oneMb,
  1 * oneMb,
  10 * oneMb,
  3 * oneMb,
  10 * oneMb,
  50 * oneMb,
  20 * oneMb,
  5 * oneMb,
  20 * oneMb,
  12 * oneMb,
  1 * oneMb,
  10 * oneMb,
  3 * oneMb,
  10 * oneMb,
  50 * oneMb,
  20 * oneMb,
  5 * oneMb,
  20 * oneMb,
  12 * oneMb,
  1 * oneMb,
  10 * oneMb,
  3 * oneMb,
  10 * oneMb,
  50 * oneMb,
  20 * oneMb,
  5 * oneMb,
  20 * oneMb,
  12 * oneMb,
  1 * oneMb,
  10 * oneMb,
  3 * oneMb,
  10 * oneMb,
  50 * oneMb,
  20 * oneMb,
  5 * oneMb,
  20 * oneMb,
  12 * oneMb,
  1 * oneMb,
  10 * oneMb,
  3 * oneMb,
  10 * oneMb,
  50 * oneMb,
  20 * oneMb,
  5 * oneMb,
  20 * oneMb,
  12 * oneMb,
  1 * oneMb,
]);
