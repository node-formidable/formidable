/* eslint-disable global-require */
/* eslint-disable import/no-dynamic-require */

import { strictEqual, deepEqual } from 'node:assert';
import test from 'node:test';
import { createReadStream, constants, accessSync } from 'node:fs';
import { createConnection } from 'node:net';
import { join } from 'node:path';
import { createServer } from 'node:http';
import formidable from '../../src/index.js';


const PORT = 13534;
const CWDTest = join(process.cwd(), "test-node");
const FIXTURES_HTTP = join(CWDTest, 'fixture', 'http');
const UPLOAD_DIR = join(CWDTest, 'tmp');
import * as encoding from "../fixture/js/encoding.js";
import * as misc from "../fixture/js/misc.js";
import * as noFilename from "../fixture/js/no-filename.js";
import * as preamble from "../fixture/js/preamble.js";
import * as workarounds from "../fixture/js/workarounds.js";
import * as specialCharsInFilename from "../fixture/js/special-chars-in-filename.js";

const fixtures = {
    // encoding,
    // misc,
    // [`no-filename`]: noFilename,
    // preamble,
    // [`special-chars-in-filename`]: specialCharsInFilename,
    workarounds, // todo uncomment this and make it work
};


test('fixtures', (testContext, done) => {
    const server = createServer();
    server.listen(PORT, findFixtures);

    function properExitTest(...x) {
        server.close();
        done(...x)
    }
    function strictEqualExit(...x) {
        try {
            strictEqual(...x)
        } catch (assertionError) {
            properExitTest(assertionError);
            throw assertionError;
        }   
    }


    function findFixtures() {
        const remainingFixtures = Object.entries(fixtures).map(([fixtureGroup, fixture]) => {
            return Object.entries(fixture).map(([k, v]) => {
                return v.map(details => {
                    
                    return {
                        fixture: v,
                        name: `${fixtureGroup}/${details.fixture}.http`,
                        http: join(FIXTURES_HTTP, fixtureGroup, `${details.fixture}.http`),
                    };
                });
            });
        }).flat(Infinity);
        testNext(remainingFixtures);
    }

    function testNext(remainingFixtures) {
        const fixtureWithName = remainingFixtures.shift();
        if (!fixtureWithName) {
            properExitTest();
            return;
        }
        const fixtureName = fixtureWithName.name;
        const fixture = fixtureWithName.fixture;

        uploadFixture(fixtureWithName, (err, parts) => {
            if (err) {
                err.fixtureName = fixtureName;
                properExitTest(new Error(err));
                return;
            }

            fixture.forEach((expectedPart, i) => {
                const parsedPart = parts[i];
                strictEqualExit(parsedPart.type, expectedPart.type);
                strictEqualExit(parsedPart.name, expectedPart.name);

                if (parsedPart.type === 'file') {
                    const file = parsedPart.value;
                    strictEqualExit(file.originalFilename, expectedPart.originalFilename,
                        `${JSON.stringify([expectedPart, file])}`);

                    if (expectedPart.sha1) {
                        strictEqualExit(
                            file.hash,
                            expectedPart.sha1,
                            `SHA1 error ${file.originalFilename} on ${file.filepath} ${JSON.stringify([expectedPart, file])}`,
                        );
                    }
                }
            });

            testNext(remainingFixtures);
        });
    }

    function uploadFixture(fixtureWithName, verifyFixture) {
        
        const fixturePath = fixtureWithName.http;
        let verifyFixtureOnce = verifyFixture;
        
        try {
            accessSync(fixturePath, constants.W_OK | constants.R_OK);
        } catch (err) {
            properExitTest(new Error(`can't open ${fixturePath}`));
        }
        const socket = createConnection(PORT);
        const file = createReadStream(fixturePath);
        
        // make sure verifyFixture is only called once
        function callback(...args) {
            const realCallback = verifyFixtureOnce;
            verifyFixtureOnce = function callbackFn() { };
            socket.destroy()
            realCallback(...args);
        }

        server.once('request', (req, res) => {
            const form = formidable({
                uploadDir: UPLOAD_DIR,
                hashAlgorithm: 'sha1',
                keepExtensions: true,
            });

            const parts = [];
            form
                .once('error', (error) => {
                    const a  = form;
                    const b = a;
                    const c = a._parser.explain();
                    console.log(c);
                    callback(error);
                })
                .on('fileBegin', (name, value) => {
                    parts.push({ type: 'file', name, value });
                })
                .on('field', (name, value) => {
                    parts.push({ type: 'field', name, value });
                })
                .once('end', () => {
                    res.end();
                    callback(null, parts);
                });
            form.parse(req);
        });


        file.pipe(socket);
    }
});
