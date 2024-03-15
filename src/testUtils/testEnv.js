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

// TODO: Drop after https://github.com/jsdom/jsdom/issues/2524
import { TextEncoder, TextDecoder } from "node:util";

// eslint-disable-next-line import/no-unassigned-import -- It's a polyfill
import "urlpattern-polyfill";

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

// For some reason, throwIfAborted is not available in Jest environment even though it appears to be in JSDOM
// TODO: Drop after jest-environment-jsdom@30
AbortSignal.prototype.throwIfAborted ??= function () {
  if (this.aborted) {
    // eslint-disable-next-line @typescript-eslint/no-throw-literal -- copy implementation from JSDOM
    throw this.reason;
  }
};

// This satisfies the tests, but it will never be implemented by JSDOM
// https://github.com/jsdom/jsdom/issues/135#issuecomment-29812947
globalThis.Element.prototype.checkVisibility ??= function () {
  return this.isConnected;
};

// Waiting for https://github.com/jsdom/jsdom/issues/2154
globalThis.HTMLImageElement.prototype.decode = jest.fn();

// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- The mocks must be defined in the prototype
globalThis.CanvasRenderingContext2D = class {};
globalThis.CanvasRenderingContext2D.prototype.drawImage = jest.fn();
globalThis.CanvasRenderingContext2D.prototype.getImageData = jest
  .fn()
  .mockReturnValue("image data");

// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- The mocks must be defined in the prototype
globalThis.OffscreenCanvas = class {};
globalThis.OffscreenCanvas.prototype.getContext = jest.fn(
  () => new CanvasRenderingContext2D(),
);

globalThis.URL.createObjectURL = jest.fn();

globalThis.createImageBitmap = jest
  .fn()
  .mockReturnValue({ width: 32, height: 32, close() {} });
