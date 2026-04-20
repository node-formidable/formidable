// import http from 'node:http';
// import test from 'asia';
// import assert from 'node:assert/strict';

// import formidable from '../src/index.js';
import { pluginMultipart } from '../src/plugins/multipart.js';
import { getRandomBytes } from './utils.js';
import { createMultipartRequest } from './utils.node.js';

const boundary = '----WebKitFormBoundaryzv5f5B2cY6tjQ0Rn';
const request = createMultipartRequest(boundary, {
  abc: 'value1',
  adcc: {
    content: getRandomBytes(1024 * 1024 * 1), // 1 MB file
    filename: 'tesla.jpg',
    mediaType: 'image/jpeg',
  },
  coo: 'value3',
  doo: {
    content: JSON.stringify({
      foo: 'bar',
      qux: 'zazz',
    }),
    filename: 'tesla.json',
    mediaType: 'application/json',
  },
  fizld2: 'value2',
  sasa: 'sasasasa',
});

// await parseMultipartRequest(request, async (part) => {
//   if (part.type === 'error') {
//     console.error('Error:', part.error);
//     return;
//   }
//   if (part.type === 'header') {
//     console.log('Header:', { key: part.key, value: part.value });
//     return;
//   }

//   if (part.type === 'field') {
//     console.log('Field:', { key: part.key, value: await part.value.text() });
//   } else if (part.type === 'file') {
//     console.log('File:', { key: part.key, filename: part.value.name });
//     const fileContent = part.value.type === 'application/json' ? await part.value.text() : null;
//     console.log('File content:', fileContent);
//   }
// });

// const parser = pluginMultipart({
//   contentType: request.headers['content-type'],
//   hooks: {
//     onError(err) {
//       console.error('error:>>', err);
//     },
//     onHeader(key, value) {
//       console.log('header:>>', { key, value });

//       // skip files with content-type image/jpeg
//       // if (key === 'content-type' && value === 'image/jpeg') {
//       //   return SKIP;
//       // }
//     },
//     async onField(fieldName, blob) {
//       console.log('field:>>', { blob, key: fieldName });
//     },
//     async onFile(fieldName, file) {
//       console.log('file:>>', { file, key: fieldName });
//     },
//   },
// });

// for await (const chunk of request) {
//   // console.log('chunk', chunk);
//   await parser.write(chunk);
// }

// function uint8ArrayToHex(uint8Array) {
//   return Array.from(uint8Array)
//     .map((byte) => byte.toString(16).padStart(2, '0'))
//     .join('');
// }

async function parseMultipartRequest(req, onPart) {
  const parser = pluginMultipart({
    contentType: req.headers['content-type'],
    hooks: {
      async onError(err) {
        console.log('error:>>', err);
        // await onPart({ type: 'error', error: err });
      },
      // async onHeader(key, value) {
      //   // console.log('header:>>', { key, value });
      //   await onPart({ type: 'header', key, value });
      // },
      async onField(key, blob) {
        console.log('field:>>', { key, blob });
        await onPart({ type: 'field', key, value: blob });
      },
      async onFile(key, file) {
        console.log('file:>>', { key, file });
        await onPart({ type: 'file', key, value: file });
      },
    },
  });

  // let str = '';
  for await (const chunk of req) {
    // console.log('chunk:>>', chunk);
    // str += chunk.toString('utf8');
    const data = new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength);
    await parser.write(data);
  }

  // console.log(str);
}

// describe('parseMultipartRequest (node)', () => {
//   const boundary = '----WebKitFormBoundaryzv5f5B2cY6tjQ0Rn';

// test('parses an empty multipart message', async () => {
//   const req = createMultipartRequest(boundary);

//   const parts = [];
//   await parseMultipartRequest(req, (part) => {
//     parts.push(part);
//   });

//   assert.equal(parts.length, 0);
// });

// test('parses a simple multipart form', async () => {
const parts = [];
await parseMultipartRequest(request, (part) => {
  // console.log('part:>>', part);
  // if (part.type === 'error') {
  //   return;
  // }
  // if (part.type === 'header') {
  //   return;
  // }

  parts.push(part);
});

// console.log('parts:>>', parts);
console.log('parts.length:>>', parts.length, 'must be 6', parts.length === 6);

// assert.equal(parts.length, 1);
// assert.equal(parts[0].key, 'field1');
// assert.equal(await parts[0].value.text(), 'value1');
// });

//   // it('parses large file uploads correctly', async () => {
//   //   const content = getRandomBytes(1024 * 1024 * 5); // 5 MB file
//   //   const request = createMultipartRequest(boundary, {
//   //     field1: 'value1',
//   //     file1: {
//   //       content: JSON.stringify({ foo: uint8ArrayToHex(content) }),
//   //       filename: 'tesla.json',
//   //       mediaType: 'application/json',
//   //     },
//   //     field2: 'value2',
//   //   });
//   //   // server.pipe(request);

//   //   const parts = [];
//   //   await parseMultipartRequest(request, async (part) => {
//   //     console.log('part:>>', part);
//   //     parts.push(part);
//   //   });

//   //   assert.equal(parts.length, 3);
//   //   assert.equal(parts[0].key, 'field1');
//   //   assert.equal(await parts[0].value.text(), 'value1');

//   //   assert.equal(parts[1].key, 'file1');
//   //   assert.equal(parts[1].value.filename, 'tesla.json');
//   //   assert.equal(parts[1].value.type, 'application/json');

//   //   const partContent = await parts[1].value.text();
//   //   const parsedContent = JSON.parse(partContent);
//   //   assert.equal(parsedContent.foo, uint8ArrayToHex(content));

//   //   assert.equal(parts[2].key, 'field2');
//   //   assert.equal(await parts[2].value.text(), 'value2');
//   // });
// });
