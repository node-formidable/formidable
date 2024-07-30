/* eslint-disable */

// This file is a vendored copy of https://github.com/lukeed/hexoid at e956bef3d1efa5c0f27807df280db668d5c16e32
// Vendored due to compatibility issues with webpack and inconsistent exports between CommonJS and ESM modules
// See: https://github.com/lukeed/hexoid/issues/7 for more details

var IDX=256, HEX=[];
while (IDX--) HEX[IDX] = (IDX + 256).toString(16).substring(1);

export function hexoid(len) {
	len = len || 16;
	var str='', num=0;
	return function () {
		if (!str || num === 256) {
			str=''; num=(1+len)/2 | 0;
			while (num--) str += HEX[256 * Math.random() | 0];
			str = str.substring(num=0, len-2);
		}
		return str + HEX[num++];
	};
}
