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

import { SanitizedIntegrationConfig } from "@/integrations/integrationTypes";
import { RemoteResponse } from "@/types/contract";
import { NetworkRequestConfig } from "@/types/networkTypes";
import { RegistryId } from "@/types/registryTypes";
import { Nullishable } from "@/utils/nullishUtils";
import { getMethod, backgroundTarget as bg } from "webext-messenger";

export * from "../../../../background/messenger/api";

export const registry = {
  syncRemote: jest.fn(),
  getByKinds: jest.fn().mockResolvedValue([]),
  find: jest.fn().mockImplementation(async (id: RegistryId) => {
    throw new Error(
      `Find not implemented in registry mock (looking up "${id}"). See __mocks__/background/messenger/api for more information.`,
    );
  }),
  clear: getMethod("REGISTRY_CLEAR", bg),
};

export const services = {
  locateAllForId: jest.fn().mockResolvedValue([]),
  locate: jest
    .fn()
    .mockRejectedValue(new Error("Locate not implemented in mock")),
  refresh: jest.fn(),
  refreshLocal: getMethod("LOCATOR_REFRESH_LOCAL", bg),
};

// `getMethod` currently strips generics, so we must copy the function signature here
export const performConfiguredRequestInBackground = getMethod(
  "CONFIGURED_REQUEST",
  bg,
) as <TData>(
  integrationConfig: Nullishable<SanitizedIntegrationConfig>,
  requestConfig: NetworkRequestConfig,
) => Promise<RemoteResponse<TData>>;

export const clearServiceCache = jest.fn();

export const removeOAuth2Token = jest.fn();
