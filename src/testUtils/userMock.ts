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
} from "@/testUtils/factories/authFactories";
import { appApiMock } from "@/testUtils/appApiMock";
import { TEST_setAuthData } from "@/auth/authStorage";
import type { components } from "@/types/swagger";
import { getLinkedApiClient } from "@/data/service/apiClient";
import { selectUserDataUpdate } from "@/auth/authUtils";
import { transformMeResponse } from "@/data/model/Me";
import axios from "axios";
import requireActual = jest.requireActual;

// In existing code, there was a lot of places mocking both useQueryState and useGetMeQuery. This could in some places
// yield impossible states due to how `skip` logic in calls like RequireAuth, etc.

function connectApiClient(): void {
  // We need to restore the real implementations here to test linked/unlinked extension behavior
  //  See: src/__mocks__/@/data/service/apiClient.js
  const getLinkedApiClientMock = jest.mocked(getLinkedApiClient);
  const { getLinkedApiClient: getLinkedApiClientActual } = requireActual(
    "@/data/service/apiClient",
  );
  getLinkedApiClientMock.mockImplementation(getLinkedApiClientActual);
}

export async function mockAnonymousUser(): Promise<void> {
  // connectApiClient();
  appApiMock.onGet("/api/me/").reply(200, {
    // Anonymous users still get feature flags
    flags: [],
  });
  // eslint-disable-next-line new-cap
  await TEST_setAuthData({});
}

export async function mockAuthenticatedUserApiResponse(
  me?: components["schemas"]["Me"],
): Promise<void> {
  // connectApiClient();
  const user = me ?? meApiResponseFactory();
  appApiMock.onGet("/api/me/").reply(200, user);
  const authData = selectUserDataUpdate(transformMeResponse(user));
  const tokenData = tokenAuthDataFactory({
    ...authData,
  });
  // eslint-disable-next-line new-cap
  await TEST_setAuthData(tokenData);
}

export function mockErrorUser(error: unknown): void {
  // connectApiClient();
  appApiMock.onGet("/api/me/").reply(500, error);
}

export async function cleanUpUserMocks(): Promise<void> {
  appApiMock.resetHandlers();
  const getLinkedApiClientMock = jest.mocked(getLinkedApiClient);
  getLinkedApiClientMock.mockImplementation(async () => axios);
  // eslint-disable-next-line new-cap
  await TEST_setAuthData({});
}
