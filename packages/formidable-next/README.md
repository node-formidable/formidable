# formidable@next

v4 preparations. Modern multipart form-data parser for Node.js, Bun, Deno, Cloudflare, and the
browser.

> [!CAUTION]
>
> For older Node versions like v14, v15 and v16 you have to use the `web-streams-polyfill` in your
> project. Minimum required version is the first Node.js v14 LTS release, `v14.15.0` (Fermium).

## install

```
npm i formidable@next
```

## Example

```ts
import {
  parseMultipartRequest,
  parseMultipart,
  formidableDefaultOptions,
  FormidableError,
  FormidableOptions,
  FormidablePart,
} from 'formidable';

async function formidable(req: Request, options?: FormidableOptions) {
  try {
    await parseMultipartRequest(req, options, async (part: FormidablePart) => {
      // part.type - part content type, media type (no charsets)

      // ==== Headers ====
      // part.headers - part headers, parsed into type-safe SuperHeaders object
      // part.headers.contentType.mediaType - part content media type
      // part.headers.contentType.charset - part content charset
      // part.headers.contentDisposition.name
      // part.headers.contentDisposition.filename
      // part.headers.contentDisposition.preferredFilename
      // part.headers.contentDisposition.type - attachment or inline or form-data

      // ==== Streaming ====
      // await part.stream() - no buffering, async iterable, useful to use in `for await (const chunk of part.stream())`

      // ==== Buffering ====
      // await part.text(failSafe?) - buffer into string, pass failSafe = true to avoid crashing
      // await part.bytes() - buffer into Uint8Array bytes
      // await part.arrayBuffer() - buffer into ArrayBuffer
      // await part.json() - buffer into JSON object, pass failSafe = true to avoid crashing

      // ==== Utils ====
      // part.toString() - string representing the state of properties (name, filename, type, headers)
      // part.toObject() - the core of `toString()`, returns an object with the properties (name, filename, type, headers)
      // part.isFile() - check if the part is a file

      if (part.isFile()) {
        console.log('file', part.name, part.filename, part.toString());
      } else {
        // part.text() on field gets the input's value
        console.log('field', part.name, await part.text());
      }
    });
  } catch (er: FormidableError) {
    switch (er.code) {
      case 'ERR_INVALID_INPUT':
        console.error(er.message);
        break;
      case 'ERR_BODY_CONSUMED':
        console.error(er.message);
        break;
      case 'ERR_FAILED_TO_PARSE_TEXT':
        console.error(er.message);
        break;
      case 'ERR_FAILED_TO_PARSE_JSON':
        console.error(er.message);
        break;
      case 'ERR_NO_BOUNDARY':
        console.error(er.message);
        break;
      case 'ERR_MAX_FILENAME_SIZE':
        console.error(er.message);
        break;
      case 'ERR_MAX_FILE_SIZE':
        console.error(er.message);
        break;
      case 'ERR_MAX_FILE_KEY_SIZE':
        console.error(er.message);
        break;
      case 'ERR_MAX_FIELD_SIZE':
        console.error(er.message);
        break;
      case 'ERR_MAX_FIELD_KEY_SIZE':
        console.error(er.message);
        break;
      case 'ERR_MAX_HEADER_SIZE':
        console.error(er.message);
        break;
      case 'ERR_MAX_HEADER_KEY_SIZE':
        console.error(er.message);
        break;
      case 'ERR_MAX_HEADER_VALUE_SIZE':
        console.error(er.message);
        break;
      case 'ERR_MAX_ALL_HEADERS_SIZE':
        console.error(er.message);
        break;
    }
  }
}
```

### Usage in Node.js v14 and v16

> [!CAUTION]
>
> Minimum required version is the first Node.js v14 LTS release, `v14.15.0` (Fermium).

It bundles the `headers-polyfill` for compatibility with older Node.js versions. For Node.js v14 it
bundles both; for Node.js v16 you have to `import 'web-streams-polyfill/polyfill';` for ESM, or
modules `require('web-streams-polyfill/ponyfill');` for CJS

```ts
import 'web-streams-polyfill/polyfill';
import { createServer } from 'node:http';
import { parseMultipartRequest } from 'formidable';

const server = createServer((req, res) => {
  if (req.method === 'POST') {
    // considering the above `formidable`
    await parseMultipartRequest(
      req,
      {
        maxFileSize: 1 * 1024 * 1024, // 1mb, defaults to 100mb
        maxFilenameSize: 1000, // defaults to 255
        maxFileKeySize: 1000, // defaults to 255
        maxFieldKeySize: 1000, // defaults to 255
      },
      async (part) => {
        console.log('part:', part.toString());
      },
    );
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Hello World\n');
  }
});

server.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});
```

### Usage in modern Node.js and other runtimes

You can either use the above helper `formidable` function or the `parseMultipartRequest` directly,
works on any Fetch/Request/Response API compatible runtime.

- for Node.js v18+, you can use the `formidable` import directly
- for Bun, Deno, Cloudflare, and the browser, you can use the `formidable` import too

```ts
// Deno/Bun/Cloudflare
import { parseMultipartRequest } from 'formidable';

export default {
  async fetch(req: Request) {
    if (req.method === 'POST') {
      await parseMultipartRequest(
        req,
        {
          maxFileSize: 1 * 1024 * 1024, // 1mb, defaults to 100mb
          maxFilenameSize: 1000, // defaults to 255
          maxFileKeySize: 1000, // defaults to 255
          maxFieldKeySize: 1000, // defaults to 255
        },
        async (part: FormidablePart) => {
          console.log('part:', part.toString());
        },
      );

      return new Response('ok');
    }

    return new Response('Hello World, try POST request', {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  },
};
```

### Options

- `maxAllHeadersSize` **{number}** - size for all headers combined, _(default: 8kb)_
- `maxHeaderKeySize` **{number}** - size of the key per each header, _(default: 255)_
- `maxHeaderValueSize` **{number}** - size of the value of each header, _(default: 1kb)_
- `maxHeaderSize` **{number}** - size of key + value of each header, _(default: 2kb)_
- `maxFilenameSize` **{number}** - size of the file original filename, _(default: 255)_
- `maxFileKeySize` **{number}** - size of the key of file fields, _(default: 255)_
- `maxFileSize` **{number}** - size of each file, _(default: 100mb)_
- `maxFieldKeySize` **{number}** - size of the key of text fields, _(default: 255)_
- `maxFieldSize` **{number}** - size of each text field value, _(default: 100kb)_
