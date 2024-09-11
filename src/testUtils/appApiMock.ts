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

import MockAdapter from "axios-mock-adapter";
import axios from "axios";
import pDefer, { type DeferredPromise } from "p-defer";
import { isUrlRelative } from "@/utils/urlUtils";
import { escapeRegExp } from "lodash";

/**
 * AxiosMock used for all app data factories. NOTE: must be reset in a beforeEach in each test file.
 * Ideally we would reset in a beforeEach in this file, but unfortunately some tests rely on this mocking behavior
 */
export const appApiMock = new MockAdapter(axios);

/**
 * Mock all API endpoints to return empty responses.
 * Make sure that this is the last rule applied to the appApiMock, as it will match all requests.
 * Any subsequent mocks will be ignored if they are added after this one.
 */
export function mockAllApiEndpoints() {
  // Ideally we could do this automatically, but rules provided to appApiMock are evaluated in order. So we can't
  // fall back to these defaults. :shrug:
  appApiMock.onGet().reply(200, []);
  appApiMock.onPost().reply(201, {});
  appApiMock.onPut().reply(201, {});
  appApiMock.onDelete().reply(201, {});
}

/**
 * Helper method to provide a deferred response to a GET request.
 */
export function onDeferredGet(
  matcher?: string | RegExp,
): DeferredPromise<unknown> {
  const valuePromise = pDefer<unknown>();

  // eslint-disable-next-line promise/prefer-await-to-then -- transform value
  const responsePromise = valuePromise.promise.then((value) => [200, value]);

  appApiMock.onGet(matcher).reply(async () => responsePromise);

  return valuePromise;
}

export function onApiPost(
  absoluteOrRelativeUrl: string,
): MockAdapter.RequestHandler {
  if (!isUrlRelative(absoluteOrRelativeUrl)) {
    return appApiMock.onPost(absoluteOrRelativeUrl);
  }

  const regExpUrlString = escapeRegExp(absoluteOrRelativeUrl);
  // eslint-disable-next-line security/detect-non-literal-regexp -- Escaped using lodash above
  return appApiMock.onPost(new RegExp(regExpUrlString));
}

export function onApiGet(
  absoluteOrRelativeUrl: string,
): MockAdapter.RequestHandler {
  if (!isUrlRelative(absoluteOrRelativeUrl)) {
    return appApiMock.onGet(absoluteOrRelativeUrl);
  }

  const regExpUrlString = escapeRegExp(absoluteOrRelativeUrl);
  // eslint-disable-next-line security/detect-non-literal-regexp -- Escaped using lodash above
  return appApiMock.onGet(new RegExp(regExpUrlString));
}
