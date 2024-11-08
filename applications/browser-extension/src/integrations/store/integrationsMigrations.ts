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

import { type MigrationManifest, type PersistedState } from "redux-persist";
import {
  type IntegrationConfigV1,
  type IntegrationConfigV2,
} from "../integrationTypes";

type IntegrationsStateV1 = {
  configured: Record<string, IntegrationConfigV1>;
};

type IntegrationsStateV2 = {
  configured: Record<string, IntegrationConfigV2>;
};

export const migrations: MigrationManifest = {
  // Redux-persist defaults to version: -1; Initialize to positive-1-indexed
  // state version to match state type names
  0: (state) => state,
  1: (state) => state,
  2: (state: IntegrationsStateV1 & PersistedState) =>
    migrateIntegrationsStateV1(state),
};

function migrateIntegrationsStateV1(
  state: IntegrationsStateV1 & PersistedState,
): IntegrationsStateV2 & PersistedState {
  return {
    ...state,
    configured: Object.fromEntries(
      Object.entries(state.configured).map(([id, config]) => [
        id,
        {
          ...config,
          integrationId: config.serviceId,
        },
      ]),
    ),
  };
}
