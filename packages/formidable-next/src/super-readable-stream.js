import { ReadableStream as WebReadableStream } from 'web-streams-polyfill';

if (!('ReadableStream' in globalThis)) {
  // @ts-ignore
  globalThis.ReadableStream = WebReadableStream;
}

export const SuperReadableStream = ReadableStream;
