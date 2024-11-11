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

// @See persistIntegrationsConfig in integrationsSlice.ts
import type { IntegrationConfig } from "@/integrations/integrationTypes";
import {
  readReduxStorage,
  validateReduxStorageKey,
} from "@/utils/storageUtils";
import { migrations } from "@/integrations/store/integrationsMigrations";
import { initialState } from "@/integrations/store/integrationsSlice";
import { selectIntegrationConfigs } from "@/integrations/store/integrationsSelectors";

const INTEGRATIONS_STORAGE_KEY = validateReduxStorageKey(
  "persist:servicesOptions",
);

export async function readRawConfigurations(): Promise<IntegrationConfig[]> {
  const integrations = await readReduxStorage(
    INTEGRATIONS_STORAGE_KEY,
    migrations,
    initialState,
  );
  return selectIntegrationConfigs({ integrations });
}
