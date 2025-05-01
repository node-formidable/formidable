import SuperHeaders from '@mjackson/headers';

import {
  createPartialTailSearch,
  createSearch,
  type PartialTailSearchFunction,
  type SearchFunction,
} from '../xsrc/buffer-search.ts';
import { readStream } from '../xsrc/read-stream.ts';

export class FormidableError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'FormidableError';
    this.code = code;
  }
}

export type FormidableInputSource =
  | ReadableStream<Uint8Array>
  | Uint8Array
  | Iterable<Uint8Array>
  | AsyncIterable<Uint8Array>;

export interface FormidableOptions {
  boundary: string;
  maxAllHeadersSize: number; // 8kb for all headers
  maxHeaderKeySize: number; // size of the key per each header
  maxHeaderValueSize: number; // size of the value of each header
  maxHeaderSize: number; // 1kb, size of key + value of each header
  maxFilenameSize: number; // size of the file original filename
  maxFileKeySize: number; // size of the key of file fields
  maxFileSize: number; // 100MB
  maxFieldKeySize: number; // size of the key of text fields
  maxFieldSize: number; // size of the value of text fields
  onHandlerError: (err: FormidableError) => void | Promise<void>;
}

const findDoubleNewline = createSearch('\r\n\r\n');

const parseMultipartStateStart = 0;
const parseMultipartStateAfterBoundary = 1;
const parseMultipartStateHeader = 2;
const parseMultipartStateBody = 3;
const parseMultipartStateDone = 4;

interface ParseState {
  state: number;
  buffer: Uint8Array | null;
  bodyController: ReadableStreamDefaultController<Uint8Array> | null;
  bodyLength: number;
}

function createInitialState(): ParseState {
  return {
    state: parseMultipartStateStart,
    buffer: null,
    bodyController: null,
    bodyLength: 0,
  };
}

/**
 * Internal function to process a chunk of data in the multipart stream.
 * It mutates the state and calls the onPart callback for each part found.
 */
async function processChunksWithCallback(
  chunk: Uint8Array,
  state: ParseState,
  settings: {
    findOpeningBoundary: SearchFunction;
    openingBoundaryLength: number;
    findBoundary: SearchFunction;
    findPartialTailBoundary: PartialTailSearchFunction;
    boundaryLength: number;
  },
  options: FormidableOptions,
  onPart: (part: FormidablePart) => void | Promise<void>,
): Promise<void> {
  if (state.state === parseMultipartStateDone) {
    throw new FormidableError('Unexpected data after end of stream', 'ERR_UNEXPECTED_STREAM_END');
  }

  let index = 0;
  let chunkLength = chunk.length;

  if (state.buffer !== null) {
    const newChunk = new Uint8Array(state.buffer.length + chunkLength);
    newChunk.set(state.buffer, 0);
    newChunk.set(chunk, state.buffer.length);
    chunk = newChunk;
    chunkLength = chunk.length;
    state.buffer = null;
  }

  const bodySize = 0;

  while (true) {
    if (state.state === parseMultipartStateBody) {
      if (chunkLength - index < settings.boundaryLength) {
        state.buffer = chunk.subarray(index);
        break;
      }

      const boundaryIndex = settings.findBoundary(chunk, index);

      if (boundaryIndex === -1) {
        const partialTailIndex = settings.findPartialTailBoundary(chunk);

        if (partialTailIndex === -1) {
          // const bodyChunk = chunk.subarray(index);
          // bodySize += state.bodyLength + bodyChunk.length;
          // writeBody(bodyChunk, state, options.maxFileSize);
          writeBody(chunk.subarray(index), state, options.maxFileSize);
        } else {
          // const bodyChunk = chunk.subarray(index, partialTailIndex);
          // bodySize += state.bodyLength + bodyChunk.length;
          // writeBody(bodyChunk, state, options.maxFileSize);
          writeBody(chunk.subarray(index, partialTailIndex), state, options.maxFileSize);
          state.buffer = chunk.subarray(partialTailIndex);
        }

        break;
      }

      // const bodyChunk = chunk.subarray(index, boundaryIndex);
      // bodySize += state.bodyLength + bodyChunk.length;
      // writeBody(bodyChunk, state, options.maxFileSize);
      writeBody(chunk.subarray(index, boundaryIndex), state, options.maxFileSize);
      closeBody(state);

      index = boundaryIndex + settings.boundaryLength;

      state.state = parseMultipartStateAfterBoundary;
    }

    if (state.state === parseMultipartStateAfterBoundary) {
      if (chunkLength - index < 2) {
        state.buffer = chunk.subarray(index);
        break;
      }

      if (chunk[index] === 45 && chunk[index + 1] === 45) {
        state.state = parseMultipartStateDone;
        break;
      }

      index += 2; // Skip \r\n after boundary

      state.state = parseMultipartStateHeader;
    }

    if (state.state === parseMultipartStateHeader) {
      if (chunkLength - index < 4) {
        state.buffer = chunk.subarray(index);
        break;
      }

      const headerEndIndex = findDoubleNewline(chunk, index);

      if (headerEndIndex === -1) {
        if (chunkLength - index > options.maxAllHeadersSize) {
          throw new FormidableError(
            `Multipart headers size exceeds maximum allowed size of ${options.maxAllHeadersSize} bytes`,
            'ERR_MAX_ALL_HEADERS_SIZE',
          );
        }

        state.buffer = chunk.subarray(index);
        break;
      }

      if (headerEndIndex - index > options.maxAllHeadersSize) {
        throw new FormidableError(
          `Multipart headers size exceeds maximum allowed size of ${options.maxAllHeadersSize} bytes`,
          'ERR_MAX_ALL_HEADERS_SIZE',
        );
      }

      const headersRaw = chunk.subarray(index, headerEndIndex);

      // Create a TransformStream instead of a ReadableStream
      // const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
      // const writer = writable.getWriter();

      // // Store the writer in state to write to it later
      // state.bodyController = {
      //   enqueue: (chunk: Uint8Array) => {
      //     writer.write(chunk).catch((err) => {
      //       console.error('Part body writable error writing to stream:', err);
      //     });
      //   },
      //   close: () => {
      //     writer.close().catch((err) => {
      //       console.error('Part body writable error closing stream:', err);
      //     });
      //   },
      //   error: (err: Error) => {
      //     writer.abort(err).catch((err_) => {
      //       console.error('Part body writable error aborting stream:', err_);
      //     });
      //   },
      // } as any;

      // state.bodyLength = 0;

      // const part = new FormidablePart(header, readable, bodySize);

      const part = new FormidablePart(
        headersRaw,
        new ReadableStream({
          start: (controller) => {
            state.bodyController = controller;
            state.bodyLength = 0;
          },
        }),
        bodySize,
      );

      // await checkLimits(part, options);

      // ensure handler returns a promise that we can catch next if handler fails
      // const handler = async () => onPart(part);

      // // no need for await
      // handler().catch((err) =>
      //   options.onHandlerError?.(
      //     new FormidableError(`Error in part handler: ${err?.message}`, 'ERR_PART_HANDLER'),
      //   ),
      // );
      onPart(part);

      index = headerEndIndex + 4; // Skip header + \r\n\r\n
      state.state = parseMultipartStateBody;

      continue;
    }

    if (state.state === parseMultipartStateStart) {
      if (chunkLength < settings.openingBoundaryLength) {
        state.buffer = chunk;
        break;
      }

      if (settings.findOpeningBoundary(chunk) !== 0) {
        throw new FormidableError(
          'Invalid multipart stream: missing initial boundary',
          'ERR_INVALID_BOUNDARY',
        );
      }

      index = settings.openingBoundaryLength;

      state.state = parseMultipartStateAfterBoundary;
    }
  }
}

async function checkLimits(part: FormidablePart, options: FormidableOptions): Promise<void> {
  const hasHeaderLimits =
    options.maxHeaderSize > 0 || options.maxHeaderKeySize > 0 || options.maxHeaderValueSize > 0;

  if (hasHeaderLimits) {
    for (const [headerKey, headerValue] of part.headers.entries()) {
      const header = `${headerKey}: ${headerValue}`.toLowerCase();

      if (header.length > options.maxHeaderSize) {
        throw new FormidableError(
          `Header (${header}) exceeds maximum allowed size of ${options.maxHeaderSize} bytes`,
          'ERR_MAX_HEADER_SIZE',
        );
      }
      if (headerKey.length > options.maxHeaderKeySize) {
        throw new FormidableError(
          `Header key (${headerKey}) exceeds maximum allowed size of ${options.maxHeaderKeySize} bytes`,

          'ERR_MAX_HEADER_KEY_SIZE',
        );
      }

      if (headerValue.length > options.maxHeaderValueSize) {
        throw new FormidableError(
          `Header value (${headerValue}) exceeds maximum allowed size of ${options.maxHeaderValueSize} bytes`,
          'ERR_MAX_HEADER_VALUE_SIZE',
        );
      }
    }
  }

  const isfile = part.isFile();
  const msgName = isfile ? 'File' : 'Field';
  const limitName = isfile ? 'maxFileKeySize' : 'maxFieldKeySize';

  if (part.name.length > options[limitName]) {
    throw new FormidableError(
      `${msgName} key (${part.name}) exceeds maximum allowed size of ${options[limitName]} bytes`,
      'ERR_MAX_FIELD_KEY_SIZE',
    );
  }

  if (part.filename.length > options.maxFilenameSize) {
    throw new FormidableError(
      `Filename exceeds maximum allowed size of ${options.maxFilenameSize} bytes. Filename: ${part.filename}. Field name: ${part.name}`,
      'ERR_MAX_FILENAME_SIZE',
    );
  }

  if (!isfile && (await part.text()).length > options.maxFieldSize) {
    throw new FormidableError(
      `Field value exceeds maximum allowed size of ${options.maxFieldSize} bytes. Field name: ${part.name}`,
      'ERR_MAX_FIELD_SIZE',
    );
  }
}

function writeBody(chunk: Uint8Array, state: ParseState, maxFileSize: number): void {
  if (state.bodyLength + chunk.length > maxFileSize) {
    const error = new FormidableError(
      `File size exceeds maximum allowed size of ${maxFileSize} bytes`,
      'ERR_MAX_FILE_SIZE',
    );
    state.bodyController?.error(error);
    throw error;
  }

  // Always make a copy of the chunk to avoid issues with shared buffer references
  const chunkCopy = new Uint8Array(chunk);
  state.bodyController?.enqueue(chunkCopy);
  state.bodyLength += chunk.length;
}

function closeBody(state: ParseState): void {
  state.bodyController?.close();
  state.bodyController = null;
}

function isIterable<T>(value: unknown): value is Iterable<T> {
  return typeof value === 'object' && value != null && Symbol.iterator in value;
}

function isAsyncIterable<T>(value: unknown): value is AsyncIterable<T> {
  return typeof value === 'object' && value != null && Symbol.asyncIterator in value;
}

export const FormidableDefaultOptions = {
  maxAllHeadersSize: 8 * 1024, // 8kb, size for all headers combined
  maxHeaderKeySize: 255, // size of the key per each header
  maxHeaderSize: 1 * 1024, // 1kb, size of key + value of each header
  maxFilenameSize: 255, // size of the file original filename
  maxFileKeySize: 255, // size of the key of file fields
  maxFileSize: 100 * 1024 * 1024, // 100MB
  maxFieldKeySize: 255, // size of the key of text fields
  maxFieldSize: 100 * 1024, // 100kb, size of each text field value
  onHandlerError: (err: FormidableError) => {},
};

/**
 * Parse a `multipart/*` buffer or stream and yield each part it finds as a `FormidablePart` object.
 *
 * ```ts
 * import { parseMultipart } from '@mjackson/multipart-parser';
 *
 * let boundary = '----WebKitFormBoundaryzv5Z4JY8k9lG0yQW';
 *
 * for await (const part of parseMultipart(message, { boundary })) {
 *   if (part.isFile()) {
 *     console.log(part.filename);
 *
 *     if (part.type.startsWith('text/')) {
 *       let text = await part.text();
 *       // ...
 *     } else {
 *       let buffer = await part.bytes();
 *       // ...
 *     }
 *   } else {
 *     let text = await part.text();
 *     // ...
 *   }
 * }
 * ```
 *
 * Note: This is a low-level API that requires manual handling of the stream and boundary. If you're
 * building a web server, consider using `parseMultipartRequest(request)` instead.
 */
export async function parseMultipart(
  input: FormidableInputSource,
  options: Partial<FormidableOptions> & { boundary: string },
  handler?: (part: FormidablePart) => void | Promise<void>,
) {
  const onPartHandler = typeof handler === 'function' ? handler : () => {};
  const store = createInitialState();
  const opts = {
    ...FormidableDefaultOptions,
    ...options,
  };
  const findOpeningBoundary = createSearch(`--${opts.boundary}`);
  const openingBoundaryLength = 2 + opts.boundary.length; // length of '--' + boundary

  const findBoundary = createSearch(`\r\n--${opts.boundary}`);
  const findPartialTailBoundary = createPartialTailSearch(`\r\n--${opts.boundary}`);
  const boundaryLength = 4 + opts.boundary.length; // length of '\r\n--' + boundary

  const settings = {
    findOpeningBoundary,
    openingBoundaryLength,
    findBoundary,
    findPartialTailBoundary,
    boundaryLength,
  };

  // Process the input and add parts to the queue
  if (input instanceof Uint8Array) {
    await processChunksWithCallback(
      input,
      store,
      settings,
      opts as FormidableOptions,
      onPartHandler,
    );
  } else if (input instanceof ReadableStream) {
    for await (const chunk of readStream(input)) {
      await processChunksWithCallback(
        chunk,
        store,
        settings,
        opts as FormidableOptions,
        onPartHandler,
      );
    }
  } else if (isAsyncIterable(input)) {
    for await (const chunk of input) {
      await processChunksWithCallback(
        chunk,
        store,
        settings,
        opts as FormidableOptions,
        onPartHandler,
      );
    }
  } else if (isIterable(input)) {
    for (const chunk of input) {
      await processChunksWithCallback(
        chunk,
        store,
        settings,
        opts as FormidableOptions,
        onPartHandler,
      );
    }
  } else {
    throw new FormidableError(
      'Cannot parse multipart message; expected a stream or buffer',
      'ERR_INVALID_MULTIPART_MESSAGE',
    );
  }

  if (store.state !== parseMultipartStateDone) {
    throw new FormidableError('Unexpected end of stream', 'ERR_UNEXPECTED_STREAM_END');
  }
}

export async function* parseMultipartAsyncGeneratorWithQueue(
  input: FormidableInputSource,
  options: Partial<FormidableOptions> & { boundary: string },
): AsyncGenerator<FormidablePart, void, void> {
  // Create a shared queue of parts that can be filled by the parser
  // and consumed by the generator
  const partsQueue: FormidablePart[] = [];
  let parsingComplete = false;
  let parsingError: Error | null = null;

  // Create a promise that resolves when a new part is available or parsing is done
  let resolveNextPart: (() => void) | null = null as any;
  const waitForNextPart = () =>
    new Promise<void>((resolve) => {
      resolveNextPart = resolve;
    });

  // Start parsing in a separate promise
  const parsingPromise = (async () => {
    try {
      const store = createInitialState();
      const opts = {
        ...FormidableDefaultOptions,
        ...options,
      };
      const findOpeningBoundary = createSearch(`--${opts.boundary}`);
      const openingBoundaryLength = 2 + opts.boundary.length; // length of '--' + boundary

      const findBoundary = createSearch(`\r\n--${opts.boundary}`);
      const findPartialTailBoundary = createPartialTailSearch(`\r\n--${opts.boundary}`);
      const boundaryLength = 4 + opts.boundary.length; // length of '\r\n--' + boundary

      const settings = {
        findOpeningBoundary,
        openingBoundaryLength,
        findBoundary,
        findPartialTailBoundary,
        boundaryLength,
      };

      const onPartHandler = (part) => {
        partsQueue.push(part);
        if (resolveNextPart) resolveNextPart();
      };

      // Process the input and add parts to the queue
      if (input instanceof Uint8Array) {
        await processChunksWithCallback(
          input,
          store,
          settings,
          opts as FormidableOptions,
          onPartHandler,
        );
      } else if (input instanceof ReadableStream) {
        for await (const chunk of readStream(input)) {
          await processChunksWithCallback(
            chunk,
            store,
            settings,
            opts as FormidableOptions,
            onPartHandler,
          );
        }
      } else if (isAsyncIterable(input) || isIterable(input)) {
        for await (const chunk of input) {
          await processChunksWithCallback(
            chunk,
            store,
            settings,
            opts as FormidableOptions,
            onPartHandler,
          );
        }
      } else {
        throw new FormidableError(
          'Cannot parse multipart message; expected a stream or buffer',
          'ERR_INVALID_MULTIPART_MESSAGE',
        );
      }

      if (store.state !== parseMultipartStateDone) {
        throw new FormidableError('Unexpected end of stream', 'ERR_UNEXPECTED_STREAM_END');
      }

      parsingComplete = true;
      if (resolveNextPart) resolveNextPart();
    } catch (err) {
      parsingError = err as Error;
      if (resolveNextPart) resolveNextPart();
    }
  })();

  // Yield parts from the queue as they become available
  while (!parsingComplete || partsQueue.length > 0) {
    if (partsQueue.length === 0) {
      // Wait for more parts or end of parsing
      await waitForNextPart();

      if (parsingError) throw parsingError;
      if (parsingComplete && partsQueue.length === 0) break;
    }

    const part = partsQueue.shift()!;
    yield part;
  }

  // Wait for parsing to complete
  await parsingPromise;
}

// export async function parse(
//   input: FormidableInputSource,
//   options: Partial<FormidableOptions> & { boundary: string },
//   handler?: (part: FormidablePart) => void | Promise<void>,
// ) {
//   for await (const part of parseMultipart(input, options)) {
//     if (handler) {
//       await handler(part);
//     }
//   }
// }

/**
 * A part of a `multipart/*` HTTP message.
 */
export class FormidablePart {
  #headersRaw: Uint8Array;
  #bodyRaw: ReadableStream<Uint8Array>;
  #headers?: SuperHeaders;
  #bodyUsed = false;
  #bodySize: number;

  constructor(headersRaw: Uint8Array, bodyRaw: ReadableStream<Uint8Array>, bodySize: number) {
    this.#headersRaw = headersRaw;
    this.#bodyRaw = bodyRaw;
    this.#bodySize = bodySize;
  }

  /**
   * The size of the body of this part in bytes. It's calculated in the process of parsing,
   * keep in mind that it may not be entirely correct.
   */
  get size(): number {
    return this.#bodySize;
  }

  /**
   * The body of this part as a `ReadableStream<Uint8Array>`. In `multipart/form-data` messages, this is useful
   * for streaming the value of files that were uploaded using `<input type="file">` fields.
   */
  get body(): ReadableStream<Uint8Array> {
    return this.#bodyRaw;
  }

  /**
   * Whether the body of this part has been consumed.
   */
  get bodyUsed(): boolean {
    return this.#bodyUsed;
  }

  /**
   * The headers associated with this part.
   */
  get headers(): SuperHeaders {
    if (!this.#headers) {
      this.#headers = new SuperHeaders(new TextDecoder().decode(this.#headersRaw));
    }

    return this.#headers;
  }

  /**
   * The filename of the part, if it is a file upload.
   */
  get filename(): string {
    return this.headers.contentDisposition.preferredFilename || '';
  }

  /**
   * The media type of the part.
   */
  get type(): string {
    return this.headers.contentType.mediaType || (this.filename ? 'application/octet-stream' : '');
  }

  /**
   * The name of the part, usually the `name` of the field in the `<form>` that submitted the request.
   */
  get name(): string {
    return this.headers.contentDisposition.name || '';
  }

  /**
   * The content of file body as a Async Iterable, similar to `part.body` but there's the raw ReadableStream
   */
  async *stream(): AsyncIterable<Uint8Array> {
    if (this.#bodyUsed) {
      throw new FormidableError(
        'Body is already consumed or is being consumed',
        'ERR_BODY_CONSUMED',
      );
    }

    this.#bodyUsed = true;

    try {
      const reader = this.#bodyRaw.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          yield value;
        }
      } finally {
        reader.releaseLock();
      }
    } catch (err) {
      console.error('Error reading stream:', err);
      throw err;
    }
  }

  /**
   * The body of this part buffered into a single `Uint8Array`. In `multipart/form-data` messages, this is useful
   * for reading the value of files that were uploaded using `<input type="file">` fields.
   */
  async bytes(): Promise<Uint8Array> {
    if (this.#bodyUsed) {
      throw new FormidableError(
        'Body is already consumed or is being consumed',
        'ERR_BODY_CONSUMED',
      );
    }

    this.#bodyUsed = true;

    try {
      const reader = this.#bodyRaw.getReader();
      const chunks: Uint8Array[] = [];
      let totalLength = 0;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          totalLength += value.length;
        }
      } finally {
        reader.releaseLock();
      }

      const result = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }

      return result;
    } catch (err) {
      console.error('Error buffering bytes:', err);
      throw err;
    }
  }

  async slice(start: number, end?: number): Promise<Uint8Array> {
    const reader = this.#bodyRaw.getReader();
    const chunks: Uint8Array[] = [];
    let bytesRead = 0;
    let bytesToSkip = start;
    let bytesToCollect = end === undefined ? Infinity : end - start;

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        const chunk = value;

        // Skip bytes before the start
        if (bytesToSkip > 0) {
          const skipAmount = Math.min(bytesToSkip, chunk.length);
          bytesToSkip -= skipAmount;
          // If we skipped the whole chunk, continue to the next one
          if (skipAmount === chunk.length) {
            continue;
          }
          // Otherwise, update the chunk to the part after skipping
          chunk.subarray(skipAmount);
        }

        // Collect bytes within the boundaries
        if (bytesToCollect > 0) {
          const collectAmount = Math.min(bytesToCollect, chunk.length);
          chunks.push(chunk.subarray(0, collectAmount));
          bytesToCollect -= collectAmount;
          bytesRead += collectAmount;

          // If we've collected enough bytes, we can stop
          if (bytesToCollect <= 0) {
            // Cancel the rest of the stream to free up resources
            reader.cancel();
            break;
          }
        }

        // If we've passed the end boundary without collecting enough, stop
        if (end !== undefined && bytesRead >= end - start) {
          reader.cancel();
          break;
        }
      }
    } finally {
      reader.releaseLock();
    }

    // Concatenate the collected chunks into a single Uint8Array
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }

    return result;
  }

  /**
   * The body of the part as a string. In `multipart/form-data` messages, this is useful for reading the value
   * of parts that originated from `<input type="text">` fields.
   *
   * Note: Do not use this for binary data, use `await part.bytes()` or stream `part.body` directly instead.
   */
  async text(failSafe = false): Promise<string> {
    try {
      return new TextDecoder().decode(await this.bytes());
    } catch {
      if (failSafe) {
        console.warn(
          'Failed to parse text for part "%s" field (probably it is a binary file)',
          this.name,
        );
        return '';
      }

      throw new FormidableError(
        `Failed to parse text for part "${this.name}" field (probably it is a binary file)`,
        'ERR_FAILED_TO_PARSE_TEXT',
      );
    }
  }

  async json<T>(failSafe = false): Promise<T | null> {
    try {
      return JSON.parse(await this.text(false)) as T;
    } catch {
      if (failSafe) {
        console.warn('Failed to parse json for part "%s" field', this.name);
        return null;
      }

      throw new FormidableError(
        `Failed to parse json for part "${this.name}" field`,
        'ERR_FAILED_TO_PARSE_JSON',
      );
    }
  }

  /**
   * True if this part originated from a file upload.
   */
  isFile(): boolean {
    // We check for filename first as it's a stronger indicator for multipart/form-data
    // For other multipart types, application/octet-stream might be the only hint.
    return Boolean(this.filename != '' || this.type === 'application/octet-stream');
  }

  toString(): string {
    const obj = this.toObject();
    return JSON.stringify(obj, null, 2);
  }

  toObject(): {
    isFile: boolean;
    name: string;
    type: string;
    size: number;
    filename: string;
    headers: Record<string, string>;
  } {
    return {
      isFile: this.isFile(),
      name: this.name,
      type: this.type,
      size: this.size,
      filename: this.filename,
      headers: Object.fromEntries(
        [...this.headers.entries()].map(([key, value]) => [key.toLowerCase(), value.toLowerCase()]),
      ),
    };
  }
}
