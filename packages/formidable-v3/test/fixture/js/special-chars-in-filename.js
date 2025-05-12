const properFilename = 'funkyfilename.txt';

function expect(originalFilename, fixtureName) {
  return [
    {
      type: 'field',
      name: 'title',
      originalFilename: properFilename,
      fixture: fixtureName,
    },
    {
      type: 'file',
      name: 'upload',
      originalFilename,
      fixture: fixtureName,
    },
  ];
}

const osx_chrome_13_http = expect(' ? % * | " < > . ? ; \' @ # $ ^ & ( ) - _ = + { } [ ] ` ~.txt', 'osx-chrome-13');
const osx_firefox_3_6_http = expect(' ? % * | " < > . ☃ ; \' @ # $ ^ & ( ) - _ = + { } [ ] ` ~.txt', 'osx-firefox-3.6');

const xp_ie_7_http = expect(' ? % * | " < > . ☃ ; \' @ # $ ^ & ( ) - _ = + { } [ ] ` ~.txt', 'xp-ie-7');
const xp_ie_8_http = expect(' ? % * | " < > . ☃ ; \' @ # $ ^ & ( ) - _ = + { } [ ] ` ~.txt', 'xp-ie-8');
const lineSeparator = expect(null, 'line-separator');

export {
  osx_chrome_13_http,
  osx_firefox_3_6_http,
  // webkit as osx_firefox_3_6_http,
  // webkit as osx_safari_5_http,
  // webkit as xp_chrome_12_http,
  // webkit as xp_safari_5_http,

  // xp_ie_7_http,
  // xp_ie_8_http,
  // lineSeparator,
};
