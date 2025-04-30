// export async function formidable(request: Request): Promise<FormData>;
// export async function formidable(
//   request: Request,
//   options?: Omit<FormidableOptions, 'boundary'> & { randomName?: boolean },
// ): Promise<FormData>;
// export async function formidable(
//   request: Request,
//   options?: Omit<FormidableOptions, 'boundary'> & { randomName?: boolean },
// ): Promise<FormData> {
//   const opts = { ...options };
//   const formData = new FormData();

//   await parseMultipartRequest(request, opts, async (part) => {
//     if (part.isFile()) {
//       const newFilename = opts.randomName
//         ? crypto.randomUUID()
//         : part.filename || crypto.randomUUID();

//       const file = new File([await part.bytes()], newFilename, { type: part.type });
//       formData.append(part.name, file, newFilename);
//     } else {
//       const blob = new Blob([await part.bytes()], { type: part.type });
//       formData.append(part.name, blob);
//     }
//   });

//   return formData;
// }

// export function formidable(
//   options?: Omit<FormidableOptions, 'boundary'> & { randomName?: boolean },
// ) {
//   const opts = { ...options };

//   // class MyReadable extends Readable {
//   //   constructor() {
//   //     super({ objectMode: true });
//   //   }

//   //   override _read() {}
//   // }

//   const self = {
//     async *stream(req: Request) {
//       const stream = new ReadableStream({
//         async start(controller) {
//           await parseMultipartRequest(req, opts, async (part) => {
//             controller.enqueue(part);
//           });

//           controller.close();
//         },
//       });
//     },
//   };

//   return self;
// }

import {
  FormidableError,
  parseMultipart,
  type FormidableOptions,
  type FormidablePartHandler,
} from './multipart-web.ts';

/**
 * Extracts the boundary string from a `multipart/*` content type.
 */
export function getMultipartBoundary(contentType?: string | null): string | null {
  if (!contentType) return null;

  const [_, matchOne = null, matchTwo = null] =
    /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType || '') || [];

  return matchOne || matchTwo || null;
}

/**
 * Returns true if the given request contains multipart data.
 */
export function isMultipartRequest(request: Request): boolean {
  const contentType = request.headers.get('Content-Type');
  return Boolean(contentType && contentType.startsWith('multipart/'));
}

/**
 * Parse a multipart [`Request`](https://developer.mozilla.org/en-US/docs/Web/API/Request) and yield each part as
 * a `MultipartPart` object. Useful in HTTP server contexts for handling incoming `multipart/*` requests.
 */
export async function parseMultipartRequest(
  request: Request,
  handler: FormidablePartHandler,
): Promise<void>;
export async function parseMultipartRequest(
  request: Request,
  options: Omit<FormidableOptions, 'boundary'>,
  handler: FormidablePartHandler,
): Promise<void>;
export async function parseMultipartRequest(
  request: Request,
  options: Omit<FormidableOptions, 'boundary'> | FormidablePartHandler,
  handler?: FormidablePartHandler,
): Promise<void> {
  if (typeof options === 'function') {
    handler = options;
    options = {} as Omit<FormidableOptions, 'boundary'>;
  }

  if (!isMultipartRequest(request)) {
    throw new FormidableError('Request is not a multipart request', 'ERR_NO_MULTIPART_BODY');
  }
  if (!request.body) {
    throw new FormidableError('Request body is empty', 'ERR_NO_REQUEST_BODY');
  }

  const boundary = getMultipartBoundary(request.headers.get('Content-Type'));
  if (!boundary) {
    throw new FormidableError('Invalid Content-Type header: missing boundary', 'ERR_NO_BOUNDARY');
  }

  await parseMultipart(request.body, { ...options, boundary }, handler!);
}
