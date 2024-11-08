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

import { define } from "cooky-cutter";
import type { ModInstance } from "../../types/modInstanceTypes";
import {
  autoUUIDSequence,
  timestampFactory,
} from "./stringFactories";
import { modDefinitionFactory } from "./modDefinitionFactories";
import { nowTimestamp } from "../../utils/timeUtils";
import { organizationStateFactory } from "./authFactories";
import { generateModInstanceId } from "../../store/modComponents/modInstanceUtils";

export const personalDeploymentMetadataFactory = define<
  ModInstance["deploymentMetadata"]
>({
  id: autoUUIDSequence(),
  timestamp: nowTimestamp(),
  active: true,
  isPersonalDeployment: true,
  organization: undefined,
});

export const teamDeploymentMetadataFactory = define<
  ModInstance["deploymentMetadata"]
>({
  id: autoUUIDSequence(),
  timestamp: nowTimestamp(),
  active: true,
  organization: organizationStateFactory(),
});

export const modInstanceFactory = define<ModInstance>({
  id: generateModInstanceId,
  modComponentIds: () => [autoUUIDSequence()],
  definition: modDefinitionFactory,
  deploymentMetadata: undefined,
  integrationsArgs: () => [],
  optionsArgs: () => ({}),
  updatedAt: timestampFactory(),
});
