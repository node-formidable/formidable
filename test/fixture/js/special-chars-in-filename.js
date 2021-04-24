const properFilename = 'funkyfilename.txt';

function expect(originalFilename) {
  return [
    { type: 'field', name: 'title', value: 'Weird originalFilename' },
    {
      type: 'file',
      name: 'upload',
      originalFilename,
      fixture: properFilename,
    },
  ];
}

const webkit = expect(' ? % * | " < > . ? ; \' @ # $ ^ & ( ) - _ = + { } [ ] ` ~.txt');
const ffOrIe = expect(' ? % * | " < > . ☃ ; \' @ # $ ^ & ( ) - _ = + { } [ ] ` ~.txt');
const lineSeparator = expect(null);

export {
  webkit as osx_chrome_13_http,
  webkit as osx_firefox_3_6_http,
  webkit as osx_safari_5_http,
  webkit as xp_chrome_12_http,
  webkit as xp_safari_5_http,

  ffOrIe as xp_ie_7_http,
  ffOrIe as xp_ie_8_http,
  lineSeparator as line_separator_http,
};
