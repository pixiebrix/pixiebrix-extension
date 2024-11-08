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

import {
  tokenAuthDataFactory,
  meApiResponseFactory,
} from "./factories/authFactories";
import { appApiMock } from "./appApiMock";
import { TEST_setAuthData } from "@/auth/authStorage";
import { selectUserDataUpdate } from "@/auth/authUtils";
import useLinkState from "@/auth/useLinkState";
import { valueToAsyncState } from "../utils/asyncStateUtils";
import type { components } from "@/types/swagger";
import { transformMeResponse } from "@/data/model/Me";
import { API_PATHS } from "@/data/service/urlPaths";

// In existing code, there was a lot of places mocking both useQueryState and useGetMeQuery. This could in some places
// yield impossible states due to how `skip` logic in calls like RequireAuth, etc.

const useLinkStateMock = jest.mocked(useLinkState);

export function mockAnonymousMeApiResponse(): void {
  appApiMock.onGet(API_PATHS.ME).reply(200, {
    // Anonymous users still get feature flags
    flags: [],
  });
  useLinkStateMock.mockReturnValue(valueToAsyncState(false));
}

export async function mockAuthenticatedMeApiResponse(
  meApiResponse?: components["schemas"]["Me"],
): Promise<void> {
  const meResponse = meApiResponse ?? meApiResponseFactory();
  appApiMock.onGet(API_PATHS.ME).reply(200, meResponse);
  const authData = selectUserDataUpdate(transformMeResponse(meResponse));
  const tokenData = tokenAuthDataFactory({
    ...authData,
  });

  await TEST_setAuthData(tokenData);
  useLinkStateMock.mockReturnValue(valueToAsyncState(true));
}

export function mockErrorMeApiResponse(error: unknown): void {
  appApiMock.onGet(API_PATHS.ME).reply(500, error);
  // `useLinkStateMock` is partially independent of calls to the Me endpoint. It's possible for the extension to be
  // linked (i.e., have a valid token), but the call fails on the server side.
  useLinkStateMock.mockReturnValue(valueToAsyncState(true));
}

/**
 * Suggested that you call this in afterEach() in your tests:
 *    afterEach(async () => {
 *      await resetMeApiMocks();
 *    });
 */
export async function resetMeApiMocks(): Promise<void> {
  useLinkStateMock.mockReturnValue(valueToAsyncState(true));
  appApiMock.reset();
  await TEST_setAuthData({});
}
