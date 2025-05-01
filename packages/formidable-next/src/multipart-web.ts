// SPDX-License-Identifier: MIT

import {
  createPartialTailSearch,
  createSearch,
  type PartialTailSearchFunction,
  type SearchFunction,
} from './buffer-search.ts';
import { SuperHeaders } from './super-headers.js';

export const formidableDefaultOptions: FormidableOptions = {
  maxAllHeadersSize: 8 * 1024, // 8kb, size for all headers combined
  maxHeaderKeySize: 255, // size of the key per each header
  maxHeaderValueSize: 1 * 1024, // size of the key per each header
  maxHeaderSize: 2 * 1024, // 1kb, size of key + value of each header
  maxFilenameSize: 255, // size of the file original filename
  maxFileKeySize: 255, // size of the key of file fields
  maxFileSize: 100 * 1024 * 1024, // 100MB
  maxFieldKeySize: 255, // size of the key of text fields
  maxFieldSize: 100 * 1024, // 100kb, size of each text field value
  onHandlerError: (_err: FormidableError) => {},
};


export type FormidableInputSource =
  | ReadableStream<Uint8Array>
  | Uint8Array
  | Iterable<Uint8Array>
  | AsyncIterable<Uint8Array>;

export interface FormidableOptionsAll {
  boundary: string;
  maxAllHeadersSize?: number; // 8kb for all headers
  maxHeaderKeySize?: number; // size of the key per each header
  maxHeaderValueSize?: number; // size of the value of each header
  maxHeaderSize?: number; // 1kb, size of key + value of each header
  maxFilenameSize?: number; // size of the file original filename
  maxFileKeySize?: number; // size of the key of file fields
  maxFileSize?: number; // 100MB
  maxFieldKeySize?: number; // size of the key of text fields
  maxFieldSize?: number; // size of the value of text fields
  onHandlerError?: (error: FormidableError) => void | Promise<void>;
}

export type FormidableOptions = Omit<FormidableOptionsAll, 'boundary'>;
export type FormidableParserOptions = FormidableOptions;
export type FormidablePartHandler = (part: FormidablePart) => void | Promise<void>;


/**
 * Parse a `multipart/*` buffer or stream and yield each part it finds as a `FormidablePart` object.
 *
 * ```ts
 * import { parseMultipart } from 'formidable';
 *
 * let boundary = '----WebKitFormBoundaryzv5Z4JY8k9lG0yQW';
 *
 * await parseMultipart(message, { boundary }, async (part) => {
 *   if (part.isFile) {
 *     console.log(part.filename);
 *
 *     if (part.mediaType.startsWith('text/')) {
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
 * });
 * ```
 *
 * Note: This is a low-level API that requires manual handling of the stream and boundary. If you're
 * building a web server, consider using `parseMultipartRequest(request)` instead.
 */
export async function parseMultipart(
  message: FormidableInputSource,
  options: FormidableOptionsAll,
  handler: FormidablePartHandler,
): Promise<void> {
  const { boundary, ...opts } = options;
  if (!boundary) {
    throw new FormidableError('Invalid Content-Type header: missing boundary', 'ERR_NO_BOUNDARY');
  }
  const parser = new FormidableParser(boundary, opts as FormidableOptions);

  await parser.parse(message, handler);
}

const findDoubleNewline = createSearch('\r\n\r\n');

const MultipartParserStateStart = 0;
const MultipartParserStateAfterBoundary = 1;
const MultipartParserStateHeader = 2;
const MultipartParserStateBody = 3;
const MultipartParserStateDone = 4;

export class FormidableError extends Error {
  code: string;

  constructor(message: string, code: string = 'ERR_UNKNOWN') {
    super(message);
    this.name = 'FormidableError';
    this.code = code;
  }
}

/**
 * A parser for `multipart/*` HTTP messages.
 */
export class FormidableParser {
  boundary: string;
  options: Required<FormidableOptions>;
  #findOpeningBoundary: SearchFunction;
  #openingBoundaryLength: number;
  #findBoundary: SearchFunction;
  #findPartialTailBoundary: PartialTailSearchFunction;
  #boundaryLength: number;
  #state = MultipartParserStateStart;
  #buffer: Uint8Array | null = null;
  #bodyController: ReadableStreamDefaultController<Uint8Array> | null = null;
  #bodyLength = 0;

  constructor(boundary: string, options?: FormidableOptions) {
    this.boundary = boundary;
    this.options = { ...formidableDefaultOptions, ...options } as Required<FormidableOptions>;

    this.#findOpeningBoundary = createSearch(`--${boundary}`);
    this.#openingBoundaryLength = 2 + boundary.length; // length of '--' + boundary

    this.#findBoundary = createSearch(`\r\n--${boundary}`);
    this.#findPartialTailBoundary = createPartialTailSearch(`\r\n--${boundary}`);
    this.#boundaryLength = 4 + boundary.length; // length of '\r\n--' + boundary
  }

  /**
   * Parse a stream/buffer multipart message and call the given handler for each part it contains.
   * Resolves when the parse is finished and all handlers resolve.
   */
  async parse(message: FormidableInputSource, handler?: FormidablePartHandler): Promise<void> {
    if (this.#state !== MultipartParserStateStart) {
      this.reset();
    }

    const promises: Promise<unknown>[] = [];

    function handlePart(part: FormidablePart): void {
      const result = handler?.(part);
      if (isPromise(result)) {
        promises.push(result);

        // This hack marks the promise as "handled" in Node.js to suppress
        // "unhandledRejection" warnings and avoid crashing the process.
        result.catch(() => {});
      }
    }

    if (message instanceof Uint8Array) {
      await this.write(message, handlePart);
    } else if (message instanceof ReadableStream) {
      for await (const chunk of readStreamHelper(message)) {
        await this.write(chunk, handlePart);
      }
    } else if (isAsyncIterable(message) || isIterable(message)) {
      for await (const chunk of message) {
        await this.write(chunk, handlePart);
      }
    } else {
      throw new FormidableError(
        'Cannot parse multipart message; expected a stream or buffer',
        'ERR_INVALID_INPUT',
      );
    }

    if (this.#state !== MultipartParserStateDone) {
      throw new FormidableError('Unexpected end of stream', 'ERR_UNEXPECTED_END');
    }

    await Promise.all(promises);
  }

  reset(): void {
    this.#state = MultipartParserStateStart;
    this.#buffer = null;
    this.#bodyController = null;
    this.#bodyLength = 0;
  }

  async write(chunk: Uint8Array, handler: FormidablePartHandler): Promise<void> {
    if (this.#state === MultipartParserStateDone) {
      throw new FormidableError(
        'Unexpected data after end of stream',
        'ERR_UNEXPECTED_DATA_AFTER_END',
      );
    }

    let index = 0;
    let chunkLength = chunk.length;

    if (this.#buffer !== null) {
      const newChunk = new Uint8Array(this.#buffer.length + chunkLength);
      newChunk.set(this.#buffer, 0);
      newChunk.set(chunk, this.#buffer.length);
      chunk = newChunk;
      chunkLength = chunk.length;
      this.#buffer = null;
    }

    while (true) {
      if (this.#state === MultipartParserStateBody) {
        if (chunkLength - index < this.#boundaryLength) {
          this.#buffer = chunk.subarray(index);
          break;
        }

        const boundaryIndex = this.#findBoundary(chunk, index);

        if (boundaryIndex === -1) {
          // No boundary found, but there may be a partial match at the end of the chunk.
          const partialTailIndex = this.#findPartialTailBoundary(chunk);

          if (partialTailIndex === -1) {
            this.writeBody(index === 0 ? chunk : chunk.subarray(index));
          } else {
            this.writeBody(chunk.subarray(index, partialTailIndex));
            this.#buffer = chunk.subarray(partialTailIndex);
          }

          break;
        }

        this.writeBody(chunk.subarray(index, boundaryIndex));
        this.closeBody();

        index = boundaryIndex + this.#boundaryLength;

        this.#state = MultipartParserStateAfterBoundary;
      }

      if (this.#state === MultipartParserStateAfterBoundary) {
        if (chunkLength - index < 2) {
          this.#buffer = chunk.subarray(index);
          break;
        }

        if (chunk[index] === 45 && chunk[index + 1] === 45) {
          this.#state = MultipartParserStateDone;
          break;
        }

        index += 2; // Skip \r\n after boundary

        this.#state = MultipartParserStateHeader;
      }

      if (this.#state === MultipartParserStateHeader) {
        if (chunkLength - index < 4) {
          this.#buffer = chunk.subarray(index);
          break;
        }

        const headerEndIndex = findDoubleNewline(chunk, index);

        if (headerEndIndex === -1) {
          if (chunkLength - index > this.options.maxAllHeadersSize) {
            throw new FormidableError(
              `Multipart headers size exceeds maximum allowed size of ${this.options.maxAllHeadersSize} bytes`,
              'ERR_MAX_ALL_HEADERS_SIZE',
            );
          }

          this.#buffer = chunk.subarray(index);
          break;
        }

        if (headerEndIndex - index > this.options.maxAllHeadersSize) {
          throw new FormidableError(
            `Multipart headers size exceeds maximum allowed size of ${this.options.maxAllHeadersSize} bytes`,
            'ERR_MAX_ALL_HEADERS_SIZE',
          );
        }

        const header = chunk.subarray(index, headerEndIndex);
        const part = new FormidablePart(
          header,
          new ReadableStream({
            start: (controller) => {
              this.#bodyController = controller;
              this.#bodyLength = 0;
            },
          }),
        );

        await this.checkLimits(part);
        handler(part);

        index = headerEndIndex + 4; // Skip header + \r\n\r\n

        this.#state = MultipartParserStateBody;

        continue;
      }

      if (this.#state === MultipartParserStateStart) {
        if (chunkLength < this.#openingBoundaryLength) {
          this.#buffer = chunk;
          break;
        }

        if (this.#findOpeningBoundary(chunk) !== 0) {
          throw new FormidableError(
            'Invalid multipart stream: missing initial boundary',
            'ERR_NO_BOUNDARY',
          );
        }

        index = this.#openingBoundaryLength;

        this.#state = MultipartParserStateAfterBoundary;
      }
    }
  }

  async checkLimits(part: FormidablePart): Promise<void> {
    const hasHeaderLimits =
      this.options.maxHeaderSize > 0 ||
      this.options.maxHeaderKeySize > 0 ||
      this.options.maxHeaderValueSize > 0;

    if (hasHeaderLimits) {
      for (const [headerKey, headerValue] of part.headers.entries()) {
        const header = `${headerKey}: ${headerValue}`.toLowerCase();

        if (header.length > this.options.maxHeaderSize) {
          throw new FormidableError(
            `Header (${header}) exceeds maximum allowed size of ${this.options.maxHeaderSize} bytes`,
            'ERR_MAX_HEADER_SIZE',
          );
        }
        if (headerKey.length > this.options.maxHeaderKeySize) {
          throw new FormidableError(
            `Header key (${headerKey}) exceeds maximum allowed size of ${this.options.maxHeaderKeySize} bytes`,
            'ERR_MAX_HEADER_KEY_SIZE',
          );
        }

        if (headerValue.length > this.options.maxHeaderValueSize) {
          throw new FormidableError(
            `Header value (${headerValue}) exceeds maximum allowed size of ${this.options.maxHeaderValueSize} bytes`,
            'ERR_MAX_HEADER_VALUE_SIZE',
          );
        }
      }
    }

    const isfile = typeof part.isFile === 'function' ? part.isFile() : part.isFile;
    const limitName = isfile ? 'maxFileKeySize' : 'maxFieldKeySize';

    if (part.name && part.name.length > this.options[limitName]) {
      throw new FormidableError(
        `${isfile ? 'File' : 'Field'} key (${part.name}) exceeds maximum allowed size of ${this.options[limitName]} bytes`,
        'ERR_MAX_FIELD_KEY_SIZE',
      );
    }

    if (part.filename && part.filename.length > this.options.maxFilenameSize) {
      throw new FormidableError(
        `Filename exceeds maximum allowed size of ${this.options.maxFilenameSize} bytes. Filename: ${part.filename}. Field name: ${part.name}`,
        'ERR_MAX_FILENAME_SIZE',
      );
    }

    if (!isfile && (await part.text()).length > this.options.maxFieldSize) {
      throw new FormidableError(
        `Field value exceeds maximum allowed size of ${this.options.maxFieldSize} bytes. Field name: ${part.name}`,
        'ERR_MAX_FIELD_SIZE',
      );
    }
  }

  writeBody(chunk: Uint8Array): void {
    if (this.#bodyLength + chunk.length > this.options.maxFileSize) {
      const error = new FormidableError(
        `File size exceeds maximum allowed size of ${this.options.maxFileSize} bytes`,
        'ERR_MAX_FILE_SIZE',
      );
      this.#bodyController?.error(error);
      throw error;
    }

    this.#bodyController?.enqueue(chunk);
    this.#bodyLength += chunk.length;
  }

  closeBody(): void {
    this.#bodyController?.close();
    this.#bodyController = null;
  }
}

/**
 * A part of a `multipart/*` HTTP message.
 */
export class FormidablePart {
  #headersRaw: Uint8Array;
  #bodyRaw: ReadableStream<Uint8Array>;
  #headers?: SuperHeaders;
  #bodyUsed = false;

  constructor(headersRaw: Uint8Array, bodyRaw: ReadableStream<Uint8Array>) {
    this.#headersRaw = headersRaw;
    this.#bodyRaw = bodyRaw;
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
   * True if this part originated from a file upload.
   */
  isFile(): boolean {
    return Boolean(this.filename != '' || this.type === 'application/octet-stream');
  }

  /**
   * Create a stream of the part's body as async iterable, the `part.body` is the raw ReadableStream
   */
  async *stream(): AsyncIterable<Uint8Array> {
    if (this.#bodyUsed) {
      throw new FormidableError(
        'Body is already consumed or is being consumed',
        'ERR_BODY_CONSUMED',
      );
    }

    this.#bodyUsed = true;

    for await (const chunk of readStreamHelper(this.#bodyRaw)) {
      yield chunk;
    }
  }

  /**
   * The content of this part as an `ArrayBuffer`.
   */
  async arrayBuffer(): Promise<ArrayBuffer> {
    return (await this.bytes()).buffer as ArrayBuffer;
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

    const chunks: Uint8Array[] = [];
    let totalLength = 0;
    for await (const chunk of readStreamHelper(this.#bodyRaw)) {
      chunks.push(chunk);
      totalLength += chunk.length;
    }

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

  /**
   * Parses the JSON content of the part. It may fail or throw if the content cannot be parsed.
   *
   * @param failSafe If true, will not throw an error on failure to parse.
   * @returns The parsed JSON object or null if failSafe is true and parsing fails.
   */
  async json<T>(failSafe = false): Promise<T | null> {
    try {
      // intentionally force failSafe=false, so that either .text() or JSON.parse throw
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

  toString(): string {
    const obj = this.toObject();
    return JSON.stringify(obj, null, 2);
  }

  toObject(): {
    isFile: boolean;
    name: string;
    type: string;
    // size: number;
    filename: string;
    headers: Record<string, string>;
  } {
    return {
      isFile: this.isFile(),
      name: this.name,
      type: this.type,
      // size: this.size,
      filename: this.filename,
      headers: Object.fromEntries(
        [...this.headers.entries()].map(([key, value]) => [key.toLowerCase(), value.toLowerCase()]),
      ),
    };
  }
}

export async function* readStreamHelper(
  stream: ReadableStream<Uint8Array>,
): AsyncIterable<Uint8Array> {
  const reader = stream.getReader();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      yield value;
    }
  } finally {
    reader.releaseLock();
  }
}

function isIterable<T>(value: unknown): value is Iterable<T> {
  return typeof value === 'object' && value != null && Symbol.iterator in value;
}

function isAsyncIterable<T>(value: unknown): value is AsyncIterable<T> {
  return typeof value === 'object' && value != null && Symbol.asyncIterator in value;
}

function isPromise<T>(value: unknown): value is Promise<T> {
  return typeof value === 'object' && value != null && typeof (value as any).then === 'function';
}
