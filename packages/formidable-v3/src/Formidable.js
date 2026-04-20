/* eslint-disable max-statements */
/* eslint-disable class-methods-use-this */
/* eslint-disable no-underscore-dangle */

import { init as cuid2init } from '@paralleldrive/cuid2';
// import dezalgo from 'dezalgo';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
// import fsPromises from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { StringDecoder } from 'node:string_decoder';
// import once from 'once';

import FormidableError, * as errors from './FormidableError.js';
// import { FormidableParser } from './parsers/Multipart.js';
import PersistentFile from './PersistentFile.js';
import { pluginMultipart } from './plugins/multipart.js';
import VolatileFile from './VolatileFile.js';

const CUID2_FINGERPRINT = `${process.env.NODE_ENV}-${os.platform()}-${os.hostname()}`;
const createId = cuid2init({ fingerprint: CUID2_FINGERPRINT.toLowerCase(), length: 25 });

const oneMb = 1024 * 1024;
const maxFiles = 100;
const maxFileSize = 100 * oneMb;
const maxTotalFileSize = maxFiles * maxFileSize;

const DEFAULT_OPTIONS = {
  allowEmptyFiles: false,
  createDirsFromUploads: false,
  // defaultInvalidName: 'invalid-name',
  // enabledPlugins: [],
  encoding: 'utf-8',
  filename: undefined,
  rename: undefined,
  fileWriteStreamHandler: null,
  hashAlgorithm: false,
  keepExtensions: false,
  maxFiles,
  maxFields: 50,
  maxFileSize,
  // ?note: (maxFiles * maxFileSize),
  // ?note2: should be plural - maxTotalFilesSize?
  // ?note3: weird option in general
  maxTotalFileSize,
  maxFieldsSize: 1 * 1024 * 1024, // todo: think about it, it's the total size of all fields?
  minFileSize: 1,
  uploadDir: os.tmpdir(),
  useFormData: false,
  useFile: false,
  useBlob: false,
  persist: true,
  randomName: true,
  cwd: process.cwd(),
  // todo: patch to use the hooks system's `SKIP` mechanism
  filter(_part) {
    return true;
  },
};

// function hasOwnProp(obj, key) {
//   return Object.hasOwn(obj, key);
// }

// function decorateForceSequential(promiseCreator) {
//   /* forces a function that returns a promise to be sequential
//   useful for fs  for example */
//   let lastPromise = Promise.resolve();

//   return async function decoarator(...x) {
//     const promiseWeAreWaitingFor = lastPromise;
//     let currentPromise;
//     let callback;
//     // we need to change lastPromise before await anything,
//     // otherwise 2 calls might wait the same thing
//     lastPromise = new Promise((resolve) => {
//       callback = resolve;
//     });
//     await promiseWeAreWaitingFor;
//     currentPromise = promiseCreator(...x);
//     currentPromise.then(callback).catch(callback);
//     return currentPromise;
//   };
// }

// const createNecessaryDirectoriesAsync = decorateForceSequential((filePath) => {
//   const directoryname = path.dirname(filePath);

//   return fsPromises.mkdir(directoryname, { recursive: true });
// });

// function invalidExtensionChar(c) {
//   const code = c.charCodeAt(0);

//   return !(
//     code === 46 // .
//     || (code >= 48 && code <= 57)
//     || (code >= 65 && code <= 90)
//     || (code >= 97 && code <= 122)
//   );
// }

class IncomingForm extends EventEmitter {
  constructor(options = {}) {
    super();

    this.options = { ...DEFAULT_OPTIONS, ...options };

    // ?note: deprecate `options.filename` in favor of `options.rename`
    this.options.rename = this.options.rename || this.options.filename;

    // ?note: if user choose FormData = true:
    // ?      - will get `FormData` object in `parse` return, and in the callback if provided
    // ?      - events API will emit 'file' with `File` object, and `field` with `Blob` object
    // ?      - hooks API will receive `File` object in `onFile` and `Blob` object in `onField`
    this.options.useFile = this.options.useFormData ? true : this.options.useFile;
    this.options.useBlob = this.options.useFormData ? true : this.options.useBlob;

    const uploadFolder = this.options.uploadDir || this.options.uploaddir || os.tmpdir();
    const uploadDir = path.resolve(this.options.cwd, uploadFolder);

    this.uploadDir = uploadDir;

    // ?note: if user goes with defaults (persit: true and no fileWriteStreamHandler)
    // ?      - we create a writable stream to the uploadDir with the "new filename"
    // ?      - if user provides a fileWriteStreamHandler, we use his in our internal onFileHook later
    // ?      - if user provides `persist: false` we don't create internal writable stream,
    // ?          + they can either use the fileWriteStreamHandler or the File/Blob API or FormData API depending what they choose
    this.options.fileWriteStreamHandler = typeof this.options.fileWriteStreamHandler === 'function' ? this.options.fileWriteStreamHandler : null;

    // ?note: set persist:false if they provide writable stream handler (in case they forget to set it to false themselves)
    this.options.persist = this.options.fileWriteStreamHandler === null;

    if (this.options.persist === true && this.options.fileWriteStreamHandler === null) {
      this.options.fileWriteStreamHandler = (file) => fs.createWriteStream(path.join(
        this.uploadDir,
        // ?note: if user provides `useFile: true`, then the `file.newFilename` is non-existent,
        // ?      so we generate a random name (if randomName:true which is default) or use the original file name (file.name)
        // ?    if `useFile: false` (default) we already set file.newFilename on our internal onFileHook later
        file.newFilename || (this.options.randomName ? createId() : file.name),
      ));
    }

    // initialize with null
    // [
    //   'error',
    //   'headers',
    //   'type',
    //   'bytesExpected',
    //   'bytesReceived',
    //   '_parser',
    //   'req',
    // ].forEach((key) => {
    //   this[key] = null;
    // });
    this.bytesReceived = 0;
    this.bytesExpected = 0;

    // this._flushing = 0;
    // this._fieldsSize = 0;
    // this._totalFileSize = 0;
    // this._plugins = [];
    // this.openedFiles = [];

    // this.options.enabledPlugins = []
    //   .concat(this.options.enabledPlugins)
    //   .filter(Boolean);

    // if (this.options.enabledPlugins.length === 0) {
    //   throw new FormidableError(
    //     'expect at least 1 enabled builtin plugin, see options.enabledPlugins',
    //     errors.missingPlugin,
    //   );
    // }

    // this.options.enabledPlugins.forEach((plugin) => {
    //   this.use(plugin);
    // });

    this._setUpRename();
    this._setUpMaxFields();
    this._setUpMaxFiles();
    // this.ended = undefined;
    // this.type = undefined;
  }

  // use(plugin) {
  //   if (typeof plugin !== 'function') {
  //     throw new FormidableError(
  //       '.use: expect `plugin` to be a function',
  //       errors.pluginFunction,
  //     );
  //   }
  //   this._plugins.push(plugin.bind(this));
  //   return this;
  // }

  // pause() {
  //   try {
  //     this.req.pause();
  //   } catch (err) {
  //     // the stream was destroyed
  //     if (!this.ended) {
  //       // before it was completed, crash & burn
  //       this._error(err);
  //     }
  //     return false;
  //   }
  //   return true;
  // }

  // resume() {
  //   try {
  //     this.req.resume();
  //   } catch (err) {
  //     // the stream was destroyed
  //     if (!this.ended) {
  //       // before it was completed, crash & burn
  //       this._error(err);
  //     }
  //     return false;
  //   }

  //   return true;
  // }

  async parse(req, headers) {
    let callback;

    if (typeof headers === 'function') {
      callback = headers;
      headers = null;
    }

    const _heads = headers || this.options.headers || req.headers;
    const contentType = _heads?.get?.('content-type') || _heads['content-type'];
    const bytesExpected = _heads?.get?.('content-length') || _heads['content-length'] || 0;

    this.bytesExpected = parseInt(bytesExpected, 10) || 0;

    if (!contentType) {
      const err = new FormidableError(
        'bad content-type header, no content-type',
        errors.missingContentType,
        400,
      );

      if (typeof callback === 'function') {
        callback(err);
        return;
      }

      throw err;
    }

    // this.type = contentType.split(';')[0].toLowerCase();
    const fields = {};
    const files = {};

    // if it's not multipart, we "fail silently" we should not crash their process, probably something else is handling other content types
    if (!contentType.includes('multipart')) {
      if (typeof callback === 'function') {
        callback(null, ...(this.options.useFormData ? [new FormData()] : [fields, files]));
        return;
      }

      return this.options.useFormData ? new FormData() : [fields, files];
    }

    // let resolveRef;
    // let rejectRef;

    // const promise = new Promise((resolve, reject) => {
    //   resolveRef = resolve;
    //   rejectRef = reject;
    // });

    // this.on('field', (name, value) => {
    //   if (this.type === 'multipart' || this.type === 'urlencoded') {
    //     if (!hasOwnProp(this.fields, name)) {
    //       this.fields[name] = [value];
    //     } else {
    //       this.fields[name].push(value);
    //     }
    //   } else {
    //     this.fields[name] = value;
    //   }
    // });

    // this.on('file', (name, file) => {
    //   if (!hasOwnProp(this.files, name)) {
    //     this.files[name] = [file];
    //   } else {
    //     this.files[name].push(file);
    //   }
    // });

    // this.on('error', (err) => {
    //   rejectRef(err);
    // });
    // this.on('end', () => {
    //   resolveRef({ fields: this.fields, files: this.files });
    // });

    const { hooks } = this.options;

    // backup user defined, if any
    const onErrorHook = hooks?.onError;
    const onFieldHook = hooks?.onField;
    const onFileHook = hooks?.onFile;
    const onFileFirstChunkHook = hooks?.onFileFirstChunk;

    let called = false;
    const callbackHandler = (err) => {
      if (called) {
        return;
      }
      called = true;

      // eslint-disable-next-line node/callback-return
      callback?.(err);
    };

    const onErrorHandler = (err) => {
      this.emit('error', err);

      callbackHandler(err);
      return onErrorHook?.(err);
    };

    const { parser, formData } = pluginMultipart({
      contentType,
      hooks: {
        ...hooks,
        onError(err) {
          return onErrorHandler(err);
        },

        onFileFirstChunk(chunk, opts) {
          this.emit('magicBytes', chunk, opts);
          this.emit('fileFirstChunk', chunk, opts);

          return onFileFirstChunkHook?.(chunk, opts);
        },

        async onField(key, val) {
          const blob = this.options.useBlob
            ? val
            : await val.text();

          if (this.options.useFormData === false) {
            if (key in fields) {
              if (Array.isArray(fields[key])) {
                fields[key].push(blob);
              } else {
                fields[key] = [fields[key], blob];
              }
            } else {
              fields[key] = [blob];
            }
          }

          this.emit('field', key, blob, val);

          return onFieldHook?.(key, blob, val);
        },

        async onFile(key, val) {
          // ?NOTE: normalize and make it semi-compatible with the old behavior
          const file = this.options.useFile
            ? val
            : {
                size: val.size,
                originalFilename: val.name,
                mimetype: val.type,
                type: val.type,
                lastModified: val.lastModified,
                mtime: new Date(val.lastModified),
                async stream() {
                  return val.stream();
                },
                async text() {
                  return val.text();
                },
                async arrayBuffer() {
                  return val.arrayBuffer();
                },
                async bytes() {
                  const buffer = await val.arrayBuffer();

                  return new Uint8Array(buffer);
                },
              };

          // ?note: just use web File API... please. And do create your "new filenames" manually with whatever library you want
          if (this.options.useFile === false) {
            file.newFilename = typeof this.options.rename === 'function'
              ? await this.options.rename(val.name)
              : this.options.randomName
                ? createId()
                : (file.originalFilename || file.name);

            file.filepath = path.join(this.uploadDir, file.newFilename);
            file.hashAlgorithm = this.options.hashAlgorithm || '';
            file.hash = '';
          }

          // ?NOTE: normalization to the old behavior, for the objects/callback/promise API
          if (this.options.useFormData === false) {
            if (key in files) {
              if (Array.isArray(files[key])) {
                files[key].push(file);
              } else {
                files[key] = [files[key], file];
              }
            } else {
              files[key] = [file];
            }
          }

          // // ?note: defaults to true to match the old behavior
          // let persist = this.options.persist;

          // // ?NOTE: file streaming API
          // // ?      - we use the fileWriteeStreamHandler internally to mimic the old behavior of always writing to disk
          // if (persist) {
          //   this.options.fileWriteStreamHandler = (_) => fs.createWriteStream(path.join(this.uploadDir, val.name));
          // }

          // ?NOTE: file streaming API
          // ?NOTE: if user want to stream the file elsewhere, and they use the fileWriteStreamHandler,
          // ?      we call it and get their writable stream and write the file to it
          if (this.options.fileWriteStreamHandler) {
            const writeStream = this.options.fileWriteStreamHandler?.(file);
            writeStream.on('error', (err) => onErrorHandler(err));

            for await (const chunk of file.stream()) {
              writeStream.write(chunk);
            }

            // ?NOTE: should we manually close?
            if (this.options.forceCloseWriteStream) {
              writeStream.end();
            }
          }

          // ?NOTE: events API
          this.emit('file', key, file, val);

          // ?NOTE: hooks API
          return onFileHook?.(key, file, val);
        },
      },
    });

    try {
      for await (const chunk of req) {
        // const data = new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength);

        this.bytesReceived += chunk.byteLength;
        this.emit('progress', this.bytesReceived, this.bytesExpected);

        await parser.write(chunk);
      }
    } catch (err) {
      this.emit('error', err);

      if (typeof callback === 'function') {
        callback(err);
        return;
      }
      throw err;
    }

    const result = [fields, files];

    if (typeof callback === 'function') {
      callback(null, ...(this.options.useFormData ? [formData] : [result]));
      return;
    }

    return this.options.useFormData ? formData : result;
  }

  // returns a promise if no callback is provided
  // async parse(req, cb) {
  //   let promise;

  //   // Setup callback first, so we don't miss anything from data events emitted immediately.
  //   if (!cb) {
  //     let resolveRef;
  //     let rejectRef;
  //     promise = new Promise((resolve, reject) => {
  //       resolveRef = resolve;
  //       rejectRef = reject;
  //     });
  //     cb = (err, fields, files) => {
  //       if (err) {
  //         rejectRef(err);
  //       } else {
  //         resolveRef([fields, files]);
  //       }
  //     };
  //   }
  //   const callback = once(dezalgo(cb));
  //   this.fields = {};
  //   const files = {};

  //   this.on('field', (name, value) => {
  //     if (this.type === 'multipart' || this.type === 'urlencoded') {
  //       if (!hasOwnProp(this.fields, name)) {
  //         this.fields[name] = [value];
  //       } else {
  //         this.fields[name].push(value);
  //       }
  //     } else {
  //       this.fields[name] = value;
  //     }
  //   });

  //   this.on('file', (name, file) => {
  //     if (!hasOwnProp(files, name)) {
  //       files[name] = [file];
  //     } else {
  //       files[name].push(file);
  //     }
  //   });
  //   this.on('error', (err) => {
  //     callback(err, this.fields, files);
  //   });
  //   this.on('end', () => {
  //     callback(null, this.fields, files);
  //   });

  //   // Parse headers and setup the parser, ready to start listening for data.
  //   // await this.writeHeaders(req.headers);

  //   const headers = this.options.headers || req.headers;
  //   const contentType = headers?.get?.('content-type') || headers['content-type'];
  //   const bytesExpected = headers?.get?.('content-length') || headers['content-length'] || 0;
  //   this.bytesExpected = parseInt(bytesExpected, 10) || 0;

  //   if (!contentType) {
  //     this._error(
  //       new FormidableError(
  //         'bad content-type header, no content-type',
  //         errors.missingContentType,
  //         400,
  //       ),
  //     );

  //     return;
  //   }

  //   this._parser = pluginMultipart(this, { ...this.options, contentType });
  //   this._parser.once('error', (error) => {
  //     this._error(error);
  //   });

  //   try {
  //     for await (const chunk of req) {
  //       try {
  //         this.write(chunk);
  //       } catch (err) {
  //         this._error(err);
  //       }
  //     }
  //   } catch (err) {
  //     this._error(err);
  //   }

  //   // Start listening for data.
  //   // req
  //   //   .on('error', (err) => {
  //   //     this._error(err);
  //   //   })
  //   //   .on('aborted', () => {
  //   //     this.emit('aborted');
  //   //     this._error(new FormidableError('Request aborted', errors.aborted));
  //   //   })
  //   //   .on('data', (buffer) => {
  //   //     try {
  //   //       // console.log('data', buffer);
  //   //       this.write(buffer);
  //   //     } catch (err) {
  //   //       console.log('error', err);
  //   //       this._error(err);
  //   //     }
  //   //   })
  //   //   .on('end', () => {
  //   //     // if (this.error) {
  //   //     //   return;
  //   //     // }
  //   //     if (this._parser) {
  //   //       this._parser.end();
  //   //     }
  //   //   });

  //   if (promise) {
  //     return promise;
  //   }
  //   return this;
  // }

  // async writeHeaders(headers) {
  //   // this.headers = headers;
  //   // this._parseContentLength();
  //   // await this._parseContentType();

  //   // if (!this._parser) {
  //   //   this._error(
  //   //     new FormidableError(
  //   //       'no parser found',
  //   //       errors.noParser,
  //   //       415, // Unsupported Media Type
  //   //     ),
  //   //   );
  //   //   return;
  //   // }

  //   this._parser.once('error', (error) => {
  //     this._error(error);
  //   });
  // }

  // write(chunk) {
  //   this.bytesReceived += chunk.length;
  //   this.emit('progress', this.bytesReceived, this.bytesExpected);

  //   this._parser.write(chunk);

  //   return this.bytesReceived;
  // }

  onPart(part) {
    // this method can be overwritten by the user
    return this._handlePart(part);
  }

  async _handlePart(part) {
    if (part.originalFilename && typeof part.originalFilename !== 'string') {
      this._error(
        new FormidableError(
          `the part.originalFilename should be string when it exists`,
          errors.filenameNotString,
        ),
      );
      return;
    }

    // This MUST check exactly for undefined. You can not change it to !part.originalFilename.

    // todo: uncomment when switch tests to Jest
    // console.log(part);

    // ? NOTE(@tunnckocore): no it can be any falsey value, it most probably depends on what's returned
    // from somewhere else. Where recently I changed the return statements
    // and such thing because code style
    // ? NOTE(@tunnckocore): or even better, if there is no mimetype, then it's for sure a field
    // ? NOTE(@tunnckocore): originalFilename is an empty string when a field?
    if (!part.mimetype) {
      let value = '';
      const decoder = new StringDecoder(
        part.transferEncoding || this.options.encoding,
      );

      part.on('data', (buffer) => {
        this._fieldsSize += buffer.length;
        if (this._fieldsSize > this.options.maxFieldsSize) {
          this._error(
            new FormidableError(
              `options.maxFieldsSize (${this.options.maxFieldsSize} bytes) exceeded, received ${this._fieldsSize} bytes of field data`,
              errors.maxFieldsSizeExceeded,
              413, // Payload Too Large
            ),
          );
          return;
        }
        value += decoder.write(buffer);
      });

      part.on('end', () => {
        this.emit('field', part.name, value);
      });
      return;
    }

    if (!this.options.filter(part)) {
      return;
    }

    this._flushing += 1;

    let fileSize = 0;
    const newFilename = this._getNewName(part);
    const filepath = this._joinDirectoryName(newFilename);
    const file = await this._newFile({
      filepath,
      mimetype: part.mimetype,
      newFilename,
      originalFilename: part.originalFilename,
    });
    file.on('error', (err) => {
      this._error(err);
    });
    this.emit('fileBegin', part.name, file);

    file.open();
    this.openedFiles.push(file);

    part.on('data', (buffer) => {
      this._totalFileSize += buffer.length;
      fileSize += buffer.length;

      if (this._totalFileSize > this.options.maxTotalFileSize) {
        this._error(
          new FormidableError(
            `options.maxTotalFileSize (${this.options.maxTotalFileSize} bytes) exceeded, received ${this._totalFileSize} bytes of file data`,
            errors.biggerThanTotalMaxFileSize,
            413,
          ),
        );
        return;
      }
      if (buffer.length === 0) {
        return;
      }
      this.pause();
      file.write(buffer, () => {
        this.resume();
      });
    });

    part.on('end', () => {
      if (!this.options.allowEmptyFiles && fileSize === 0) {
        this._error(
          new FormidableError(
            `options.allowEmptyFiles is false, file size should be greater than 0`,
            errors.noEmptyFiles,
            400,
          ),
        );
        return;
      }
      if (fileSize < this.options.minFileSize) {
        this._error(
          new FormidableError(
            `options.minFileSize (${this.options.minFileSize} bytes) inferior, received ${fileSize} bytes of file data`,
            errors.smallerThanMinFileSize,
            400,
          ),
        );
        return;
      }
      if (fileSize > this.options.maxFileSize) {
        this._error(
          new FormidableError(
            `options.maxFileSize (${this.options.maxFileSize} bytes), received ${fileSize} bytes of file data`,
            errors.biggerThanMaxFileSize,
            413,
          ),
        );
        return;
      }

      file.end(() => {
        this._flushing -= 1;
        this.emit('file', part.name, file);
        this._maybeEnd();
      });
    });
  }

  // eslint-disable-next-line max-statements
  // async _parseContentType() {
  // if (this.bytesExpected === 0) {
  //   this._parser = new DummyParser(this, this.options);
  //   return;
  // }

  // if (!this.headers['content-type']) {
  //   this._error(
  //     new FormidableError(
  //       'bad content-type header, no content-type',
  //       errors.missingContentType,
  //       400,
  //     ),
  //   );
  // }

  // new DummyParser(this, this.options);

  // const results = [];
  // await Promise.all(this._plugins.map(async (plugin, idx) => {
  //   let pluginReturn = null;
  //   try {
  //     pluginReturn = await plugin(this, this.options) || this;
  //   } catch (err) {
  //     // directly throw from the `form.parse` method;
  //     // there is no other better way, except a handle through options
  //     const error = new FormidableError(
  //       `plugin on index ${idx} failed with: ${err.message}`,
  //       errors.pluginFailed,
  //       500,
  //     );
  //     error.idx = idx;
  //     throw error;
  //   }
  //   Object.assign(this, pluginReturn);

  //   // todo: use Set/Map and pass plugin name instead of the `idx` index
  //   this.emit('plugin', idx, pluginReturn);
  // }));
  // this.emit('pluginsResults', results);
  // }

  // _error(err, eventName = 'error') {
  //   if (this.error || this.ended) {
  //     return;
  //   }

  //   this.req = null;
  //   this.error = err;
  //   this.emit(eventName, err);

  //   this.openedFiles.forEach((file) => {
  //     file.destroy();
  //   });
  // }

  // _parseContentLength() {
  //   this.bytesReceived = 0;
  //   if (this.headers['content-length']) {
  //     this.bytesExpected = parseInt(this.headers['content-length'], 10);
  //   } else if (this.headers['transfer-encoding'] === undefined) {
  //     this.bytesExpected = 0;
  //   }

  //   if (this.bytesExpected !== null) {
  //     this.emit('progress', this.bytesReceived, this.bytesExpected);
  //   }
  // }

  // _newParser() {
  //   return new MultipartParser(this.options);
  // }

  async _newFile({
    filepath,
    mimetype,
    newFilename,
    originalFilename,
  }) {
    if (this.options.fileWriteStreamHandler) {
      return new VolatileFile({
        createFileWriteStream: this.options.fileWriteStreamHandler,
        filepath,
        hashAlgorithm: this.options.hashAlgorithm,
        mimetype,
        newFilename,
        originalFilename,
      });
    }
    if (this.options.createDirsFromUploads) {
      try {
        await createNecessaryDirectoriesAsync(filepath);
      } catch {
        this._error(new FormidableError(
          `cannot create directory`,
          errors.cannotCreateDir,
          409,
        ));
      }
    }
    return new PersistentFile({
      filepath,
      hashAlgorithm: this.options.hashAlgorithm,
      mimetype,
      newFilename,
      originalFilename,
    });
  }

  // _getFileName(headerValue) {
  //   // matches either a quoted-string or a token (RFC 2616 section 19.5.1)
  //   const m = headerValue.match(
  //     // eslint-disable-next-line prefer-named-capture-group
  //     /\bfilename=("(.*?)"|([^()<>{}[\]@,;:"?=\s/]+))($|;\s)/iu,
  //   );
  //   if (!m) {
  //     return null;
  //   }

  //   const match = m[2] || m[3] || '';
  //   let originalFilename = match.substr(match.lastIndexOf('\\') + 1);
  //   originalFilename = originalFilename.replace(/%22/gu, '"');
  //   // eslint-disable-next-line prefer-named-capture-group
  //   originalFilename = originalFilename.replace(/&#(\d{4});/gu, (_, code) => String.fromCharCode(code));

  //   return originalFilename;
  // }

  // able to get composed extension with multiple dots
  // "a.b.c" -> ".b.c"
  // as opposed to path.extname -> ".c"
  // _getExtension(str) {
  //   if (!str) {
  //     return '';
  //   }

  //   const basename = path.basename(str);
  //   const firstDot = basename.indexOf('.');
  //   const lastDot = basename.lastIndexOf('.');
  //   let rawExtname = path.extname(basename);

  //   if (firstDot !== lastDot) {
  //     rawExtname = basename.slice(firstDot);
  //   }

  //   let filtered;
  //   const firstInvalidIndex = Array.from(rawExtname).findIndex(invalidExtensionChar);
  //   if (firstInvalidIndex === -1) {
  //     filtered = rawExtname;
  //   } else {
  //     filtered = rawExtname.substring(0, firstInvalidIndex);
  //   }
  //   if (filtered === '.') {
  //     return '';
  //   }
  //   return filtered;
  // }

  // _joinDirectoryName(name) {
  //   const newPath = path.join(this.uploadDir, name);

  //   // prevent directory traversal attacks
  //   if (!newPath.startsWith(this.uploadDir)) {
  //     return path.join(this.uploadDir, this.options.defaultInvalidName);
  //   }

  //   return newPath;
  // }

  _setUpRename() {
    const hasRename = typeof this.options.filename === 'function';
    if (hasRename) {
      this._getNewName = (part) => {
        let ext = '';
        let name = this.options.defaultInvalidName;
        if (part.originalFilename) {
          // can be null
          ({ ext, name } = path.parse(part.originalFilename));
          if (this.options.keepExtensions !== true) {
            ext = '';
          }
        }
        // eslint-disable-next-line prefer-reflect
        return this.options.filename.call(this, name, ext, part, this);
      };
    } else {
      this._getNewName = (part) => {
        const name = createId();

        if (part && this.options.keepExtensions) {
          const originalFilename
            = typeof part === 'string' ? part : part.originalFilename;

          return `${name}${this._getExtension(originalFilename)}`;
        }

        return name;
      };
    }
  }

  _setUpMaxFields() {
    if (this.options.maxFields !== Infinity) {
      let fieldsCount = 0;
      this.on('field', () => {
        fieldsCount += 1;
        if (fieldsCount > this.options.maxFields) {
          this._error(
            new FormidableError(
              `options.maxFields (${this.options.maxFields}) exceeded`,
              errors.maxFieldsExceeded,
              413,
            ),
          );
        }
      });
    }
  }

  _setUpMaxFiles() {
    if (this.options.maxFiles !== Infinity) {
      let fileCount = 0;
      this.on('fileBegin', () => {
        fileCount += 1;
        if (fileCount > this.options.maxFiles) {
          this._error(
            new FormidableError(
              `options.maxFiles (${this.options.maxFiles}) exceeded`,
              errors.maxFilesExceeded,
              413,
            ),
          );
        }
      });
    }
  }

  // _maybeEnd() {
  //   if (!this.ended || this._flushing || this.error) {
  //     return;
  //   }
  //   this.req = null;
  //   this.emit('end');
  // }
}

export default IncomingForm;
export { DEFAULT_OPTIONS };
