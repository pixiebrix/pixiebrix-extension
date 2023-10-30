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

// TODO: Drop after https://github.com/jsdom/jsdom/issues/2524
import { TextEncoder, TextDecoder } from "node:util";

// eslint-disable-next-line import/no-unassigned-import -- It's a polyfill
import "urlpattern-polyfill";

process.env.SERVICE_URL = "https://app.pixiebrix.com";
process.env.MARKETPLACE_URL = "https://www.pixiebrix.com/marketplace/";

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Use MutationObserver to detect when the element has been removed from the document
// This is the only usage in the extension at the moment. YMMV.
global.ResizeObserver = class ResizeObserver extends MutationObserver {
  constructor(callback) {
    super(() => {
      callback([{ target: this.element }]);
    });
  }

  observe(element) {
    if (this.element) {
      throw new Error(
        "This ResizeObserver implementation can only observe one element"
      );
    }

    this.element = element;
    super.observe(element.ownerDocument, { childList: true, subtree: true });
  }
};
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
