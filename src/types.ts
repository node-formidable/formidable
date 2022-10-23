import { Stream, Writable } from 'node:stream';
import * as crypto from 'node:crypto';
import Formidable from './Formidable'

export { Formidable };

export type FormidablePlugin = (formidable: Formidable, options: IFormidableOptions) => any;

export interface IFormidableOptions {
  maxFields: number;
  maxFieldsSize: number;
  maxFiles: number;
  maxFileSize: number;
  maxTotalFileSize: number | undefined;
  minFileSize: number;
  allowEmptyFiles: boolean;
  keepExtensions: boolean;
  encoding: BufferEncoding;
  hashAlgorithm: string | false;
  uploadDir: string;
  uploaddir?: string;
  enabledPlugins: FormidablePlugin[];
  fileWriteStreamHandler: (() => Writable) | null;
  defaultInvalidName: string;
  filter(_part: any): boolean;
  filename: ((name: string, ext: string, part: Pick<IPart, 'originalFilename' | 'mimetype'>, form: Formidable) => string) | undefined;
}

export interface IFields {
  [field: string]: string[];
}

export interface IFiles {
  [file: string]: IFile[];
}

export interface IPart extends Stream {
  readable?: boolean;
  headers?: IFields;
  name?: string | null;
  originalFilename?: string | null;
  mimetype?: string | null;
  transferEncoding?: BufferEncoding | '7bit' | '8bit';
  transferBuffer?: string
}

export interface IFile {
  /**
   * The size of the uploaded file in bytes. If the file is still being uploaded (see `'fileBegin'`
   * event), this property says how many bytes of the file have been written to disk yet.
   */
  size: number;

  /**
   * Unknown
   */
  length: null;

  /**
   * The path this file is being written to. You can modify this in the `'fileBegin'` event in case
   * you are unhappy with the way formidable generates a temporary path for your files.
   */
  filepath: string;

  /**
   * The name this file had according to the uploading client.
   */
  originalFilename: string | null;

  /**
   * Calculated based on options provided
   */
  newFilename: string;

  /**
   * The mime type of this file, according to the uploading client.
   */
  mimetype: string | null;

  /**
   * A Date object (or `null`) containing the time this file was last written to. Mostly here for
   * compatibility with the [W3C File API Draft](http://dev.w3.org/2006/webapi/FileAPI/).
   */
  mtime?: Date | null | undefined;

  createFileWriteStream?: (file: IFile) => Writable;

  hashAlgorithm: false | string;

  /**
   * If `options.hashAlgorithm` calculation was set, you can read the hex digest out of this var
   * (at the end it will be a string).
   */
  hash?: crypto.Hash | string | null;

  /**
   * This method returns a JSON-representation of the file, allowing you to JSON.stringify() the
   * file which is useful for logging and responding to requests.
   *
   * @link https://github.com/node-formidable/formidable#filetojson
   */
  toJSON(): FileJSON;

  toString(): string;
}

interface FileJSON extends Pick<IFile, "size" | "originalFilename" | "mimetype" | "hash">, Partial<Pick<IFile, "filepath">> {
  length: number;
  mimetype: string | null;
  mtime?: Date | null;
}