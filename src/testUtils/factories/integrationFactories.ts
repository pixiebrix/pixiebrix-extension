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

import { define } from "cooky-cutter";
import {
  type SanitizedConfig,
  type SanitizedIntegrationConfig,
} from "@/types/integrationTypes";
import { uuidSequence } from "@/testUtils/factories/stringFactories";
import { validateRegistryId } from "@/types/helpers";
import { type RemoteIntegrationConfig } from "@/types/contract";

export const sanitizedIntegrationConfigFactory =
  define<SanitizedIntegrationConfig>({
    id: uuidSequence,
    proxy: false,
    serviceId: (n: number) => validateRegistryId(`test/service-${n}`),
    config: () => ({} as SanitizedConfig),
  } as unknown as SanitizedIntegrationConfig);

export const remoteIntegrationServiceFactory = define<
  RemoteIntegrationConfig["service"]
>({
  config: (n: number) => ({
    metadata: {
      id: validateRegistryId(`@test/integration-${n}`),
      name: `Test Integration ${n}`,
    },
  }),
  name: (n: number) => validateRegistryId(`@test/integration-${n}`),
});

export const remoteIntegrationConfigurationFactory =
  define<RemoteIntegrationConfig>({
    id: uuidSequence,
    organization: null,
    label: (n: number) => `Configuration ${n}`,
    config: () =>
      ({
        _sanitizedConfigBrand: null,
      } as SanitizedConfig),
    service: remoteIntegrationServiceFactory,
  });
