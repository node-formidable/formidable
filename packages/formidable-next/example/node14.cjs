require('web-streams-polyfill/polyfill');

const { parseMultipart } = require('../dist/index.cjs');
const messages = require('./messages.cjs');

const input = (messages && messages.default ? messages.default : messages).fiveLargeFiles;
const start = Date.now();

// console.log('Using mjack:', MJACK);
parseMultipart(input.generateChunks(), { boundary: input.boundary }, async (part) => {
  console.log('part:', part.name);
  for await (const chunk of part.stream()) {
    console.log('chunk:', part.name, chunk);
  }
}).then(() => {
  const end = Date.now() - start;
  console.log('Time taken:', end, 'ms');
});
