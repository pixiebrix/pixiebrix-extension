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

import MockAdapter from "axios-mock-adapter";
import axios from "axios";
import pDefer, { type DeferredPromise } from "p-defer";

export const appApiMock = new MockAdapter(axios);

/**
 * Mock all API endpoints to return empty responses.
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
  matcher?: string | RegExp
): DeferredPromise<unknown> {
  const valuePromise = pDefer<unknown>();

  // eslint-disable-next-line promise/prefer-await-to-then -- transform value
  const responsePromise = valuePromise.promise.then((value) => [200, value]);

  appApiMock.onGet(matcher).reply(async () => responsePromise);

  return valuePromise;
}
