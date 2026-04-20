/* eslint-disable require-unicode-regexp */
/* eslint-disable prefer-named-capture-group */
// import { Stream } from 'node:stream';

import * as errors from '../FormidableError.js';
import FormidableError from '../FormidableError.js';
import { FormidableParser } from '../parsers/Multipart.js';

export const SKIP = Symbol('formidable_skipper');

export function _fileName(headerValue) {
  // matches either a quoted-string or a token (RFC 2616 section 19.5.1)
  const m = headerValue.match(/\bfilename=("(.*?)"|([^\s"(),/:;<=>?@[\\\]{}]+))($|;\s)/i);
  if (!m) {
    return;
  }

  const match = m[2] || m[3] || '';
  let filename = match.slice(match.lastIndexOf('\\') + 1);
  filename = filename.replaceAll('%22', '"');
  filename = filename.replaceAll(/&#(\d{4});/g, (_, code) => String.fromCharCode(code));
  return filename;
}

export function concat(chunks) {
  if (chunks.length === 1) {
    return chunks[0];
  }

  let len = 0;
  for (const chunk of chunks) {
    len += chunk.length;
  }

  const result = new Uint8Array(len);
  let offset = 0;

  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

export function pluginMultipart(options = { encoding: 'utf-8' }) {
  if (!options.contentType.includes('multipart/')) {
    return;
  }

  const match = options.contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);

  if (!match) {
    const err = new FormidableError(
      'bad content-type header, no multipart boundary',
      errors.missingMultipartBoundary,
      400,
    );

    options.hooks?.onError?.(err);
    return err;
  }

  let entryChunks = [];
  let entryValue = '';
  let entryName = '';
  let headerField = '';
  let headerValue = '';
  let contentType = '';
  let filename = null;
  let hasFirstChunk = false;
  let magicBytesCheck = false;
  let maxFileSizeCheck = false;
  let maxFilesCount = 1;
  let maxFieldsCount = 1;
  let skip;

  const formData = options.useFormData ? new (options.FormData || FormData)() : null;
  const decoder = new TextDecoder(options.encoding);
  decoder.decode();

  const boundary = match[1] || match[2];
  const parser = new FormidableParser(boundary, options.hooks);

  const onPartData = async (ui8a) => {
    entryValue += decoder.decode(ui8a, { stream: true });
  };

  const appendToFile = async (ui8a) => {
    if (maxFileSizeCheck === SKIP) {
      return;
    }

    if (hasFirstChunk === false) {
      hasFirstChunk = true;

      if (typeof options?.hooks?.onFileFirstChunk === 'function') {
        magicBytesCheck = await options?.hooks?.onFileFirstChunk?.(ui8a, entryName, options);
      }

      if (magicBytesCheck === SKIP) {
        return;
      }
    }

    function collectFileParts(xyz) {
      return xyz.length === 0 ? ui8a : concat(xyz.flat());
    }

    let skipper = false;
    if (typeof options?.hooks?.onFileProgress === 'function') {
      const fileParts = collectFileParts(entryChunks);
      skipper = await options?.hooks?.onFileProgress?.(fileParts, entryName, options);
    }

    if (skipper === false && options.maxFileSize && options.maxFileSize > 0) {
      const fileParts = collectFileParts(entryChunks);

      if (fileParts.byteLength > options.maxFileSize) {
        skipper = SKIP;
        if (options.errorOnLimits) {
          const err = new FormidableError(
            'File size exceeds maxFileSize',
            errors.biggerThanMaxFileSize,
            400,
          );

          await options.hooks?.onError?.(err);
        }
      }
    }

    if (skipper === SKIP) {
      maxFileSizeCheck = SKIP;
      return;
    }

    entryChunks.push(ui8a);
  };

  const appendFileToFormData = async () => {
    if (skip === SKIP || magicBytesCheck === SKIP || maxFileSizeCheck === SKIP) {
      return;
    }

    if (options.maxFiles && options.maxFiles > 0 && maxFilesCount > options.maxFiles) {
      if (options.errorOnLimits) {
        const err = new FormidableError(
          'Max files count exceeded',
          errors.maxFilesExceeded,
          400,
        );

        await options.hooks?.onError?.(err);
      }
      return;
    }

    // TODO: FormidablePart
    const part = new File(entryChunks, filename, {
      lastModified: Date.now(),
      type: contentType || 'application/octet-stream',
    });

    // const file = new FormidableFile(filename, entryChunks, {
    //   ...options,
    //   type: contentType,
    // });

    if (typeof options?.hooks?.onFile === 'function') {
      skip = await options?.hooks?.onFile?.(entryName, part, options);
    }

    const isArrOrStr = Array.isArray(options.allowedTypes) || typeof options.allowedTypes === 'string';

    if (options.allowedTypes && isArrOrStr && !options.allowedTypes.includes(contentType)) {
      skip = SKIP;

      if (options.errorOnLimits) {
        const err = new FormidableError(
          'File type not allowed',
          errors.general,
          400,
        );

        await options.hooks?.onError?.(err);
      }
    }

    if (skip === SKIP) {
      return;
    }

    maxFilesCount += 1;
    if (options.useFormData) {
      formData.append(entryName, part);
    }
  };

  const appendEntryToFormData = async () => {
    if (skip === SKIP) {
      return;
    }

    if (options.maxFields && options.maxFields > 0 && maxFieldsCount > options.maxFields) {
      if (options.errorOnLimits) {
        const err = new FormidableError(
          'Max fields count exceeded',
          errors.maxFieldsExceeded,
          400,
        );

        await options.hooks?.onError?.(err);
      }
      return;
    }

    // TODO: FormidablePart
    const part = new Blob([entryValue], {
      lastModified: Date.now(),
      type: contentType || 'text/plain',
    });

    if (typeof options?.hooks?.onField === 'function') {
      skip = await options?.hooks?.onField?.(entryName, part, options);
    }

    if (skip === SKIP) {
      return;
    }

    maxFieldsCount += 1;
    if (options.useFormData) {
      formData.append(entryName, part);
    }
  };

  parser.onPartStart = async () => {
    parser.onPartData = onPartData;
    parser.onPartEnd = appendEntryToFormData;

    headerField = '';
    headerValue = '';
    entryValue = '';
    entryName = '';
    contentType = '';
    filename = null;
    entryChunks = [];
    entryChunks.length = 0;
  };

  parser.onHeaderField = (ui8a) => {
    headerField += decoder.decode(ui8a, { stream: true });
  };

  parser.onHeaderValue = (ui8a) => {
    headerValue += decoder.decode(ui8a, { stream: true });
  };

  parser.onHeaderEnd = async () => {
    headerValue += decoder.decode();
    headerField = headerField.toLowerCase();

    if (typeof options?.hooks?.onHeader === 'function') {
      skip = await options?.hooks?.onHeader?.(headerField, headerValue, options);
    }

    if (skip === SKIP) {
      return;
    }

    if (headerField === 'content-disposition') {
      // matches either a quoted-string or a token (RFC 2616 section 19.5.1)
      const hm = headerValue.match(/\bname=("(.*?)"|([^\s"(),/:;<=>?@[\\\]{}]+))($|;\s)/i);

      if (hm) {
        entryName = hm[2] || hm[3] || '';
      }

      filename = _fileName(headerValue);

      if (filename) {
        parser.onPartData = appendToFile;
        parser.onPartEnd = appendFileToFormData;
      } else {
        parser.onPartData = onPartData;
        parser.onPartEnd = appendEntryToFormData;
      }
    } else if (headerField === 'content-type') {
      contentType = headerValue;
    }

    headerValue = '';
    headerField = '';
  };

  return { parser, formData };
}

// export const multipartType = 'multipart';

// the `options` is also available through the `options` / `formidable.options`
// export function multipart(formidable, options) {
//   // the `this` context is always formidable, as the first argument of a plugin
//   // but this allows us to customize/test each plugin

//   /* istanbul ignore next */
//   const self = this || formidable;

//   // NOTE: we (currently) support both multipart/form-data and multipart/related
//   const isMultipart = /multipart/iu.test(self.headers['content-type']);

//   if (isMultipart) {
//     const m = self.headers['content-type'].match(
//       /boundary=(?:"([^"]+)"|([^;]+))/i,
//     );
//     if (m) {
//       const initMultipart = createInitMultipart(m[1] || m[2]);
//       // eslint-disable-next-line prefer-reflect
//       initMultipart.call(self, self, options); // lgtm [js/superfluous-trailing-arguments]
//     } else {
//       const err = new FormidableError(
//         'bad content-type header, no multipart boundary',
//         errors.missingMultipartBoundary,
//         400,
//       );
//       self._error(err);
//     }
//   }

//   return self;
// }

// Note that it's a good practice (but it's up to you) to use the `options` instead
// of the passed `options` (second) param, because when you decide
// to test the plugin you can pass custom `this` context to it (and so `options`)
// function createInitMultipart(boundary) {
//   return function initMultipart() {
//     this.type = multipartType;

//     const parser = new MultipartParser(this.options);
//     let headerField;
//     let headerValue;
//     let part;

//     parser.initWithBoundary(boundary);

//     // eslint-disable-next-line max-statements, consistent-return
//     parser.on('data', async ({
//       buffer, end, name, start,
//     }) => {
//       if (name === 'partBegin') {
//         part = new Stream();
//         part.readable = true;
//         part.headers = {};
//         part.name = null;
//         part.originalFilename = null;
//         part.mimetype = null;

//         part.transferEncoding = options.encoding;
//         part.transferBuffer = '';

//         headerField = '';
//         headerValue = '';
//       } else if (name === 'headerField') {
//         headerField += buffer.toString(options.encoding, start, end);
//       } else if (name === 'headerValue') {
//         headerValue += buffer.toString(options.encoding, start, end);
//       } else if (name === 'headerEnd') {
//         headerField = headerField.toLowerCase();
//         part.headers[headerField] = headerValue;

//         // matches either a quoted-string or a token (RFC 2616 section 19.5.1)
//         const m = headerValue.match(
//           // eslint-disable-next-line no-useless-escape
//           /\bname=("([^"]*)"|([^()<>@,;:\\"/[\]?={}\s]+))/i,
//         );
//         if (headerField === 'content-disposition') {
//           if (m) {
//             part.name = m[2] || m[3] || '';
//           }

//           part.originalFilename = this._getFileName(headerValue);
//         } else if (headerField === 'content-type') {
//           part.mimetype = headerValue;
//         } else if (headerField === 'content-transfer-encoding') {
//           part.transferEncoding = headerValue.toLowerCase();
//         }

//         headerField = '';
//         headerValue = '';
//       } else if (name === 'headersEnd') {
//         switch (part.transferEncoding) {
//           case 'binary':
//           case '7bit':
//           case '8bit':
//           case 'utf-8': {
//             const dataPropagation = (ctx) => {
//               if (ctx.name === 'partData') {
//                 part.emit('data', ctx.buffer.slice(ctx.start, ctx.end));
//               }
//             };
//             const dataStopPropagation = (ctx) => {
//               if (ctx.name === 'partEnd') {
//                 part.emit('end');
//                 parser.off('data', dataPropagation);
//                 parser.off('data', dataStopPropagation);
//               }
//             };
//             parser.on('data', dataPropagation);
//             parser.on('data', dataStopPropagation);
//             break;
//           }
//           case 'base64': {
//             const dataPropagation = (ctx) => {
//               if (ctx.name === 'partData') {
//                 part.transferBuffer += ctx.buffer
//                   .slice(ctx.start, ctx.end)
//                   .toString('ascii');

//                 /*
//                   four bytes (chars) in base64 converts to three bytes in binary
//                   encoding. So we should always work with a number of bytes that
//                   can be divided by 4, it will result in a number of bytes that
//                   can be divided vy 3.
//                   */
//                 const offset = parseInt(part.transferBuffer.length / 4, 10) * 4;
//                 part.emit(
//                   'data',
//                   Buffer.from(
//                     part.transferBuffer.substring(0, offset),
//                     'base64',
//                   ),
//                 );
//                 part.transferBuffer = part.transferBuffer.substring(offset);
//               }
//             };
//             const dataStopPropagation = (ctx) => {
//               if (ctx.name === 'partEnd') {
//                 part.emit('data', Buffer.from(part.transferBuffer, 'base64'));
//                 part.emit('end');
//                 parser.off('data', dataPropagation);
//                 parser.off('data', dataStopPropagation);
//               }
//             };
//             parser.on('data', dataPropagation);
//             parser.on('data', dataStopPropagation);
//             break;
//           }
//           default:
//             return this._error(
//               new FormidableError(
//                 'unknown transfer-encoding',
//                 errors.unknownTransferEncoding,
//                 501,
//               ),
//             );
//         }
//         this._parser.pause();
//         await this.onPart(part);
//         this._parser.resume();
//       } else if (name === 'end') {
//         this.ended = true;
//         this._maybeEnd();
//       }
//     });

//     this._parser = parser;
//   };
// }
