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

import BaseRegistry from "@/registry/memoryRegistry";
import { fromJS } from "@/services/factory";
import {
  type IntegrationConfig,
  type IntegrationABC,
} from "@/types/integrationTypes";
import { type RegistryId } from "@/types/registryTypes";
import {
  readReduxStorage,
  validateReduxStorageKey,
} from "@/utils/storageUtils";
import { migrations } from "@/store/integrations/integrationsMigrations";
import { initialState } from "@/store/integrations/integrationsSlice";
import { selectIntegrationConfigs } from "@/store/integrations/integrationsSelectors";

// @See persistIntegrationsConfig in integrationsSlice.ts
const INTEGRATIONS_STORAGE_KEY = validateReduxStorageKey(
  "persist:servicesOptions"
);

const registry = new BaseRegistry<RegistryId, IntegrationABC>(
  ["service"],
  fromJS
);

export async function readRawConfigurations(): Promise<IntegrationConfig[]> {
  const integrations = await readReduxStorage(
    INTEGRATIONS_STORAGE_KEY,
    migrations,
    initialState
  );
  return selectIntegrationConfigs({ integrations });
}

export default registry;
