/* eslint-disable unicorn/prefer-reflect-apply,prefer-rest-params -- copied code from maintainer */
/*
 * Copyright (C) 2022 PixieBrix, Inc.
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

// Chrome 105 introduced native support for :has, but has a "bug" that breaks support for JQuery pseudo-selectors
// Implementation adapted from: https://github.com/jquery/jquery/issues/5098#issuecomment-1232952901

const originalQSA = document.querySelectorAll;
// @ts-expect-error -- internal callable object
const originalFind = $.find;

function patchedQSA(selectors: string) {
  if (selectors.includes(":has")) {
    // Force use of JQuery for :has
    throw new DOMException();
  }

  return originalQSA(selectors);
}

// @ts-expect-error -- internal callable object
$.find = Object.assign(function () {
  document.querySelectorAll = patchedQSA;
  Element.prototype.querySelectorAll = patchedQSA;

  let result;

  try {
    // @ts-expect-error -- Typescript can't infer `this`
    result = originalFind.apply(this, arguments);
  } finally {
    document.querySelectorAll = originalQSA;
    Element.prototype.querySelectorAll = originalQSA;
  }

  return result;
}, originalFind);
