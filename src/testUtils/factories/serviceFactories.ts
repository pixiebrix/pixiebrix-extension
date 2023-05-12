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
  type SanitizedServiceConfiguration,
} from "@/types/serviceTypes";
import { uuidSequence } from "@/testUtils/factories/stringFactories";
import { validateRegistryId } from "@/types/helpers";
import {
  type SanitizedAuth,
  type SanitizedAuthService,
} from "@/types/contract";

export const sanitizedServiceConfigurationFactory =
  define<SanitizedServiceConfiguration>({
    id: uuidSequence,
    proxy: false,
    serviceId: (n: number) => validateRegistryId(`test/service-${n}`),
    config: () => ({} as SanitizedConfig),
  } as unknown as SanitizedServiceConfiguration);
export const sanitizedAuthServiceFactory = define<SanitizedAuthService>({
  config: (n: number) => ({
    metadata: {
      id: validateRegistryId(`@test/service-${n}`),
      name: `Test Service ${n}`,
    },
  }),
  name: (n: number) => `Test Service ${n}`,
});
export const sanitizedAuthFactory = define<SanitizedAuth>({
  id: uuidSequence,
  organization: null,
  label: (n: number) => `Auth ${n}`,
  config: {
    _sanitizedConfigBrand: null,
  },
  service: sanitizedAuthServiceFactory,
});
