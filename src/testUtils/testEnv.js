/*
 * Copyright (C) 2024 PixieBrix, Inc.
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

// eslint-disable-next-line n/prefer-global/text-decoder, n/prefer-global/text-encoder -- Drop after https://github.com/jsdom/jsdom/issues/2524
import { TextEncoder, TextDecoder } from "node:util";

// eslint-disable-next-line import/no-unassigned-import -- It's a polyfill
import "urlpattern-polyfill";

process.env.SHADOW_ROOT = "open";
process.env.SERVICE_URL = "https://app.pixiebrix.com";
process.env.MARKETPLACE_URL = "https://www.pixiebrix.com/marketplace/";

// Drop after https://github.com/jsdom/jsdom/issues/2524
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// TODO: Drop after https://github.com/jsdom/jsdom/issues/2401
global.PromiseRejectionEvent = class PromiseRejectionEvent extends Event {
  constructor(type, init) {
    super(type);
    this.promise = init.promise;
    this.reason = init.reason;
  }
};

if (process.env.JEST_CONSOLE_DEBUG === "false") {
  console.debug = () => {};
}

// Thanks: https://gamliela.com/blog/advanced-testing-with-jest
// TODO: Drop after jest-environment-jsdom@30
// https://github.com/jsdom/jsdom/pull/3556
// https://github.com/jestjs/jest/pull/13825
global.AbortSignal.timeout ??= (milliseconds) => {
  const controller = new AbortController();
  setTimeout(() => {
    controller.abort(new DOMException("TimeoutError"));
  }, milliseconds);
  return controller.signal;
};

// TODO: Drop after jest-environment-jsdom@30
AbortSignal.prototype.throwIfAborted ??= function () {
  if (this.aborted) {
    throw this.reason;
  }
};

// This satisfies the tests, but it will never be implemented by JSDOM
// https://github.com/jsdom/jsdom/issues/135#issuecomment-29812947
Element.prototype.checkVisibility ??= function () {
  return this.isConnected;
};

// Waiting for https://github.com/jsdom/jsdom/issues/2154
HTMLImageElement.prototype.decode = jest.fn();

URL.createObjectURL = jest.fn();
URL.revokeObjectURL = jest.fn();

globalThis.CanvasRenderingContext2D = class {};
globalThis.CanvasRenderingContext2D.prototype.drawImage = jest.fn();
globalThis.CanvasRenderingContext2D.prototype.getImageData = jest
  .fn()
  .mockReturnValue("image data");

globalThis.OffscreenCanvas = class {};
globalThis.OffscreenCanvas.prototype.getContext = jest.fn(
  () => new CanvasRenderingContext2D(),
);

globalThis.createImageBitmap = jest
  .fn()
  .mockReturnValue({ width: 32, height: 32, close() {} });

// See https://stackoverflow.com/questions/68023284/react-testing-library-user-event-throws-error-typeerror-root-elementfrompoint/77219899#77219899
function getBoundingClientRect() {
  const rec = {
    x: 0,
    y: 0,
    bottom: 0,
    height: 0,
    left: 0,
    right: 0,
    top: 0,
    width: 0,
  };
  return { ...rec, toJSON: () => rec };
}

class FakeDOMRectList extends Array {
  item(index) {
    return this[index];
  }
}

document.elementFromPoint = () => null;
HTMLElement.prototype.getBoundingClientRect = getBoundingClientRect;
HTMLElement.prototype.getClientRects = () => new FakeDOMRectList();
Range.prototype.getBoundingClientRect = getBoundingClientRect;
Range.prototype.getClientRects = () => new FakeDOMRectList();
