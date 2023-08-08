/*
 * Copyright (C) 2023 PixieBrix, Inc.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

/**
 * Get UCS-2 length of a string
 * https://mathiasbynens.be/notes/javascript-encoding
 * https://github.com/bestiejs/punycode.js - punycode.ucs2.decode
 */
export function ucs2length(s: string) {
  let result = 0;
  let length = s.length;
  let index = 0;
  let charCode: number;
  while (index < length) {
    result++;
    charCode = s.charCodeAt(index++);
    if (charCode >= 0xd800 && charCode <= 0xdbff && index < length) {
      // high surrogate, and there is a next character
      charCode = s.charCodeAt(index);
      if ((charCode & 0xfc00) == 0xdc00) {
        // low surrogate
        index++;
      }
    }
  }
  return result;
}
