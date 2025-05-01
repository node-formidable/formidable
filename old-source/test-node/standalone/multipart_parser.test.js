import {Readable} from 'node:stream';
import MultipartParser from '../../src/parsers/Multipart.js';
import {malformedMultipart} from '../../src/FormidableError.js';

import test from 'node:test';
import assert, { deepEqual } from 'node:assert';



test('MultipartParser does not hang', async (t) => {
    const mime = `--_\r\n--_--\r\n`;
    const parser = new MultipartParser();
    parser.initWithBoundary('_');
    try {
        for await (const {name, buffer, start, end} of Readable.from(mime).pipe(parser)) {
            console.log(name, buffer ? buffer.subarray(start, end).toString() : '');
        }

    } catch (e) {
        deepEqual(e.code, malformedMultipart)
        return;
        // console.error('error');
        // console.error(e);

    }
    assert(false, 'should catch error');
});