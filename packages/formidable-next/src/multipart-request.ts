// SPDX-License-Identifier: MIT

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
