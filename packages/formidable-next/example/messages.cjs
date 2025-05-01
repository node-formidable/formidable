"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var messages_exports = {};
__export(messages_exports, {
  MultipartMessage: () => MultipartMessage,
  concat: () => concat,
  fiveLargeFiles: () => fiveLargeFiles,
  oneHundredSmallFiles: () => oneHundredSmallFiles,
  oneLargeFile: () => oneLargeFile,
  oneSmallFile: () => oneSmallFile
});
module.exports = __toCommonJS(messages_exports);
function concat(chunks) {
  if (chunks.length === 1) return chunks[0];
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
const NodeDefaultHighWaterMark = 65536;
class MultipartMessage {
  boundary;
  content;
  constructor(boundary, partSizes) {
    this.boundary = boundary;
    const chunks = [];
    function pushString(string) {
      chunks.push(new TextEncoder().encode(string));
    }
    function pushLine(line = "") {
      pushString(`${line}\r
`);
    }
    for (const [i, partSize] of partSizes.entries()) {
      pushLine(`--${boundary}`);
      pushLine(`Content-Disposition: form-data; name="file_field${i}"; filename="file${i}.txt"`);
      pushLine("Content-Type: text/plain");
      pushLine();
      pushString("a".repeat(partSize));
      pushLine();
    }
    pushString(`--${boundary}--`);
    this.content = concat(chunks);
  }
  *generateChunks(chunkSize = NodeDefaultHighWaterMark) {
    for (let i = 0; i < this.content.length; i += chunkSize) {
      yield this.content.subarray(i, i + chunkSize);
    }
  }
}
const oneKb = 1024;
const oneMb = 1024 * oneKb;
const oneSmallFile = new MultipartMessage("----boundary123", [oneKb]);
const oneLargeFile = new MultipartMessage("----boundary123", [10 * oneMb]);
const oneHundredSmallFiles = new MultipartMessage(
  "----boundary123",
  Array.from({ length: 100 }).fill(oneKb)
);
const fiveLargeFiles = new MultipartMessage("----boundary123", [
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
  1 * oneMb
]);
