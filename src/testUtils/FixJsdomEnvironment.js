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

import JSDOMEnvironment from "jest-environment-jsdom";

// TODO: Block HTTP requests from tests after Axios migration https://github.com/pixiebrix/pixiebrix-extension/issues/4810
// nock.disableNetConnect();

// https://github.com/facebook/jest/blob/v29.4.3/website/versioned_docs/version-29.4/Configuration.md#testenvironment-string
export default class FixJSDOMEnvironment extends JSDOMEnvironment {
  constructor(...args) {
    super(...args);

    // FIXME https://github.com/jsdom/jsdom/issues/3363
    this.global.structuredClone = structuredClone;

    // Until https://github.com/jsdom/jsdom/issues/1724
    // https://stackoverflow.com/questions/74945569/cannot-access-built-in-node-js-fetch-function-from-jest-tests/78051351#78051351
    this.global.fetch = fetch;
    this.global.Request = Request;
    this.global.Response = Response;
    this.global.ReadableStream = ReadableStream;

    // TODO: Set when dropping support for Chrome <120
    // this.global.URL.canParse = URL.canParse;
  }
}
